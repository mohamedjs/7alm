import { DesignIdeasRepository, designIdeasRepository } from "@/features/ai-studio/design-ideas.repository";
import { AiStudioService } from "@/features/ai-studio/ai-studio.service";
import { productRepository, ProductRepository } from "@/features/products/products.repository";
import {
  canApplyAction,
  describeInvalidAction,
  DESIGN_IDEA_ACTION_TRANSITIONS,
  type DesignIdeaAction,
} from "@/lib/designIdeaStateMachine";
import type { DesignIdea, DesignIdeaStatus } from "@/features/shared/types";

export interface ApplyActionResult {
  success: boolean;
  status?: DesignIdeaStatus;
  error?: string;
}

export interface CreateIdeaInput {
  title: string;
  description: string;
  concept: string;
  sourceTrendIds?: string[];
}

export interface CreateIdeaResult {
  idea: DesignIdea;
  isDuplicate: boolean;
}

/**
 * Domain orchestration for the Telegram design-idea approval loop
 * (specs/013-ai-studio/automation-plan.md §1, §7 Step 1).
 *
 * Owns:
 *  - Running `designIdeaStateMachine` and rejecting illegal transitions —
 *    the single place this is enforced (n8n never writes `design_ideas`
 *    directly).
 *  - Writing the `telegram_approval_logs` audit row for every action, in
 *    the same call as the status change so the audit trail never drifts.
 *  - On a successful `publish`, creating the `products` row via
 *    `ProductRepository` (never a parallel insert path) and linking it
 *    back onto the design idea.
 *
 * `edit` and `regenerate` are explicitly OUT OF SCOPE for this slice — see
 * `designIdeaStateMachine.ts` and automation-plan.md §6.
 */
export class DesignIdeasService {
  constructor(
    private readonly repo: DesignIdeasRepository = designIdeasRepository,
    private readonly products: ProductRepository = productRepository
  ) {}

  async listByStatus(status?: DesignIdeaStatus): Promise<DesignIdea[]> {
    return this.repo.listByStatus(status);
  }

  async getById(id: string): Promise<DesignIdea | null> {
    return this.repo.getById(id);
  }

  /**
   * Create a design idea proposed by the LLM Design Director (FR-002/FR-003).
   * The server — never the LLM — computes `concept_fingerprint`, reusing
   * `AiStudioService.fingerprint`'s hashing scheme (sha256 over a
   * stable-stringified payload) rather than inventing a second one.
   *
   * If an idea with the same fingerprint already exists, the duplicate is
   * NOT inserted (the column is `UNIQUE`) — the existing idea is returned
   * with `isDuplicate: true` so the caller can skip it (FR-003: "prevent ...
   * duplicate design ideas before they reach human review").
   */
  async createIdea(input: CreateIdeaInput): Promise<CreateIdeaResult> {
    const fingerprint = DesignIdeasService.fingerprint(input.concept);

    const existing = await this.repo.getByConceptFingerprint(fingerprint);
    if (existing) {
      return { idea: existing, isDuplicate: true };
    }

    try {
      const idea = await this.repo.create({
        title: input.title,
        description: input.description,
        concept_fingerprint: fingerprint,
        source_trend_ids: input.sourceTrendIds ?? [],
      });
      return { idea, isDuplicate: false };
    } catch (err) {
      // 23505 = unique_violation: another request inserted the same
      // fingerprint between our pre-check and this insert. Treat it the
      // same as a pre-check hit rather than a 500.
      if ((err as { code?: string })?.code === "23505") {
        const winner = await this.repo.getByConceptFingerprint(fingerprint);
        if (winner) return { idea: winner, isDuplicate: true };
      }
      throw err;
    }
  }

  /**
   * Normalized-concept dedup key, same hashing scheme as
   * `AiStudioService.fingerprint`. Hashes `concept` only (not `title`) so a
   * reworded title for the same underlying concept still collides.
   */
  private static fingerprint(concept: string): string {
    const normalized = concept.trim().toLowerCase().replace(/\s+/g, " ");
    return AiStudioService.fingerprint("design_idea", { concept: normalized });
  }

  /**
   * Apply an approval-loop action (`approve` | `reject` | `favorite` |
   * `publish`) to a design idea, called by the n8n "Idea Action → 7alm"
   * node when the admin presses a Telegram inline-keyboard button.
   *
   * Never throws for a business-rule rejection (invalid transition, idea
   * not found) — returns `{success:false, error}` instead so the caller
   * (an n8n `httpRequest` node with `neverError:true`) can branch on the
   * JSON body, exactly like `POST /api/webhooks/n8n/order-action`.
   */
  async applyAction(
    ideaId: string,
    action: DesignIdeaAction,
    telegramUserId: string | null
  ): Promise<ApplyActionResult> {
    const idea = await this.repo.getById(ideaId);
    if (!idea) {
      return { success: false, error: `Design idea '${ideaId}' not found` };
    }

    if (!canApplyAction(idea.status, action)) {
      const error = describeInvalidAction(idea.status, action);
      return { success: false, error };
    }

    if (action === "favorite") {
      const updated = await this.repo.setFavorite(idea.id, !idea.is_favorite);
      await this.repo.logApprovalAction({
        design_idea_id: idea.id,
        action: "favorite",
        telegram_user_id: telegramUserId,
        previous_status: idea.status,
        new_status: updated.status,
        note: updated.is_favorite ? "marked favorite" : "unmarked favorite",
      });
      return { success: true, status: updated.status };
    }

    const { to: nextStatus } = DESIGN_IDEA_ACTION_TRANSITIONS[action];

    let updated: DesignIdea;
    if (action === "publish") {
      const product = await this.products.createDraftFromDesignIdea({
        name: idea.title,
        slug: DesignIdeasService.slugify(idea.title, idea.id),
        description: idea.description,
      });
      updated = await this.repo.updateStatus(idea.id, nextStatus, { product_id: product.id });
    } else {
      updated = await this.repo.updateStatus(idea.id, nextStatus);
    }

    await this.repo.logApprovalAction({
      design_idea_id: idea.id,
      action,
      telegram_user_id: telegramUserId,
      previous_status: idea.status,
      new_status: updated.status,
    });

    return { success: true, status: updated.status };
  }

  /** Slug for the draft product created on publish: title + short id suffix to avoid collisions. */
  private static slugify(title: string, ideaId: string): string {
    const base = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9؀-ۿ]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const suffix = ideaId.replace(/-/g, "").slice(-8);
    return `${base || "design-idea"}-${suffix}`;
  }
}

export const designIdeasService = new DesignIdeasService();

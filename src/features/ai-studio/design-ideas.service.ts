import { DesignIdeasRepository, designIdeasRepository } from "@/features/ai-studio/design-ideas.repository";
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

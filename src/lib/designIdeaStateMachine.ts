import type { DesignIdeaStatus, TelegramApprovalAction } from "@/features/shared/types";
import type { DictKey } from "@/features/i18n/dictionary";

export interface DesignIdeaState {
  status: DesignIdeaStatus;
  labelKey: DictKey;
  colorClass: string;
  availableActions: { labelKey: DictKey; action: DesignIdeaAction; nextStatus: DesignIdeaStatus; style: string }[];
}

/**
 * Actions this slice supports. `edit` and `regenerate` are explicitly OUT OF
 * SCOPE per specs/013-ai-studio/automation-plan.md §6 (they require a
 * stateful free-text follow-up correlation over Telegram `message` updates,
 * which is the fiddliest part of the bot loop) — follow-up increment.
 */
export type DesignIdeaAction = "approve" | "reject" | "favorite" | "publish";

/**
 * Design Idea State Machine — mirrors `orderStateMachine.ts`'s shape.
 * Status badges/action buttons in the AI Studio dashboard read from this.
 *
 * NOTE: `possible_duplicate` is NOT reachable via a user action in this
 * slice — it is set by the dedup check in `ai-studio.service.ts`-style
 * fingerprint logic elsewhere, never via `applyAction`.
 */
export const DesignIdeaStateMachine: Record<DesignIdeaStatus, DesignIdeaState> = {
  pending_review: {
    status: "pending_review",
    labelKey: "aiStudio.status.pendingReview",
    colorClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    availableActions: [
      { labelKey: "aiStudio.action.approve", action: "approve", nextStatus: "approved", style: "bg-green-500/10 text-green-400 hover:bg-green-500/20 neu-raised-sm" },
      { labelKey: "aiStudio.action.reject", action: "reject", nextStatus: "rejected", style: "bg-red-500/10 text-red-400 hover:bg-red-500/20 neu-raised-sm" },
    ],
  },
  approved: {
    status: "approved",
    labelKey: "aiStudio.status.approved",
    colorClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    availableActions: [
      { labelKey: "aiStudio.action.publish", action: "publish", nextStatus: "published", style: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 neu-raised-sm" },
    ],
  },
  rejected: {
    status: "rejected",
    labelKey: "aiStudio.status.rejected",
    colorClass: "bg-red-500/10 text-red-400 border-red-500/20",
    availableActions: [],
  },
  possible_duplicate: {
    status: "possible_duplicate",
    labelKey: "aiStudio.status.possibleDuplicate",
    colorClass: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    availableActions: [],
  },
  published: {
    status: "published",
    labelKey: "aiStudio.status.published",
    colorClass: "bg-green-500/10 text-green-400 border-green-500/20",
    availableActions: [],
  },
};

/**
 * Canonical server-side transition map — the single source of truth for
 * which status jumps are legal. Enforced by `design-ideas.service.ts
 * applyAction` (rejects disallowed transitions).
 *
 * `favorite` is intentionally NOT a status transition — it toggles
 * `is_favorite` in place and is validated separately (see `canApplyAction`).
 */
export const DESIGN_IDEA_TRANSITIONS: Record<DesignIdeaStatus, DesignIdeaStatus[]> = {
  pending_review: ["approved", "rejected"],
  approved: ["published"],
  rejected: [],
  possible_duplicate: [],
  published: [],
};

/** Whether `from -> to` is a legal transition per `DESIGN_IDEA_TRANSITIONS`. */
export function canTransition(from: DesignIdeaStatus, to: DesignIdeaStatus): boolean {
  return DESIGN_IDEA_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Maps a status-changing action to its required starting status + target status. */
export const DESIGN_IDEA_ACTION_TRANSITIONS: Record<
  Exclude<DesignIdeaAction, "favorite">,
  { from: DesignIdeaStatus; to: DesignIdeaStatus }
> = {
  approve: { from: "pending_review", to: "approved" },
  reject: { from: "pending_review", to: "rejected" },
  publish: { from: "approved", to: "published" },
};

/**
 * Whether `action` is legal to apply to an idea currently in `currentStatus`.
 * `favorite` has no status precondition — it can be toggled from any status.
 */
export function canApplyAction(currentStatus: DesignIdeaStatus, action: DesignIdeaAction): boolean {
  if (action === "favorite") return true;
  const rule = DESIGN_IDEA_ACTION_TRANSITIONS[action];
  return rule.from === currentStatus && canTransition(rule.from, rule.to);
}

/** Human-readable rejection reason for an illegal action, used in API error responses. */
export function describeInvalidAction(currentStatus: DesignIdeaStatus, action: DesignIdeaAction): string {
  if (action === "favorite") return "";
  const rule = DESIGN_IDEA_ACTION_TRANSITIONS[action];
  return `Cannot '${action}' a design idea in status '${currentStatus}' (requires '${rule.from}').`;
}

/** Re-exported for convenience where only the action-to-log-row type is needed. */
export type { TelegramApprovalAction };

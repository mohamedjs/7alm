import { DomainError } from "../../../shared/domain/domain-error";

export interface CategoryNode {
  id: string;
  parent_id: string | null;
}

/** A category may not be its own parent nor sit under one of its descendants. */
export function assertNoCycle(categoryId: string | undefined, newParentId: string | null | undefined, all: CategoryNode[]): void {
  if (!categoryId || !newParentId) return;
  if (newParentId === categoryId) throw DomainError.validation("A category cannot be its own parent.");
  const parentOf = new Map(all.map((c) => [c.id, c.parent_id]));
  let cursor: string | null | undefined = newParentId;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    if (cursor === categoryId) throw DomainError.validation("Cannot set parent to a descendant, it creates a cycle.");
    seen.add(cursor);
    cursor = parentOf.get(cursor) ?? null;
  }
}

/** The category plus its direct children — what "products in category X" covers. */
export function categoryWithChildren(categoryId: string, all: CategoryNode[]): string[] {
  return [categoryId, ...all.filter((c) => c.parent_id === categoryId).map((c) => c.id)];
}

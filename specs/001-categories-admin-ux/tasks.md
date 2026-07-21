# Tasks: Categories Admin UX Fix

**Input**: Design documents from `specs/001-categories-admin-ux/`
**Prerequisites**: plan.md, spec.md
**Tests**: Not requested — no test tasks; verification is `npx tsc --noEmit` + manual click-through.

## Phase 3: User Story 1 - Single Categories entry point (Priority: P1)

**Goal**: Sidebar shows exactly one "Categories" nav entry.
**Independent Test**: Load any `/admin/*` page, inspect the sidebar.

- [x] T001 [US1] In `src/components/admin/dashboard/AdminLayoutClient.tsx`, remove the duplicate "Category Tree" block: delete the `isCategoriesExpanded` state, the `renderCategoryNode` function, the `useCategoriesManager`/`tree` import+usage, and the collapsible `<div className="mt-2">...Category Tree...</div>` JSX. Keep only the existing static `navLinks` entry `{ name: "Categories / الأقسام", path: "/admin/categories" }`.

**Checkpoint**: Sidebar has one Categories entry; `/admin/categories` still renders the full tree via `CategoryList` (untouched by this task).

---

## Phase 4: User Story 2 - Create category as a dedicated page (Priority: P1)

**Goal**: "Add Category" navigates to `/admin/categories/create`, a real page.
**Independent Test**: Click "Add Category" → URL changes to `/admin/categories/create` → submit → redirected to `/admin/categories` with the new category visible.

- [x] T002 [P] [US2] Create `src/app/(admin)/admin/categories/create/page.tsx`: client component that calls `useCategoriesManager()` for `formData`, `setFormData`, `categories`, `saveCategory`, `createState`; renders the category form fields (reuse `CategoryForm`'s field markup); on submit calls `saveCategory(formData)` then `router.push("/admin/categories")` on success. Mirror the structure of `src/app/(admin)/admin/products/create/page.tsx`.
- [x] T003 [US2] Modify `src/components/admin/categories/CategoryForm.tsx` so its field body can be rendered without the modal overlay/close-button chrome — either export the inner form as reusable JSX/sub-component, or add an `embedded?: boolean` prop that skips the fixed-overlay wrapper when true. Depends on: T002 (defines what the create page needs from this component).
- [x] T004 [US2] Modify `src/app/(admin)/admin/categories/page.tsx`: change the "Add Category" button from `onClick={() => openModal()}` to a `Link`/`router.push` to `/admin/categories/create`; remove the `isModalOpen && <CategoryForm .../>` block used for the create flow. Depends on: T002, T003.

**Checkpoint**: Category creation works end-to-end via a real URL, no modal.

---

## Phase 5: User Story 3 - Edit category as a dedicated page (Priority: P2)

**Goal**: Editing a category navigates to `/admin/categories/edit/[id]`.
**Independent Test**: Click "Edit" on a category row → URL changes to `/admin/categories/edit/[id]`, form pre-filled → save → redirected back with the change reflected.

- [x] T005 [P] [US3] Create `src/app/(admin)/admin/categories/edit/[id]/page.tsx`: client component that reads `id` from route params, finds the matching category from `useCategoriesManager()`'s `categories` list, pre-fills the form fields, calls `saveCategory` (update path) on submit, redirects to `/admin/categories` on success. If no category matches `id`, render a "Category not found" state with a link back to `/admin/categories`. Mirror `src/app/(admin)/admin/products/edit/[id]/page.tsx`.
- [x] T006 [US3] Modify `src/components/admin/categories/CategoryList.tsx`: change the edit action from calling `onEdit(category)` (which opened the modal) to a `Link` to `/admin/categories/edit/${category.id}`. Depends on: T005.
- [x] T007 [US3] Modify `src/app/(admin)/admin/categories/page.tsx`: remove remaining modal-only wiring (`editingCategory`, the edit-triggered `isModalOpen` branch, the `onEdit={openModal}` prop passed to `CategoryList`); `CategoryList` now only needs `onDelete`. Depends on: T004, T006.

**Checkpoint**: Category editing works end-to-end via a real URL; `CategoriesPage` no longer renders any modal.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T008 [P] Modify `src/features/categories/categories.hooks.ts`: remove modal-only state/handlers (`isModalOpen`, `openModal`, `closeModal`) that are no longer used by any page; keep `tree`, `categories`, `formData`, `setFormData`, `saveCategory`, `removeCategory`, `createState`, `updateState`, and whatever `editingCategory`/reset logic the new create/edit pages still need for prefill.
- [x] T009 Run `npx tsc --noEmit` from the repo root and fix any resulting type errors across all files touched above.
- [ ] T010 Manual click-through: confirm the sidebar shows Categories once; create a category via `/admin/categories/create`; edit it via `/admin/categories/edit/[id]`; delete it inline from the list — all four must work with no console errors.

---

## Dependencies & Execution Order

- Phase 3 (US1) has no dependencies — can start immediately, independent of Phase 4/5.
- Phase 4 (US2): T002 → T003 → T004, sequential (same-ish surface area).
- Phase 5 (US3): T005 → T006 → T007 (T007 also depends on T004 since both edit `page.tsx`).
- Phase 6 depends on Phases 3–5 being complete.
- US1, US2, US3 are otherwise independent of each other and could be split across parallel workers if desired, but T004/T007 both edit `page.tsx` so must not run concurrently against each other.

## Implementation Strategy

MVP = Phase 3 alone (fixes the reported bug with a single, tiny change).
Then Phase 4 (create page), then Phase 5 (edit page), then Phase 6 polish.

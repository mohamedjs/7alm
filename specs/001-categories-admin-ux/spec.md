# Feature Specification: Categories Admin UX Fix

**Feature Branch**: `001-categories-admin-ux`
**Created**: 2026-07-21
**Status**: Draft
**Input**: User description: "check dashboard again and fix — I see more than one tab for categories tab; also make create category a separate page instead of a popup"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single Categories entry point in sidebar (Priority: P1)

As an admin, when I look at the sidebar I see exactly one way to get to
Categories, not two competing entries that both claim to be "categories".

**Why this priority**: This is the literal bug reported — confusing/duplicate
navigation erodes trust in the whole admin UI and is the fastest fix.

**Independent Test**: Load any `/admin/*` page, open the sidebar — count
category-related nav affordances. Must be exactly 1 static "Categories" link.
The redundant expandable "Category Tree" list (which duplicates every
category as its own link, all pointing at `/admin/categories`) is removed.

**Acceptance Scenarios**:

1. **Given** the admin is logged in, **When** they view the sidebar, **Then**
   there is exactly one "Categories" nav entry and no second expandable
   "Category Tree" section.
2. **Given** the admin clicks "Categories", **When** the page loads, **Then**
   they land on `/admin/categories` showing the full category tree (existing
   `CategoryList` view is unaffected).

---

### User Story 2 - Create category as a dedicated page (Priority: P1)

As an admin, when I click "Add Category" I am taken to a dedicated page (URL
I can bookmark/link), not a popup modal that blocks the rest of the screen.

**Why this priority**: Explicitly requested; also matches the existing
`admin/products/create` pattern already used elsewhere in the app, so it's
the app's own established convention, not a new one.

**Independent Test**: From `/admin/categories`, click "Add Category" →
browser navigates to `/admin/categories/create` (real URL, not a modal
overlay). Fill the form, submit → category is created and admin is returned
to `/admin/categories` with the new category visible.

**Acceptance Scenarios**:

1. **Given** the admin is on `/admin/categories`, **When** they click "Add
   Category", **Then** the browser navigates to `/admin/categories/create`.
2. **Given** the admin is on `/admin/categories/create`, **When** they submit
   a valid name (+ optional parent), **Then** the category is created and
   the admin is redirected to `/admin/categories`.
3. **Given** the admin is on `/admin/categories/create`, **When** they submit
   with an empty required field, **Then** inline validation blocks submit
   (same validation as today's modal).

---

### User Story 3 - Edit category as a dedicated page (Priority: P2)

As an admin, clicking "Edit" on a category takes me to a dedicated page
(`/admin/categories/edit/[id]`), mirroring `admin/products/edit/[id]`.

**Why this priority**: Same modal-removal goal as US2, but edit is used less
often than create, so it ships second.

**Independent Test**: From `/admin/categories`, click "Edit" on any category
row → browser navigates to `/admin/categories/edit/[id]` pre-filled with
that category's data. Save → redirected back to `/admin/categories` with the
change reflected.

**Acceptance Scenarios**:

1. **Given** a category row, **When** the admin clicks "Edit", **Then** the
   browser navigates to `/admin/categories/edit/[id]` with the form
   pre-populated.
2. **Given** an invalid/nonexistent `id` in the URL, **When** the page
   loads, **Then** a clear "category not found" state is shown with a link
   back to `/admin/categories` (no crash).

---

### Edge Cases

- Creating the very first category (no existing top-level categories) → the
  parent selector shows an empty/disabled "no parent" state, not an error.
- A category cannot be set as its own parent (existing `CategoryForm`
  filtering logic must be preserved in the new page).
- Deleting a category remains an inline confirm+delete action on the list —
  it is NOT converted to a page (it's a single destructive step, not a form).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sidebar MUST show exactly one "Categories" nav entry linking to
  `/admin/categories`; the duplicate expandable "Category Tree" list MUST be
  removed.
- **FR-002**: `/admin/categories` MUST keep showing the full category tree
  via the existing `CategoryList` component (browsing is unaffected).
- **FR-003**: The "Add Category" action MUST navigate to
  `/admin/categories/create` instead of opening `CategoryForm` in a modal.
- **FR-004**: `/admin/categories/create` MUST render `CategoryForm`'s fields
  (name, parent, etc.) as a full page, following the `admin/products/create`
  page pattern.
- **FR-005**: Each category row's edit action MUST navigate to
  `/admin/categories/edit/[id]` instead of opening the modal.
- **FR-006**: `/admin/categories/edit/[id]` MUST load the category by id and
  reuse `CategoryForm`'s fields to update it, following the
  `admin/products/edit/[id]` page pattern.
- **FR-007**: Delete MUST remain an inline action on `CategoryList`,
  unchanged.
- **FR-008**: On successful create/edit, the admin MUST be redirected to
  `/admin/categories` with RTK Query cache invalidated so the change is
  visible immediately.
- **FR-009**: `useCategoriesManager` MUST drop modal-only state
  (`isModalOpen`, `editingCategory` as a modal target) in favor of
  routing-driven state; `saveCategory`/`removeCategory` mutation logic is
  reused as-is (Repository → Service → API route → RTK Query layers are
  unchanged — this is a container-only change).

### Key Entities

- **Category**: existing entity (`id`, `name_ar`, `name_en`, `parent_id`,
  ...); no schema change in this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sidebar category navigation appears exactly once (visual +
  component check), eliminating the reported duplicate-tab confusion.
- **SC-002**: Admin can create a category via a real, bookmarkable URL with
  zero modals in the flow.
- **SC-003**: Admin can edit a category via a real, bookmarkable URL with
  zero modals in the flow.
- **SC-004**: No regression: list, create, edit, delete all still work after
  the change; `npx tsc --noEmit` passes.

## Assumptions

- `CategoryForm.tsx`'s fields/validation are reused as-is inside the new
  pages — only the container (modal vs. page) changes, not the form logic.
- No database/schema changes are required.
- This feature must land before 003-admin-arabic-rtl, which will translate
  and mirror these new pages.

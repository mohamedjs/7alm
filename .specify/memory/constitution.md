<!--
Sync Impact Report
Version change: [TEMPLATE] -> 1.0.0 (initial ratification)
Modified principles: n/a (first fill from template placeholders)
Added sections: Core Principles (6), Technology & Layering, Development Workflow, Governance
Removed sections: none (placeholders only)
Templates requiring updates:
  updated .specify/templates/plan-template.md (Constitution Check gate references these principles generically, no change needed)
  updated .specify/templates/spec-template.md (no principle-specific mandatory sections added)
  updated .specify/templates/tasks-template.md (no new task categories required)
Follow-up TODOs: none
-->

# 7alm Constitution

## Core Principles

### I. Layered Architecture (NON-NEGOTIABLE)
Every domain flows Repository -> Service -> API route -> RTK Query -> Hooks -> Components:
`*.repository.ts` (Supabase queries only, server) -> `*.service.ts` (business
orchestration, server) -> `src/app/api/**/route.ts` -> `*.api.ts` (RTK Query,
client) -> `*.hooks.ts` (client UI logic) -> components (render only). Client
components MUST NOT import `supabase.ts`, any `*.repository.ts`, or any
`*.service.ts` — these run server-side only and will crash the client bundle
or leak service-role credentials. Business logic MUST live in hooks or
services, never in components or pages.

### II. TypeScript Strict, Always Green
`npx tsc --noEmit` MUST pass before any change is considered done. `npm run
build` MUST succeed before a change is considered deployment-ready. No `any`
escape hatches to silence errors — fix the underlying type.

### III. RTL/i18n Correctness
Any surface that can render `dir="rtl"` — which now includes the admin
dashboard, since it supports a runtime EN/AR + LTR/RTL toggle — MUST use
logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`,
`text-start`, `text-end`) instead of physical/hardcoded direction utilities
(`ml-*`, `mr-*`, `pl-*`, `pr-*`, `border-l-*`, `border-r-*`, `text-left`,
`text-right`, `left-*`, `right-*`), with zero exceptions in admin components
going forward. Icons that imply direction (chevrons, arrows) MUST be
mirrored or swapped for RTL. First-party UI copy that ships in the admin
MUST be added to the shared translation dictionary (`en`/`ar`) rather than
hardcoded in one language. Rationale: physical-direction utilities silently
break mirroring and are the single most common source of RTL regressions;
since direction is now a runtime toggle rather than a fixed per-surface
choice, "works in the language I tested" is not sufficient — both states
must work.

### IV. No Business Logic in Components
Pages and components are declarative rendering only. Data fetching,
validation, derived state, and formatting rules live in `*.hooks.ts`
(client) or `*.service.ts` (server). A component should be understandable by
reading its JSX without tracing conditional business rules.

### V. Reuse Existing Primitives Over New Dependencies
UI work reuses what already exists — chart primitives under
`src/components/admin/charts/*` (StatTile, OrdersTrendChart,
HorizontalBarChart, chartTheme) for any new analytics widget, and the
existing form/list/modal component patterns for CRUD screens — instead of
introducing a new charting or UI library. New patterns are justified only
when the existing primitive genuinely cannot express the requirement.

### VI. Preserve State Machine & Factory Contracts
`src/lib/orderStateMachine.ts` (order status transitions) and
`src/features/shipping/shipping.factory.ts` (shipping provider selection)
are the single source of truth for their respective concerns. Features MUST
read transitions/providers through these, never re-implement status logic
inline or hardcode a shipping provider branch outside the factory.

## Technology & Layering

- Stack: Next.js 16 (App Router, Turbopack), TypeScript strict, Tailwind
  CSS, Supabase (Postgres + Auth + Realtime), Redux Toolkit + RTK Query.
- Public landing funnel (`(landing)` route group): RTL, Arabic
  (`dir="rtl"`, `lang="ar"`).
- Admin dashboard (`(admin)/admin/*`): protected by JWT + `admins` table
  membership check (`verifyAdmin`); direction/language are a per-feature
  decision layered on top of this constitution, not hardcoded assumptions.
- Shared types live in `src/features/shared/types.ts`.

## Development Workflow

- New features follow: types -> repository -> service -> API route -> RTK Query
  -> hooks -> components -> page, per `AGENTS.md`'s "Adding a New Feature"
  template.
- Every change is verified with `npx tsc --noEmit` prior to being reported
  complete; UI-affecting changes are verified by running the feature in a
  browser (or explicitly flagged as untested if that isn't possible).
- CRUD surfaces default to dedicated create/edit pages (matching the
  existing `admin/products/create` and `admin/products/edit/[id]` pattern)
  rather than modal dialogs, unless a specific feature spec says otherwise.

## Governance

This constitution supersedes ad hoc conventions for any work planned via
Spec Kit in this repository. `AGENTS.md` and `CLAUDE.md` remain the
authoritative day-to-day reference for file structure and command
cheat-sheets; this document governs non-negotiable principles that plans
and tasks are checked against.

Amendments: propose the change, state old -> new principle text and the
semantic-version bump (MAJOR: incompatible principle removal/redefinition,
MINOR: new principle or materially expanded guidance, PATCH: wording/typo
clarification), then update this file and any dependent templates in the
same change. Every `/speckit-plan` MUST include a Constitution Check against
the principles above; unjustified violations block the plan.

**Version**: 1.1.0 | **Ratified**: 2026-07-21 | **Last Amended**: 2026-07-21

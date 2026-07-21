# 7alm — AI Change Log

> **Purpose:** A shared, per-project memory of what AI (Claude) changed, session by session.
> Auto-surfaced into every new session by `.claude/hooks/session-context.sh`.
> **Newest entries on top.** Append new entries with the `/save-session` skill.
>
> Entry format is fixed — keep it so the SessionStart hook can parse it (each entry starts with `## `).

## 2026-07-21 — Spec-kit-planned admin overhaul: categories UX, analytics, design system, RTL toggle
**By:** Claude (Opus 4.8), planning + delegating to Sonnet 5 subagents
**Summary:** Initialized GitHub Spec Kit in-repo (`.specify/`, constitution v1.1.0, `specs/001`–`006`) and used it to plan and implement a categories admin fix, new dashboard analytics widgets, and a 3-phase admin visual overhaul (dark/light theming → bento redesign → EN/AR+RTL toggle). All of it landed in one commit (`c7f0729`); the user then continued independently through several more design iterations on top of it (see below) — those later commits are the user's own work, not this session's.
**Changes:**
- `specs/001-categories-admin-ux`: fixed the sidebar's duplicate "Category Tree" nav (the reported "more than one tab" bug) and converted category create/edit from a modal to dedicated pages (`/admin/categories/create`, `/admin/categories/edit/[id]`), mirroring the products pattern.
- `specs/002-dashboard-analytics`: added Top Products, Revenue by Category, Average Order Value, a custom date-range picker, and CSV export to the admin overview — all computed client-side by joining existing `orders`/`products`/`categories` RTK Query data, no schema change.
- Category image upload: added the same upload-button + preview treatment `ProductForm` has for `main_image`, wired to `CategoryForm`'s existing `image` field (no schema change).
- `specs/004-admin-design-system`: Tailwind v4 dark/light theme tokens (`bg-surface`, `text-text-primary`, etc.) + a persisted theme toggle, class-based (`.dark`), scoped to admin only.
- `specs/005-admin-bento-grid-redesign`: rebuilt the overview page as a bento grid, using a "Coinix" dashboard screenshot the user shared as visual reference, adapted to 7alm's own brand colors at the time.
- `specs/006-admin-i18n-rtl-toggle`: mid-flight, the user corrected the shell from a vertical sidebar to a horizontal top bar (same reference image, re-read correctly) — the spec's `plan.md` has an "Amendment" section documenting this. A subagent run on this failed on a Claude session-limit (not a code bug); the user then finished this feature themselves.
- After `c7f0729`, the user iterated through several more design directions on their own (not this AI session): neumorphic "Ocean Breeze"/"Vivid Nightfall" palettes, a contrast pass, a forest-green theme, floating-header refinements, a cyan rebrand, and entry-animation utilities (commits `5735510`…`1d5c1b3`). Current `HEAD` (`1d5c1b3`) is clean: `npx tsc --noEmit` passes.
**Files touched:** `.specify/**`, `specs/**`, `src/app/(admin)/admin/**`, `src/components/admin/**`, `src/features/{categories,orders,theme,i18n}/**`, `src/app/globals.css`, `AGENTS.md`, `CLAUDE.md`
**Follow-ups:**
- `specs/005`'s `plan.md` "Visual Design Direction" (brand coral/gold palette) is now historical — the shipped palette has moved on through the user's own later iterations. Don't treat that doc as current when planning future admin UI work; check `globals.css`/the live app instead.
- No live-browser QA was completed by the AI session for 006 before the user took over — worth a manual pass across EN/AR and LTR/RTL if that hasn't already been done as part of the user's later iterations.

## 2026-07-20 — Bootstrap: per-project session-awareness system
**By:** Claude (Opus 4.8)
**Summary:** Added a per-project AI change-log so every 7alm session shares context of prior AI changes and the app. Hook verified working (runs, exits 0, parses entries by leading `## `).
**Changes:**
- Added `.claude/ai-changelog/CHANGELOG.md` (this file) — the running log of AI changes.
- Added `.claude/hooks/session-context.sh` — SessionStart hook that auto-loads the 3 latest entries into each new session (stdout → session context; guarded to always exit 0).
- Added `.claude/skills/save-session/SKILL.md` — the `/save-session` skill to append entries at end of work.
- Added `.claude/settings.json` — registers the SessionStart hook (project-scoped, additive to global lean-ctx hooks).
**Files touched:** `.claude/**`
**Follow-ups:**
- On the next session, Claude Code will prompt to **trust the project hook** — approve once to enable auto-loading.
- **Pending:** add the requested MCP server to `~/.claude.json` — blocked because the pasted config never reached the assistant; user needs to re-paste it (name + command + args/env) and pick global vs 7alm-only scope.
- `.claude/` is currently untracked — commit it when ready.

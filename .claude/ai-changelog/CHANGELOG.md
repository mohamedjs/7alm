# 7alm — AI Change Log

> **Purpose:** A shared, per-project memory of what AI (Claude) changed, session by session.
> Auto-surfaced into every new session by `.claude/hooks/session-context.sh`.
> **Newest entries on top.** Append new entries with the `/save-session` skill.
>
> Entry format is fixed — keep it so the SessionStart hook can parse it (each entry starts with `## `).

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

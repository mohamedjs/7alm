---
name: save-session
description: Append a summary of the AI changes made this session to the project's AI change log (.claude/ai-changelog/CHANGELOG.md) so future 7alm sessions stay aware of what changed. Use at the end of a work session, or when the user says "save session", "log changes", "log this session", or invokes /save-session.
---

# save-session

Record what changed in **this** session into `.claude/ai-changelog/CHANGELOG.md`. That file is auto-loaded into every new session by `.claude/hooks/session-context.sh`, so a good entry is how the *next* session inherits context.

## Steps

1. **Gather what changed** — combine two sources:
   - Git signal: run `git status --short` and `git diff --stat` (and `git log --oneline -5` for any commits made this session).
   - Conversation signal: the features/fixes/decisions actually made this session, including *why* and any non-obvious choices, plus known follow-ups or gotchas. Do not invent changes that didn't happen.

2. **Write a new entry** using the exact template below. Keep it tight — this is briefing material, not a diff dump.

   ```
   ## YYYY-MM-DD — <short title of the session's work>
   **By:** Claude (<model, e.g. Opus 4.8>)
   **Summary:** <1–2 sentences: what this session accomplished and why.>
   **Changes:**
   - <bullet per meaningful change — feature/fix/refactor, with the reasoning if non-obvious>
   **Files touched:** <key paths or globs, e.g. src/features/orders/**, src/app/api/...>
   **Follow-ups:** <open items / next steps, or "None.">
   ```

3. **Prepend it** — insert the new entry so newest is on top: place it *immediately before the current first `## ` line* (right after the header blockquote). Use the Edit tool: match the existing first `## ` heading line and replace it with `<new entry>\n\n<that same first heading line>`. Never reorder or reformat older entries — the SessionStart hook parses entries by the leading `## `.

4. **Confirm** — tell the user the entry was added and show the title line.

## Rules

- Keep the `## ` prefix on the entry's first line — the hook counts entries by it.
- Convert relative dates ("today", "yesterday") to absolute `YYYY-MM-DD`.
- One entry per session. If re-invoked in the same session, update the existing top entry instead of adding a duplicate.
- If nothing meaningful changed (docs typo, no code impact), say so and skip — don't pad the log.

#!/usr/bin/env bash
# 7alm — SessionStart hook.
# Surfaces the latest AI changes into every new session so all sessions in this
# project share the same evolving context. Stdout is added to the session context.
# Must never break session start: guard everything, always exit 0.

set -uo pipefail

DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG="$DIR/.claude/ai-changelog/CHANGELOG.md"

echo "=== 7alm — Latest AI Changes (auto-loaded from .claude/ai-changelog/CHANGELOG.md) ==="
echo "App: Arabic-first Next.js 16 + Supabase e-commerce (public RTL checkout funnel + LTR /admin dashboard)."
echo "Architecture: Client → RTK Query (*.api.ts) → API routes → *.service.ts → *.repository.ts → Supabase. See AGENTS.md."
echo "Before ending a session, run /save-session to append what you changed so the next session stays aware."
echo

if [ -f "$LOG" ]; then
  # Print the 3 most recent entries. Each entry begins with a line starting '## '.
  awk '/^## /{c++} c>3{exit} c>=1{print}' "$LOG"
else
  echo "(No AI change log yet — run /save-session to create the first entry.)"
fi

exit 0

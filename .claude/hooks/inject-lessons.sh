#!/bin/bash
# SessionStart hook: inject all lessons into Claude's context
LESSONS_DIR="$CLAUDE_PROJECT_DIR/.claude/lessons"

shopt -s nullglob
files=("$LESSONS_DIR"/*.md)
[ ${#files[@]} -eq 0 ] && exit 0

CONTENT="=== Lessons from previous sessions ==="
for f in "${files[@]}"; do
  CONTENT="$CONTENT
--- $(basename "$f") ---
$(cat "$f")
"
done

printf '%s' "$CONTENT" | python3 -c 'import sys,json; print(json.dumps({"systemMessage": sys.stdin.read()}))'

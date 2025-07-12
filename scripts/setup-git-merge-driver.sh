#!/usr/bin/env bash
set -e

echo "🔧 Setting up SQLite merge driver…"

# 1) Register a merge driver name and description
git config merge.sqlite.name "SQLite DB merge driver"

# 2) Register the merge driver action script
git config merge.sqlite.driver "!f() { \
  sqlite3 \"$BASE\" .dump > \"$BASE.sql\" && \
  sqlite3 \"$REMOTE\" .dump > \"$REMOTE.sql\" && \
  sqlite3 \"$LOCAL\"  .dump > \"$LOCAL.sql\"  && \
  git merge-file -p \"$LOCAL.sql\" \"$BASE.sql\" \"$REMOTE.sql\" \
    | sqlite3 \"$LOCAL\" && \
  rm -f \"$BASE.sql\" \"$REMOTE.sql\" \"$LOCAL.sql\"; \
}; f"

# 3) Enable the custom hooks directory (.githooks/)
git config core.hooksPath .githooks

echo "✅ SQLite merge driver and Git hooks configured."

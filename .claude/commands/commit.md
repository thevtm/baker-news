---
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git commit:*)
description: Commit staged changes
---

## Context

- Staged changes: !`git diff --cached`
- Recent commits (for style reference): !`git log --oneline -5`

## Your task

1. If the staged diff is empty, stop and tell the user there is nothing staged to commit.
2. Determine the commit prefix based on which project the staged files belong to:
   - If all staged files are under `baker-news-ts/` → prefix with `ts:`
   - If all staged files are under `baker-news-go/` → prefix with `go:`
   - If all staged files are under `baker-news-rb/` → prefix with `rb:`
   - If staged files span multiple projects → prefix like so `ts/go:`
3. Write a concise commit message based on the staged changes. Focus on the "why" over the "what". Use the recent commits for style reference.
4. Commit using:

```
git commit -m "$(cat <<'EOF'
<prefix>: <your message here>
EOF
)"
```

Do not stage any additional files. Do not use any other tools.

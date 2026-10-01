# Repository workflow rules

Follow these rules strictly for every task in this repository.

## Git identity

Use this repository-local identity for commits:

```bash
git config user.name "Siddharth Pandey"
git config user.email "siddharth.pandey06@gmail.com"
```

Before any push, re-verify the identity in the current repository, even if it was verified earlier in the session:

```bash
git config user.name && git config user.email
```

Do not run `git push` unless the user explicitly asks for a push.

## Branch workflow

At the start of each new task, update `main` from `origin` and create a feature branch from that updated `main`:

```bash
git checkout main && git pull origin main && git checkout -b feature/<name>
```

Use a concise, task-specific name for `<name>`. Never create a feature branch from another unmerged or pre-squashed feature branch; squashed remote merges can otherwise cause false merge conflicts.

Do not amend or rewrite history on shared branches unless the user explicitly asks.

If the repository is not a Git repository, or `main`/`origin` is unavailable, do not initialize Git, invent a remote, or silently use a different branch as the base. Explain the blocker and continue only with work that does not depend on the Git workflow.

## Agent-room tracking

- Governance scaffold: `create-agent-room` 2.7.0, minimal preset, Codex adapter. Check it with `npx --yes create-agent-room@2.7.0 validate .`.
- Read `.agent-room/guardrails.md` before changing protected areas, and check `.agent-room/decisions.md` and `.agent-room/anti-patterns.md` before non-trivial work.
- Record non-obvious architecture choices in `.agent-room/decisions.md`; record concrete bugs and their root causes in `.agent-room/anti-patterns.md`.
- Put implementation plans in `docs/plans/` and read-only investigation notes in `docs/research/` when the work benefits from them.
- The current minimal Codex setup is guidance-only. Do not claim a hook or CI check blocked a change unless a Git adapter is installed and actually ran.
- Follow the active user and system instructions for verification; do not add or run tests unless the user asks.

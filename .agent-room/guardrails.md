# Agent Guardrails — mera-saarthi

Boundaries and constraints for AI agents working in this codebase. Read
this file before making changes to protected areas. When in doubt, ask
the maintainer rather than proceeding.

## Protected paths

Files that need maintainer review before modification:

- `.env*` and Android signing files (`*.jks`, `*.keystore`)
- `android/app/src/main/AndroidManifest.xml` (contains the Maps key reference)
- `supabase/schema.sql` (database schema and access policies)
- `.agent-room/guardrails.json`, `.agent-room/guardrails.md`, and hook files

## Approval requirements

Changes that require human review, even if technically possible:

- Database migrations (schema changes, data backfills)
- Dependency major version bumps
- Changes to CI/CD pipeline configuration
- Changes to authentication or authorization logic
- Modifications to production deployment configuration

## Scope guidance

Keep individual changes focused and reviewable:

- **Aim for:** single-purpose PRs, one concern per change
- **Watch for:** PRs touching more than 15-20 files, changes exceeding
  ~500 lines of new code, or changes that mix refactoring with new features
- A migration touching 30 files may be genuinely appropriate — that's what
  the bypass below is for — but it deserves extra scrutiny, not a silent pass

The `maxFilesPerChange`/`maxLinesPerChange` numbers in
`.agent-room/guardrails.json` are scope guidance. In this project’s current
minimal Codex setup, no pre-commit hook is installed, so these values are not
mechanically enforced. If a Git adapter is added later, verify its hook is
installed and running before describing any guardrail as enforced.

## Forbidden actions

Actions agents must never take, regardless of context. These are
human-facing intents — read and follow them; they are not something a
regex can check for you:

- Deploy to production without human approval
- Delete database tables or collections in production
- Modify authentication middleware without security review
- Commit secrets, API keys, or credentials to the repository
- Disable or skip tests to make a build pass
- Suppress security audit warnings without documenting why

The narrower, mechanically-checkable case — "does this diff literally
contain something that looks like a credential" — can be checked against
the `forbiddenActions` entries in `.agent-room/guardrails.json` (AWS keys,
private key headers, API token formats, and similar). This Codex-only setup
does not currently run that check automatically. The pattern list is
deliberately narrow and cannot catch every secret format, so the prose rule
still applies.

## How to use this file

1. **Before starting work:** Scan the change against protected paths. If
   the change touches a protected area, ask the maintainer for approval.
2. **During work:** Check scope guidance. If the change is growing beyond
   the guidelines, consider splitting it.
3. **Before finishing:** Verify none of the forbidden actions were taken.

For machine-readable guardrails that CI and tooling can enforce, see
`.agent-room/guardrails.json`.

# Engineering Workflow

This document defines the working rules for the `when-should-we-meet` project.

## Branching
- Start new work from `dev`.
- Use a `codex/` branch prefix by default.
- Open pull requests to `dev` unless there is an explicit override.

## After PR creation
- Once a PR is opened, return to `dev`.
- If there is other work that does not depend on that PR being merged, continue immediately on a new branch.
- If the next task depends on a specific open PR, call that out explicitly before continuing.

## Review
- Reviews should be recorded on the GitHub PR when possible, not only in chat.
- For this project, use the `wswm-reviewer` criteria:
  - merge blockers first
  - MVP scope discipline
  - mobile-only UX consistency
  - state model clarity
  - Supabase / SQL / RLS safety

## PR expectations
- Explain what changed and why.
- Keep the PR body concise but concrete.
- Mention validation used for the change.
- Note whether the work is independent of other open PRs.

## Current review checklist
- landing -> room create/join -> nickname -> calendar flow is coherent
- local state vs server state boundaries remain clear
- common UI is reused rather than duplicated
- mobile-width-only layout is preserved
- SQL and RLS changes do not accidentally widen access

## Notes
- SQL migrations are expected to be committed to Git when they define schema, policies, indexes, or functions.
- Secrets, production data dumps, and sensitive environment values must not be committed.

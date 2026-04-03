---
description: Run a code review of changes on the current branch against origin/dev
disable-model-invocation: true
---

<!-- Why this exists instead of built-in /review:
  1. Pre-PR workflow — diffs against origin/dev before pushing, not PR-based.
  2. Project-specific setup steps (test commands, audit, ignore lists).
  3. Enforces project-specific CLAUDE.md rules with custom confidence thresholds. -->

Run a code review of changes on the current branch against origin/dev.

## Setup

1. Run: `git fetch origin dev && git diff $(git merge-base HEAD origin/dev) HEAD`
2. If the diff exceeds 2000 lines, summarize changes per file first, then deep-dive into critical files.

## Ignore List

Skip reviewing these files — they are auto-generated or non-logic:
- `pnpm-lock.yaml`, `package-lock.json`
- `prisma/generated/**`, `dist/**`
- `*.min.js`, `*.map`

## Review Against CLAUDE.md Rules

Check every changed file against these categories:

### Type Safety (Code Standards 1–3)
- No `any` types — proper types must be defined
- No non-null assertions (`!`) — handle nullability explicitly
- No `as unknown as T` casts — find type-safe alternatives

### Code Quality (Code Standards 4–7)
- Single quotes for strings; template literals over concatenation
- Full code only — no placeholders, stubs, or TODOs left in
- Type prefixes: `T` for types, `I` for interfaces, `_` for unused params
- Named exports over default exports

### Code Review Checklist
1. **No duplication** — reuse existing components, utils, patterns
2. **Error handling** — proper types, no swallowed errors, no silent catches
3. **Import hygiene** — use path aliases (`@react/*`, `@shared/*`), no circular deps, no deprecated `@src/*`
4. **Naming** — consistent with codebase conventions
5. **Comments** — inline for non-obvious logic; JSDoc for exported APIs

### Security
- No hardcoded secrets, API keys, or tokens
- No `.env` files committed
- User input is validated/sanitized
- Public endpoints have rate limiting

### "Do NOT" Violations
- New dependencies without justification
- Pre-commit hook bypass (`--no-verify`)
- Missing error handling on external calls

## Output Format

For each issue found, report:
- **Severity**: Critical / High / Medium / Low
- **File**: path and line number
- **Rule**: which rule or checklist item was violated
- **Issue**: what's wrong
- **Fix**: how to remediate

## Summary

End with:
1. Total issues by severity
2. Overall verdict: **Approve** or **Request Changes**
3. If Request Changes, list the blocking issues that must be fixed

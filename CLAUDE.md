# CLAUDE.md - SmythOS UI

Open-source pnpm monorepo for building and deploying AI agents.

## Project Structure

- `packages/app` — Builder UI, React 18 frontend (Vite + Rollup), Express backend
- `packages/middleware` — Core API (Prisma/MySQL), auth, services
- `packages/runtime` — Agent execution server

## Quick Reference

```bash
pnpm install                          # Install all dependencies
pnpm build                            # Production build (all packages)
pnpm dev                              # Start all packages in dev mode

# packages/app
pnpm --filter smyth-builder type-check       # TypeScript type checking
pnpm --filter smyth-builder format           # Prettier format
pnpm --filter smyth-builder knip             # Dead code detection

# packages/middleware
pnpm --filter middleware test                 # Run Vitest tests
pnpm --filter middleware lint                 # ESLint
pnpm --filter middleware prisma:generate      # Regenerate Prisma client
pnpm --filter middleware prisma:migrate       # Run DB migrations
```

## Path Aliases (`packages/app`)

| Alias | Resolves to |
|-------|-------------|
| `@react/*` | `src/react/*` |
| `@shared/*` | `src/shared/*` |
| `@src/*` | `src/*` *(deprecated — do not use in new code)* |

## Tech Stack

- **Runtime**: Node.js, TypeScript 5.x (strict mode in React app)
- **Frontend**: React 18, Zustand, TanStack Query, Tailwind CSS 3, Radix UI, shadcn/ui
- **Backend**: Express 4, Prisma ORM, Redis (ioredis), Winston logging
- **Testing**: Vitest (middleware + runtime), Supertest for API tests
- **Build**: Rollup (app + middleware), Vite (React dev server)
- **Linting**: ESLint 9 flat config (app), ESLint 8 legacy (middleware/runtime), Prettier

## Code Standards (Strictly Enforced)

1. **No `any` type** — define proper types always
2. **No non-null assertions (`!`)** — handle nullability explicitly
3. **No `as unknown as T` casts** — find type-safe alternatives
4. **Single quotes** for strings; template literals over concatenation
5. **Full code only** — no placeholders or stubs
6. **Types**: prefix `T` for types (`TChatMessage`), `I` for interfaces (`IChatState`), `_` for unused params
7. **Named exports** over default exports

## Code Review Checklist

1. **Type safety** — no `any`, no `!`, no unsafe casts
2. **No duplication** — reuse existing components, utils, patterns
3. **Error handling** — proper types, no swallowed errors, no silent catches
4. **Import hygiene** — use path aliases (`@react/*`, `@shared/*`), no circular deps
5. **Naming** — consistent with codebase conventions (see file names in context)
6. **Comments** — inline for non-obvious logic; JSDoc for exported APIs

## Testing Conventions

- Test files live alongside source: `*.test.ts` or `*.spec.ts`
- Use Vitest (`describe`, `it`, `expect`) — not Jest
- API tests use Supertest with `node-mocks-http`
- Mock external services; never hit real APIs in tests

## Security Context

- Secrets must use env vars — never hardcoded in source
- Never commit `.env` files or `.env.*` variants
- No API keys, tokens, or passwords in code or logs
- Sanitize user input (DOMPurify is available for HTML)
- Use `express-rate-limit` on public-facing endpoints

## Do NOT

- Introduce new dependencies without justification
- Bypass pre-commit hooks (`--no-verify`)
- Skip error handling for external calls
- Use the deprecated `@src/*` alias in new code
- Commit generated files (`dist/`, `prisma/generated/`)

# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 16 + TypeScript application backed by Prisma 7 and PostgreSQL. Application routes live in `app/`; server mutations are concentrated in `app/actions/`, and HTTP endpoints are in `app/api/`. Shared UI is under `components/`, with feature folders such as `components/tracklists`, `components/incidences`, `components/inbox`, and atomic controls in `components/ui`. Shared utilities and database access live in `lib/`; always import Prisma through `lib/db.ts`. Schema and seed files are in `prisma/`. Integration tests live in `tests/integration/`. Static assets are in `public/`.

## Build, Test, and Development Commands

- `npm run dev`: start the local Next.js dev server.
- `npm run build`: run `prisma generate` and create a production build.
- `npm run start`: run the built app.
- `npm run lint`: run ESLint with Next.js TypeScript rules.
- `npm run test:integration`: run Vitest integration tests through `scripts/run-integration-tests.mjs`.
- `npm run seed`: seed the development database.
- `npm run db:deploy`: generate Prisma client, push schema, and apply migrations.

Use `npx tsc --noEmit` for a quick type-check when changing shared types or server actions.

## Coding Style & Naming Conventions

Use TypeScript with explicit types; avoid `any`. Keep mutations in server actions marked with `'use server'`, and do not import Prisma in client components. UI text is primarily Spanish. Components and component files use PascalCase; directories use kebab-case; functions and variables use camelCase; constants use `UPPER_SNAKE_CASE`. Prefer existing components and helpers before adding new abstractions. Styling uses Tailwind CSS v4 and `cn()` from `lib/utils.ts` for conditional classes.

## Testing Guidelines

Vitest is configured for integration tests in `tests/integration/**/*.test.ts` with `node` environment and serial execution. Tests require `DATABASE_URL_TEST`; setup mocks auth and `next/cache`, then truncates key tables before each test. Name tests after behavior, for example `ticket-assignment-automation.test.ts`, and cover permission, data, and rollback paths for server actions.

## Commit & Pull Request Guidelines

Git history uses Conventional Commits such as `feat:`, `fix:`, `ci:`, `docs:`, and `refactor:`. Keep commits focused and describe user-visible behavior when possible. Pull requests should include a concise summary, linked issue or task when relevant, verification commands run, and screenshots for UI changes.

## Security & Configuration Tips

Keep secrets in `.env`; do not commit credentials or database URLs. External API tests and routes depend on `ENABLE_EXTERNAL_API` and `EXTERNAL_API_SECRET`. Validate file uploads and attachment URLs carefully, especially paths under `public/uploads`.

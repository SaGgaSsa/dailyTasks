# Repository Guidelines

## Project Structure & Module Organization
This repository has two main parts:
- `docker-compose.yml`: local PostgreSQL service (`postgres:15`).
- `daily-tasks/`: Next.js + TypeScript application.

Inside `daily-tasks/`:
- `app/`: App Router pages, layouts, API routes, and server actions.
- `components/`: UI and feature components (`ui/`, `incidence/`, `tracklists/`, etc.).
- `lib/`: shared utilities, data access, and query helpers.
- `hooks/`: reusable React hooks.
- `prisma/`: Prisma schema and seed script.
- `public/`: static assets.
- `docs/`: project notes and plans.

## Build, Test, and Development Commands
From repo root:
- `docker-compose up -d`: start PostgreSQL in the background.
- `docker-compose down`: stop services.

From `daily-tasks/`:
- `npm run dev`: run Next.js locally at `http://localhost:3000`.
- `npm run build`: generate Prisma client, then build production app.
- `npm run start`: run production build.
- `npm run lint`: run ESLint checks.
- `npm run seed`: seed database via `prisma/seed.ts`.

## Coding Style & Naming Conventions
- Language: TypeScript (`strict` mode enabled).
- Linting: ESLint (`eslint-config-next` with Core Web Vitals + TS rules).
- Formatting style in current codebase: 2-space indentation, single quotes, minimal semicolons.
- Components/types: `PascalCase` exports.
- Files: use `kebab-case` (for example, `user-detail-sheet.tsx`).
- Use the `@/*` import alias for app-local imports when clearer than deep relative paths.

## Testing Guidelines
There is no dedicated automated test runner configured yet. At minimum for each change:
- Run `npm run lint`.
- Run `npm run build` for integration/type safety.
- Manually verify affected flows in `npm run dev`.

When adding tests, place them near the feature (for example, `component-name.test.tsx`) and prioritize critical business flows.

## Commit & Pull Request Guidelines
Use Conventional Commit style seen in history:
- `feat: ...`, `fix: ...`, `refactor: ...`, `perf: ...`, `style: ...`

PRs should include:
- clear scope and why the change is needed,
- linked issue/task,
- validation steps run (`lint`, `build`, manual checks),
- screenshots or short recordings for UI changes.

## Security & Configuration Tips
- Keep secrets only in `.env` files; never commit credentials.
- Ensure database env vars match `docker-compose.yml` before running Prisma or app commands.

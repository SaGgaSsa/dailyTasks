# AGENTS.md

## Workflow

When implementing new features, always implement the code directly rather than stopping at a plan and waiting for confirmation. Only create plans when explicitly asked to plan.

## Project

Daily Tasks is a Jira-like incident/ticket management app for teams. Built with Next.js 16, TypeScript (strict), Prisma 7 + PostgreSQL, Tailwind CSS v4, Radix UI, dnd-kit, and NextAuth v5.

## Commands

```bash
npm run dev          # Dev server (port 3000)
npm run build        # prisma generate + next build
npm run lint         # ESLint
npm run seed         # Seed database (then sign out/in to sync session user id)
npm run db:reset     # Reset DB: prisma generate + push --force-reset + seed
npm run test:integration  # Run integration tests (vitest)

npx tsc --noEmit     # Type-check only (preferred for quick verification)
npx prisma db push   # Push schema changes
npx prisma generate  # Regenerate Prisma client
npx prisma studio    # DB GUI (port 5555)

docker-compose up -d # Start PostgreSQL
```

Integration tests use **vitest** and live in `tests/integration/`. No unit or E2E test frameworks are configured.

## Architecture

```
app/
  actions/          # Server Actions ('use server') — all mutations live here
  api/              # API routes (auth, attachments, external integrations)
  dashboard/        # Main incidence tracking UI
    incidences/[id]/ # Incidence detail (tabs: general, assets, tasks, pages)
  tracklists/       # QA ticket management (includes Gantt chart)
  analytics/        # Charts/analytics page
  auth/login/       # Login page (credentials-based, NextAuth v5 + bcryptjs)
components/
  ui/               # Atomic components (shadcn/ui + custom)
  board/            # Kanban/backlog views
  incidences/       # Incidence management components
  incidence-detail/ # Incidence detail view sub-components
  tracklists/       # QA tracklist components
lib/
  db.ts             # Singleton Prisma client — always import from here
  queries/          # Reusable database query functions (currently minimal; most queries in actions)
  i18n/             # Spanish/English translations (next-intl, defaults to 'es')
types/
  enums.ts          # All app enums (must mirror Prisma schema exactly)
  index.ts          # Shared TypeScript types
prisma/
  schema.prisma     # Data model
tests/
  integration/      # Vitest integration tests
```

### Key Domain Models (Prisma)

- **Incidence** — main work item with statuses: BACKLOG/TODO/IN_PROGRESS/REVIEW/DONE/DISMISSED
- **Assignment** — links users to incidences with hours and task tracking
- **Task** — sub-tasks under assignments
- **IncidencePage** — rich-text documentation pages (BlockNote JSON content)
- **Tracklist / TicketQA** — QA ticket lists with types: BUG/CAMBIO/CONSULTA
- **ExternalWorkItem / WorkItemType** — external system integration (Jira)
- **Technology / Module** — tech stack and module organization
- **NonWorkingDay** — holidays for scheduling

### Rich Text

Incidence pages use **BlockNote** editor (built on TipTap). Content is stored as JSON in `IncidencePage.content`.

## Core Rules

1. **No `any`** — use explicit types or `unknown` with type guards.
2. **All mutations** must be Server Actions (`'use server'`) in `app/actions/`.
3. **Never use Prisma on the client** — only in Server Actions and API routes.
4. **UI text in Spanish.**
5. **All create/edit forms** must use `FormSheet` from `@/components/ui/form-sheet`.
6. **Server action return type**: `{ success: boolean, error?: string, data?: T }` — always include try/catch and handle Prisma P2002 (unique constraint).
7. **Show minimal diffs** — do not reprint full files unless explicitly asked.
8. **Do not refactor** unrelated code.

## Key Patterns

**Server Action:**
```typescript
'use server'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function upsertFoo(data: UpsertFooData) {
  try {
    // ... db operation
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'El registro ya existe' }
    }
    return { success: false, error: 'Error al guardar' }
  }
}
```

**Client component** — use `isPending` state + `sonner` toasts:
```typescript
const result = await serverAction(data)
if (result.success) toast.success('Guardado correctamente')
else toast.error(result.error || 'Error')
```

## Code Conventions

- When adding UI features like modals or dialogs, always reuse existing components rather than creating new separate ones. Check for existing similar components first.
- When renaming fields or modifying schema, grep the entire codebase for ALL references before making changes. Be careful not to change similarly-named fields on different models.

## Build & Verification

- After every edit, verify imports are still valid — never remove an import without checking all files that use it. If you need to validate types, run `npx tsc --noEmit`.
- Do not run `npm run build` to verify changes. The full production build is handled by the deploy pipeline.

## Naming Conventions

| Item | Convention |
|------|------------|
| Components / files | PascalCase |
| Directories | kebab-case |
| Functions / variables | camelCase |
| Constants | UPPER_SNAKE_CASE |
| DB columns | snake_case |

## Styling

- Tailwind v4, dark theme by default (`dark` class on `<html>`).
- Use `cn()` from `lib/utils.ts` for conditional classes.
- Color palette: `zinc-100` through `zinc-900`.

## Git

Conventional Commits: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`.

## Pre-commit

1. `npm run lint` — fix all errors
2. `npx tsc --noEmit` — must succeed

# AGENTS.md - Daily Tasks Development Guide

## Project Overview
Next.js 16 task/incidence management app (Jira-like). Stack: TypeScript, NextAuth.js, Prisma ORM, Tailwind CSS v4, Radix UI, PostgreSQL.

## Commands (run from `daily-tasks`)

```bash
# Development
npm run dev          # Dev server (port 3000)
npm run build        # Generate Prisma + Next.js build
npm run start        # Production server

# Linting
npm run lint         # Run ESLint
npx eslint <file>   # Lint specific file
npx eslint --fix    # Auto-fix linting issues

# Database
npx prisma generate        # Generate Prisma client
npx prisma db push         # Push schema changes
npx prisma studio          # Open Prisma GUI (port 5555)
npm run seed              # Seed database

# Docker
docker-compose up -d       # Start PostgreSQL
docker-compose logs postgres  # View DB logs
```

## TypeScript & Types
- Use strict mode; avoid `any`. Use explicit types or `unknown` with guards
- Interface for objects, type for unions/intersections
- Use `Readonly<T>` for immutability
- Enums in `types/enums.ts`: TaskStatus, TaskType, TechStack, Priority, UserRole

## Imports Order
external → `@/*` → relative
```typescript
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { UserForm } from './user-form'
```

## Naming Conventions
| Pattern | Convention | Example |
|---------|------------|---------|
| Components/Files | PascalCase | `UserTable.tsx`, `TaskCard` |
| Directories | kebab-case | `components/ui/`, `app/actions/` |
| Functions/vars | camelCase | `getUsers()`, `isLoading` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Enums | PascalCase | `TaskStatus.TODO` |
| DB fields | snake_case | `created_at`, `user_id` |
| React props | camelCase | `onOpenChange`, `initialData` |

## Server Actions Pattern
```typescript
'use server'
export async function createUser(data: UserData) {
  try {
    const result = await db.user.create({ data })
    revalidatePath('/dashboard/users')
    return { success: true, data: result }
  } catch (error) {
    console.error('Error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error' }
  }
}
```

## Error Handling
- Server: try-catch, return `{ success: boolean, error?: string, data?: T }`
- Client: use error boundaries, toast via `sonner`
- Never expose stack traces to client
- UI text in Spanish: "Guardar", "Eliminar", "Usuario creado correctamente"

## UI Components (shadcn/ui-style)
Use `class-variance-authority` for variants:
```typescript
const buttonVariants = cva("inline-flex items-center justify-center...", {
  variants: {
    variant: { default: "...", destructive: "..." },
    size: { default: "h-9 px-4 py-2", sm: "h-8 rounded-md" }
  },
  defaultVariants: { variant: "default", size: "default" }
})
```

## Database (Prisma)
- snake_case columns via `@map`, singleton in `lib/db.ts`
- Never use Prisma on client-side
- Models: User, Incidence, Assignment, SubTask, Workspace

## Auth (NextAuth.js)
- Config in `auth.config.ts`, JWT strategy, bcrypt passwords
- Extended session includes `id`, `email`, `username`, `role`

## Tailwind CSS
- Dark theme default (`dark` class on html)
- Use `cn()` for conditional classes

## File Structure
```
daily-tasks/
├── app/              # Next.js App Router
│   ├── actions/     # Server actions
│   ├── dashboard/   # Protected routes
│   └── api/         # API routes
├── components/ui/   # Base UI components
├── components/*/    # Feature components
├── lib/db.ts        # Prisma singleton
├── types/enums.ts   # App enums
└── prisma/          # Schema & seed
```

## Git Workflow
- Commit after task completion using Conventional Commits:
  - `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`
- Example: `git commit -m "feat: add drag and drop to kanban board"`
- Never commit broken code
- Run `npm run lint` and `npm run build` before committing

## Common Patterns
1. **Sheet/Dialog**: `open`, `onOpenChange` props
2. **Data fetching**: Server actions → client with `initialData`
3. **Revalidation**: `revalidatePath()` after mutations
4. **Forms**: Server actions with typed objects

## Important Notes
- Database requires Docker Compose running
- Prisma client must be generated before building
- Environment variables in `.env`: DATABASE_URL, NEXTAUTH_SECRET

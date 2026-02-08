# AGENTS.md - Daily Tasks Development Guide

## Project Overview
Next.js 16 task/incidence management app (Jira-like). Stack: TypeScript, NextAuth.js, Prisma ORM, Tailwind CSS v4, Radix UI, PostgreSQL.

## Commands (run from `daily-tasks`)

```bash
npm run dev          # Dev server (port 3000)
npm run build        # Generate Prisma + Next.js build
npm run start        # Production server
npm run lint         # Run ESLint
npm run seed         # Seed database
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes
npx prisma studio    # Open Prisma GUI (port 5555)
docker-compose up -d # Start PostgreSQL
```

## TypeScript
- Use strict mode, avoid `any`; use explicit types or `unknown`
- Interface for objects, type for unions/intersections
- Use `Readonly<T>` for immutability

## Imports
Order: external → `@/*` → relative
```typescript
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'
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
| DB fields | snake_case | `created_at`, `user_id` |

## Enums (`types/enums.ts`)
```typescript
export enum TaskStatus { BACKLOG = "BACKLOG", TODO = "TODO", ... }
export enum UserRole { ADMIN = "ADMIN", DEV = "DEV" }
```

## Server Actions
```typescript
'use server'
export async function createUser(data: UserData) {
  try {
    const result = await db.user.create({ data })
    revalidatePath('/dashboard/users')
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
```

## Error Handling
- Server: try-catch, return `{ success: boolean, error?: string, data?: T }`
- Client: use error boundaries, toast via `sonner`
- Never expose stack traces to client

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

## Auth (NextAuth.js)
- Config in `auth.config.ts`, JWT strategy, bcrypt passwords
- Extended session type includes `id`, `email`, `username`, `role`, `avatarUrl`

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
├── components/*/     # Feature components
├── lib/db.ts        # Prisma singleton
├── types/enums.ts   # App enums
└── prisma/          # Schema & seed
```

## Spanish Language
- UI text in Spanish: "Guardar", "Eliminar"
- Error messages in Spanish

## Version Control
- Commit after task completion
- Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`
- Never commit broken code

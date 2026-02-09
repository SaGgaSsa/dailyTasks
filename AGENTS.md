# AGENTS.md - Daily Tasks Development Guide

Guidelines for AI agents working on this Next.js 16 task management application.

## Project Overview

Next.js 16 app with PostgreSQL for task/incidence management (Jira-like). Stack: TypeScript, NextAuth.js, Prisma ORM, Tailwind CSS v4, Radix UI, dnd-kit for drag-and-drop.

**All commands run from `daily-tasks/` directory.**

## Commands

```bash
# Development
npm run dev                    # Dev server (port 3000)
npm run build                  # Prisma generate + Next.js build
npm run start                  # Production server
npm run seed                   # Seed database

# Linting
npm run lint                   # Run ESLint on codebase
npx eslint <file>              # Lint specific file
npx eslint --fix <file>        # Auto-fix linting issues

# Database
npx prisma generate            # Generate Prisma client (before build)
npx prisma db push             # Push schema changes
npx prisma studio              # Open Prisma GUI (port 5555)
npx prisma migrate dev         # Run migrations

# Docker
docker-compose up -d           # Start PostgreSQL
docker-compose logs postgres   # View DB logs
docker-compose down            # Remove containers
```

**Testing:** No test framework configured. Add Jest/Vitest to package.json when creating tests.

## TypeScript Rules

- Strict mode enabled. Avoid `any` - use explicit types or `unknown` with type guards
- Interface for object shapes, type for unions/intersections
- Use `Readonly<T>` for immutable data
- Prisma types imported from `@prisma/client` (e.g., `User`, `Incidence`)

## Import Order

External packages → `@/*` alias → relative imports

```typescript
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, Trash2 } from 'lucide-react'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { IncidenceForm } from './incidence-form'
```

## Naming Conventions

| Pattern | Convention | Example |
|---------|------------|---------|
| Components/Files | PascalCase | `UserTable.tsx`, `TaskCard` |
| Directories | kebab-case | `components/ui/`, `app/actions/` |
| Functions/variables | camelCase | `getUsers()`, `isLoading` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Database columns | snake_case | `created_at`, `user_id` |
| React props | camelCase | `onOpenChange`, `initialData` |

## Server Actions Pattern

All server-side mutations use `'use server'` directive:

```typescript
'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function upsertUser(data: UpsertUserData) {
    try {
        if (data.id) {
            await db.user.update({ where: { id: data.id }, data: { ...data } })
        } else {
            await db.user.create({ data })
        }
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error:', error)
        if (error instanceof Error && 'code' in error && error.code === 'P2002') {
            return { success: false, error: 'El registro ya existe' }
        }
        return { success: false, error: 'Error al guardar' }
    }
}
```

**Return pattern:** `{ success: boolean, error?: string, data?: T }`

## Client Components

```typescript
'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export function MyForm({ onSubmit }: MyFormProps) {
    const [isPending, setIsPending] = useState(false)

    async function handleSubmit() {
        setIsPending(true)
        const result = await onSubmit(formData)
        if (result.success) {
            toast.success('Guardado correctamente')
        } else {
            toast.error(result.error || 'Error')
        }
        setIsPending(false)
    }

    return <form onSubmit={handleSubmit}>...</form>
}
```

## Enums

Defined in `types/enums.ts` - match Prisma schema exactly:

- `TaskStatus`: BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE
- `TaskType`: I_MODAPL, I_CASO, I_CONS
- `TechStack`: SISA, WEB, ANDROID, ANGULAR, SPRING
- `Priority`: LOW, MEDIUM, HIGH
- `UserRole`: ADMIN, DEV

## UI Components (shadcn/ui + Radix)

Use `class-variance-authority` for variants:

```typescript
const buttonVariants = cva("inline-flex items-center justify-center...", {
    variants: {
        variant: { default: "bg-primary", destructive: "bg-destructive" },
        size: { default: "h-9 px-4", sm: "h-8" }
    },
    defaultVariants: { variant: "default", size: "default" }
})
```

Common patterns:
- Sheet/Dialog: `open`, `onOpenChange` props
- Use `cn()` for conditional classes: `cn("base-class", condition && "conditional")`

## Database (Prisma)

- Models: User, Incidence, Assignment, SubTask
- Snake_case columns via `@map("table_name")`
- Singleton client in `lib/db.ts` - import as `import { db } from '@/lib/db'`
- Never use Prisma on client-side (only in Server Actions/API routes)

## Authentication (NextAuth.js v5)

- Config in `auth.config.ts`, JWT session strategy
- Extended session: `{ id, email, username, role, avatarUrl }`
- bcryptjs for password hashing

## Tailwind CSS v4

- Dark theme default (`dark` class on html element)
- CSS variables in `globals.css` for theming
- Use `cn()` utility from `lib/utils.ts`

## File Structure

```
daily-tasks/
├── app/
│   ├── actions/           # Server actions (*.ts)
│   ├── api/               # API routes
│   ├── dashboard/         # Protected routes
│   └── layout.tsx
├── components/
│   ├── ui/                # Base UI (Button, Sheet, Dialog, etc.)
│   ├── board/             # Kanban/task components
│   └── users/             # User management components
├── lib/
│   ├── db.ts              # Prisma singleton
│   └── utils.ts           # cn() and utilities
├── types/
│   ├── enums.ts           # Application enums
│   └── index.ts           # Shared types
└── prisma/
    ├── schema.prisma
    └── seed.ts
```

## Spanish Language

- UI text in Spanish: "Guardar", "Eliminar", "Usuario creado correctamente"
- Error messages in Spanish for user-facing feedback
- Code comments can be Spanish or English (be consistent per file)

## Common Patterns

1. **Sheet with form:** Open/close state, form data, save on close
2. **Data fetching:** Server actions → client with `initialData` prop
3. **Revalidation:** `revalidatePath('/dashboard')` after mutations
4. **Drag-and-drop:** dnd-kit for Kanban board (`@dnd-kit/core`, `@dnd-kit/sortable`)
5. **Toast notifications:** Use `sonner` - `toast.success()`, `toast.error()`

## Pre-commit Checklist

1. `npm run lint` - Fix all linting errors
2. `npm run build` - Verify build succeeds
3. Docker running: `docker-compose up -d`
4. Prisma client generated: `npx prisma generate`

## Git Commits

Use Conventional Commits:
- `feat:` new features
- `fix:` bug fixes  
- `refactor:` code cleanup
- `style:` formatting/UI
- `docs:` documentation
- `chore:` config/dependencies

Example: `git commit -m "feat: add task filtering by technology"`

**Never commit broken code.** Fix errors first.

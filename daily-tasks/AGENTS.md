# Daily Tasks – AI Development Rules

## Stack

Next.js 16 + TypeScript (strict) + Prisma + PostgreSQL + Tailwind v4 + Radix UI + dnd-kit + NextAuth v5

---

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
docker-compose down            # Remove containers
```

**Testing:** No test framework configured. Add Jest/Vitest when needed.

---

## Core Rules (MANDATORY)

1. Never use `any`. Use explicit types or `unknown` with type guards.
2. All mutations must use `'use server'`.
3. Never use Prisma on client-side (only in Server Actions/API routes).
4. UI text must be in Spanish.
5. All forms MUST use `FormSheet` from `@/components/ui/form-sheet`.
6. Server action return pattern: `{ success: boolean, error?: string, data?: T }`
7. Do NOT reprint full files unless explicitly requested.
8. Show minimal diffs only - focus on changed lines.
9. Do not modify unrelated files.
10. Do not refactor unless explicitly requested.

---

## TypeScript

- Strict mode enabled.
- Use `interface` for object shapes, `type` for unions/intersections.
- Import Prisma types from `@prisma/client` (e.g., `User`, `Incidence`).
- Define shared types in `types/index.ts`.
- Define all enums in `types/enums.ts` matching Prisma schema exactly.

---

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

---

## Naming Conventions

| Pattern | Convention | Example |
|---------|------------|---------|
| Components/Files | PascalCase | `UserTable.tsx`, `TaskCard` |
| Directories | kebab-case | `components/ui/`, `app/actions/` |
| Functions/variables | camelCase | `getUsers()`, `isLoading` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Database columns | snake_case | `created_at`, `user_id` |
| Types/Interfaces | PascalCase | `IncidenceWithDetails` |

---

## Server Action Pattern

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

**Required:** try/catch block, handle P2002 unique constraint violations, `revalidatePath()`, return `{ success, error?, data? }`.

---

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

---

## FormSheet Components

**ALWAYS use** `FormSheet` from `@/components/ui/form-sheet` for create/edit forms and detail panels.

| Component | Purpose |
|-----------|---------|
| `FormSheet` | Main wrapper with header, save/close buttons |
| `FormInput` | Labeled input with dark theme styles |
| `FormSelect` | Labeled select dropdown |
| `FormTextarea` | Labeled textarea |
| `FormRow` | Two-column grid |
| `FormRow3` | Three-column grid |

---

## Database (Prisma)

- Models: `User`, `Incidence`, `Assignment`, `SubTask`
- Use `@map("table_name")` for snake_case columns
- Singleton client: `import { db } from '@/lib/db'`
- Enums in Prisma schema match `types/enums.ts`

---

## Enums

```typescript
TaskStatus: BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE
TaskType: I_MODAPL, I_CASO, I_CONS
TechStack: SISA, WEB, ANDROID, ANGULAR, SPRING
Priority: LOW, MEDIUM, HIGH
UserRole: ADMIN, DEV
```

---

## Tailwind CSS v4

- Dark theme default (`dark` class on html)
- CSS variables in `globals.css` for theming
- Use `cn()` utility from `lib/utils.ts` for conditional classes
- Color palette: `zinc-100` through `zinc-900`

---

## Git Commits

Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`

Group commits by theme/category, not individual file changes.

---

## Pre-commit Checklist

1. `npm run lint` - Fix all linting errors
2. `npm run build` - Verify build succeeds
3. `npx prisma generate` - Generate Prisma client

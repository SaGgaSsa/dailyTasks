# Daily Tasks – AI Development Rules

## Context

Next.js 16 + TypeScript (strict) + Prisma + PostgreSQL
Tailwind v4 + Radix UI + dnd-kit
Authentication: NextAuth v5
All commands run from `/daily-tasks` directory

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
npx eslint <file>             # Lint specific file
npx eslint --fix <file>       # Auto-fix linting issues

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

## Code Discipline

- Respect existing architecture.
- Follow current naming conventions exactly.
- Keep changes minimal and scoped.
- Prefer extending existing components over creating new ones.
- No speculative improvements.

---

## TypeScript Rules

- Strict mode enabled throughout.
- Use `interface` for object shapes, `type` for unions/intersections.
- Use `Readonly<T>` for immutable data.
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
| React props | camelCase | `onOpenChange`, `initialData` |
| Types/Interfaces | PascalCase | `IncidenceWithDetails` |
| Enums | PascalCase | `TaskStatus.BACKLOG` |

---

## Server Action Pattern

All server-side mutations use `'use server'`:

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

**Required for all mutations:**
- try/catch block
- Handle Prisma P2002 unique constraint violations
- Call `revalidatePath()` when data changes
- Return `{ success: boolean, error?: string, data?: T }`

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

## Forms and Sheets (FormSheet)

**ALWAYS use** `FormSheet` from `@/components/ui/form-sheet` for:
- Create/edit forms
- Detail view side panels
- Any Sheet showing structured information

### Available Components

| Component | Purpose |
|-----------|---------|
| `FormSheet` | Main wrapper with header, save/close buttons |
| `FormInput` | Labeled input with dark theme styles |
| `FormSelect` | Labeled select dropdown |
| `FormTextarea` | Labeled textarea |
| `FormRow` | Two-column grid |
| `FormRow3` | Three-column grid |
| `FormField` | Generic label + children container |

### Required Structure

```tsx
export function MyForm({ open, onOpenChange, initialData }: MyFormProps) {
    const [isSaving, setIsSaving] = useState(false)
    const isEditMode = !!initialData

    const handleSave = async () => {
        // ... save logic
        return true // or false if failed
    }

    const handleClose = () => onOpenChange(false)

    return (
        <FormSheet
            open={open}
            onOpenChange={onOpenChange}
            title={isEditMode ? 'Editar Registro' : 'Nuevo Registro'}
            isEditMode={isEditMode}
            isSaving={isSaving}
            onSave={handleSave}
            onClose={handleClose}
        >
            <FormRow>
                <FormInput
                    id="name"
                    label="Nombre"
                    value={formData.name}
                    onChange={(e) => updateFormData({ name: e.target.value })}
                />
                <FormSelect
                    id="status"
                    label="Estado"
                    value={formData.status}
                    onValueChange={(val) => updateFormData({ status: val })}
                    options={[
                        { value: 'ACTIVE', label: 'Activo' },
                        { value: 'INACTIVE', label: 'Inactivo' },
                    ]}
                />
            </FormRow>
        </FormSheet>
    )
}
```

---

## Database (Prisma)

- Models: `User`, `Incidence`, `Assignment`, `SubTask`
- Use `@map("table_name")` for snake_case columns
- Singleton client in `lib/db.ts` - import as `import { db } from '@/lib/db'`
- Enums defined in Prisma schema match `types/enums.ts` exactly

---

## Authentication (NextAuth v5)

- Config in `auth.config.ts`
- JWT session strategy
- Extended session: `{ id, email, username, role, avatarUrl }`
- Use `bcryptjs` for password hashing

---

## Tailwind CSS v4

- Dark theme default (`dark` class on html)
- CSS variables in `globals.css` for theming
- Use `cn()` utility from `lib/utils.ts` for conditional classes
- Color palette: `zinc-100` through `zinc-900` for dark UI

---

## Output Format

When modifying code:

1. Explain briefly what will change (1-2 sentences).
2. Show only the necessary diff.
3. Do not include unchanged code or file reprints.

---

## Git Commits (When Requested)

Use Conventional Commits format:
- `feat:` new features
- `fix:` bug fixes
- `refactor:` code cleanup
- `style:` formatting/UI changes
- `docs:` documentation
- `chore:` config/dependencies

**Group commits by theme/category** - not individual file changes.

---

## Enums Reference

```typescript
// types/enums.ts - must match Prisma schema
TaskStatus: BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE
TaskType: I_MODAPL, I_CASO, I_CONS
TechStack: SISA, WEB, ANDROID, ANGULAR, SPRING
Priority: LOW, MEDIUM, HIGH
UserRole: ADMIN, DEV
```

---

## Pre-commit Checklist

1. `npm run lint` - Fix all linting errors
2. `npm run build` - Verify build succeeds
3. Docker running: `docker-compose up -d` (if available)
4. Prisma client generated: `npx prisma generate`

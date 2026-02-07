# AGENTS.md - Daily Tasks Development Guide

This document provides guidelines for AI agents working on the Daily Tasks codebase.

## Project Overview

Daily Tasks is a Next.js 16 application with PostgreSQL database, featuring task/incidence management similar to Jira/Notion. Stack includes TypeScript, NextAuth.js, Prisma ORM, Tailwind CSS v4, and Radix UI components.

## Build, Lint, and Test Commands

All commands run from the `daily-tasks` directory.

### Development

```bash
cd daily-tasks
npm run dev          # Start development server (port 3000)
npm run build        # Generate Prisma client + Next.js build
npm run start        # Start production server
npm run seed        # Seed database with initial data
```

### Linting

```bash
npm run lint         # Run ESLint on entire codebase
npx eslint <file>   # Lint specific file
npx eslint --fix    # Auto-fix linting issues
```

### Database

```bash
npx prisma generate        # Generate Prisma client (run before build)
npx prisma db push         # Push schema changes to database
npx prisma studio          # Open Prisma GUI (port 5555)
npx prisma migrate dev     # Run migrations
```

### Docker

```bash
docker-compose up -d       # Start PostgreSQL database
docker-compose stop        # Stop containers, keep data
docker-compose down        # Remove containers
docker-compose logs postgres  # View database logs
```

### Single Test Pattern

This project doesn't have dedicated test files. When adding tests:

```bash
# Jest example pattern
npm test -- --testNamePattern="user action"
npm test -- filename.test.ts
```

Add test commands to `package.json` when creating test files.

## Code Style Guidelines

### TypeScript

- Use strict mode (`"strict": true` in tsconfig.json)
- Avoid `any` type; use explicit types or `unknown` with proper type guards
- Use interface for object shapes, type for unions/intersections
- Use `Readonly<T>` for immutable data structures
- Export types/functions explicitly for public APIs

### Imports and Organization

- Use import alias `@/*` for absolute imports (e.g., `@/lib/utils`)
- Order imports: external packages → absolute imports (@/*) → relative imports
- Use named exports for utilities, components, and types
- Barrel exports (`index.ts`) allowed for public APIs

```typescript
// Correct import order
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { UserForm } from './user-form'
```

### Naming Conventions

| Pattern | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `UserTable`, `TaskCard` |
| Files (components) | PascalCase | `UserTable.tsx` |
| Directories | kebab-case | `components/ui/`, `app/actions/` |
| Functions/variables | camelCase | `getUsers()`, `isLoading` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Enums | PascalCase values | `TaskStatus.TODO` |
| Database fields | snake_case | `created_at`, `user_id` |
| React props | camelCase | `onOpenChange`, `initialData` |

### Enums and Types

Enums are defined in `types/enums.ts` for application-wide use:

```typescript
// types/enums.ts
export enum TaskStatus {
  BACKLOG = "BACKLOG",
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  REVIEW = "REVIEW",
  DONE = "DONE",
}

export enum UserRole {
  ADMIN = "ADMIN",
  DEV = "DEV",
}
```

### Server Actions

Use `'use server'` directive for all server-side operations:

```typescript
'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function createUser(data: UserData) {
  try {
    const result = await db.user.create({ data })
    revalidatePath('/dashboard/users')
    return { success: true, data: result }
  } catch (error) {
    console.error('Error creating user:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
```

### Error Handling

- Server actions: Wrap in try-catch, return `{ success: boolean, error?: string, data?: T }`
- Client components: Use error boundaries, display toast notifications via `sonner`
- Never expose stack traces to client; log errors server-side with context
- Validate inputs early, throw descriptive errors

### Components

#### Client Components

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function UserForm({ onSubmit }: UserFormProps) {
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    await onSubmit(formData)
    setIsPending(false)
  }

  return (
    <form action={handleSubmit}>
      <Button disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </Button>
    </form>
  )
}
```

#### UI Components (shadcn/ui-style)

Use `class-variance-authority` for component variants:

```typescript
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive...",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)
```

### Database (Prisma)

- Models use snake_case for columns (via `@map`)
- Enums defined in schema.prisma match TypeScript enums
- Always use Prisma adapter for PostgreSQL (`@prisma/adapter-pg`)
- Singleton pattern for PrismaClient in `lib/db.ts`
- Never use Prisma on client-side

```typescript
// lib/db.ts - already configured correctly
export const db = prisma  // Singleton instance
```

### Authentication (NextAuth.js)

- Configuration in `auth.config.ts`
- Credentials provider with bcrypt password hashing
- JWT session strategy
- Extend session type for custom user fields:

```typescript
// auth.ts
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      username: string
      role: string
      avatarUrl?: string | null
    }
  }
}
```

### Tailwind CSS

- Default dark theme (`dark` class on html element)
- Use CSS variables defined in `globals.css`
- Utility classes with `cn()` for conditional classes
- `twMerge` handles class conflicts via `clsx`

### File Structure

```
daily-tasks/
├── app/                    # Next.js App Router
│   ├── actions/           # Server actions
│   ├── api/              # API routes
│   ├── dashboard/        # Protected routes
│   └── layout.tsx        # Root layout
├── components/
│   ├── ui/               # Base UI components (Button, Sheet, etc.)
│   ├── users/            # Feature components
│   └── theme-*.tsx       # Theme providers
├── lib/
│   ├── db.ts             # Prisma client singleton
│   └── utils.ts          # cn() utility
├── types/
│   ├── enums.ts          # Application enums
│   └── index.ts          # Shared types
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seeder
└── *.config.ts           # ESLint, TypeScript, Next.js configs
```

### Spanish Language

- User-facing text in Spanish: "Guardar", "Eliminar", "Usuario creado correctamente"
- Comments can be in Spanish or English; be consistent within a file
- Error messages in Spanish for user feedback

### Common Patterns

1. **Sheet/Dialog patterns**: `open`, `onOpenChange` props
2. **Data fetching**: Server actions → client components with `initialData`
3. **Optimistic updates**: Use `useOptimistic` or immediate revalidation
4. **Form handling**: Server actions with FormData or typed objects
5. **Revalidation**: `revalidatePath()` after mutations

### Important Notes

- Database requires Docker Compose running (`docker-compose up -d`)
- Prisma client must be generated before building (`npx prisma generate`)
- Environment variables: DATABASE_URL, NEXTAUTH_SECRET, etc. in `.env`
- Run `npm run lint` before committing code
- Use `npm run build` to verify type safety and build correctness

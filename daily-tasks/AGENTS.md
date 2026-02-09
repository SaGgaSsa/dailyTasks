# Daily Tasks – AI Development Rules

## Context

Next.js 16 + TypeScript (strict) + Prisma + PostgreSQL  
Tailwind v4 + Radix UI + dnd-kit  
Authentication: NextAuth v5  
All commands run from /daily-tasks

---

## Core Rules (MANDATORY)

1. Never use `any`.
2. All mutations must use `'use server'`.
3. Never use Prisma on client-side.
4. UI text must be in Spanish.
5. All forms MUST use `FormSheet` from `@/components/ui/form-sheet`.
6. Return pattern for server actions:

   `{ success: boolean, error?: string, data?: T }`

7. Do NOT reprint full files unless explicitly requested.
8. Show minimal diffs only.
9. Do not modify unrelated files.
10. Do not refactor unless explicitly requested.

---

## Code Discipline

- Respect existing architecture.
- Follow current naming conventions.
- Keep changes minimal and scoped.
- Prefer extending existing components over creating new ones.
- No speculative improvements.

---

## Server Action Pattern

Always:

- try/catch
- handle Prisma P2002
- call revalidatePath when needed
- return structured result object

---

## Output Format

When modifying code:

1. Explain briefly what will change.
2. Show only the necessary diff.
3. Do not include unchanged code.

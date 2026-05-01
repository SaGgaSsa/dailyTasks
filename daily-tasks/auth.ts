import { authConfig } from './auth.config'
import { UserRole } from '@prisma/client'
import NextAuth from 'next-auth'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      email: string
      name: string
      username: string
      role: UserRole
      mustChangePassword: boolean
    }
  }

  interface User {
    id: string
    email: string
    name: string
    username: string
    role: UserRole
    mustChangePassword: boolean
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string
    email?: string
    username?: string
    role?: UserRole
    mustChangePassword?: boolean
  }
}

export { authConfig }
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

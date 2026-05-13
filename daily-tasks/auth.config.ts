import bcrypt from 'bcryptjs'
import type { NextAuthConfig } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { UserRole } from '@prisma/client'
import { db } from './lib/db'
import { isPublicPath } from './lib/auth-route-policy'
import { isExternalApiPath } from './lib/external-api'

interface AuthUser {
  id: string
  email: string
  name: string
  username: string
  role: UserRole
  mustChangePassword: boolean
}

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña son requeridos')
        }

        const email = credentials.email as string

        const user = await db.user.findFirst({
          where: { email }
        })

        if (!user) {
          throw new Error('Credenciales inválidas')
        }

        if (!user.isEnabled) {
          throw new Error('Usuario inactivo')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password as string, user.password)

        if (!isPasswordValid) {
          throw new Error('Credenciales inválidas')
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name || '',
          username: user.username,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        } as AuthUser
      }
    }),
  ],
  session: {
    strategy: 'jwt' as const
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login'
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.username = user.username
        token.role = user.role
        token.mustChangePassword = user.mustChangePassword
      }

      if (trigger === 'update') {
        const updatedSession = session as { mustChangePassword?: unknown } | undefined
        if (typeof updatedSession?.mustChangePassword === 'boolean') {
          token.mustChangePassword = updatedSession.mustChangePassword
        }
      }
      return token
    },
    async session({ session, token }) {
      const tokenUserId = typeof token.id === 'string' ? Number(token.id) : NaN
      if (!Number.isInteger(tokenUserId) || tokenUserId <= 0) {
        return { ...session, user: undefined as never }
      }

      const activeUser = await db.user.findUnique({
        where: { id: tokenUserId },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          mustChangePassword: true,
          isEnabled: true,
        },
      })

      if (!activeUser?.isEnabled) {
        return { ...session, user: undefined as never }
      }

      if (session.user) {
        session.user.id = String(activeUser.id)
        session.user.email = activeUser.email
        session.user.name = activeUser.name ?? ''
        session.user.username = activeUser.username
        session.user.role = activeUser.role
        session.user.mustChangePassword = activeUser.mustChangePassword
      }

      return session
    },
    async authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname

      if (isExternalApiPath(pathname)) {
        return true
      }

      if (isPublicPath(pathname)) {
        return true
      }

      return !!auth?.user
    }
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
}

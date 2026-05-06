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
      if (session.user) {
        session.user.id = typeof token.id === 'string' ? token.id : ''
        session.user.email = typeof token.email === 'string' ? token.email : ''
        session.user.name = typeof token.name === 'string' ? token.name : ''
        session.user.username = typeof token.username === 'string' ? token.username : ''
        session.user.role = token.role === UserRole.ADMIN || token.role === UserRole.DEV || token.role === UserRole.QA
          ? token.role
          : UserRole.DEV
        session.user.mustChangePassword = typeof token.mustChangePassword === 'boolean'
          ? token.mustChangePassword
          : false
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

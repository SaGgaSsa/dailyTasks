import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from './lib/db'

interface AuthUser {
  id: string
  email: string
  name: string
  username: string
  role: string
  avatarUrl: string | null
  image: string | null
}

export const authConfig = {
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

        const identifier = credentials.email as string

        const user = await db.user.findFirst({
          where: {
            OR: [
              { email: identifier },
              { username: identifier.toUpperCase() }
            ]
          }
        })

        if (!user) {
          throw new Error('Credenciales inválidas')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password as string, user.password)

        if (!isPasswordValid) {
          throw new Error('Credenciales inválidas')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || '',
          username: user.username,
          role: user.role,
          avatarUrl: user.avatarUrl,
          image: user.avatarUrl
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
    async jwt({ token, user }: { token: Record<string, unknown>; user?: AuthUser }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.username = user.username
        token.role = user.role
        token.avatarUrl = user.avatarUrl
      }
      return token
    },
    async session({ session, token }: { session: Record<string, unknown>; token: Record<string, unknown> }) {
      if (token) {
        session.user = {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string,
          username: token.username as string,
          role: token.role as string,
          avatarUrl: token.avatarUrl as string | null,
          image: token.avatarUrl as string | null,
        }
      }
      return session
    },
    async authorized({ auth, request }: { auth: { user: AuthUser } | null; request: { nextUrl: URL } }) {
      const pathname = request.nextUrl.pathname

      if (pathname.startsWith('/auth') || pathname.startsWith('/api')) {
        return true
      }

      return !!auth?.user
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig as any)

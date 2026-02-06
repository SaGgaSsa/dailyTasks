import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from './lib/db'

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
          role: user.role
        } as any
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
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.username = user.username
        token.role = user.role
      }
      return token
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.username = token.username as string
        session.user.role = token.role as string
      }
      return session
    },
    async authorized({ auth, request }: any) {
      const { pathname } = request.nextUrl

      // Permitir acceso a rutas de auth y API pública
      if (pathname.startsWith('/auth') || pathname.startsWith('/api')) {
        return true
      }

      // Para rutas protegidas, verificar autenticación
      return !!auth?.user
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

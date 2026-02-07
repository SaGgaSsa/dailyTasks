import { authConfig } from './auth.config'
import NextAuth from 'next-auth'

// Extender la interfaz de sesión para incluir username
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      username: string
      role: string
      avatarUrl?: string | null
      image?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name: string
    username: string
    role: string
    avatarUrl?: string | null
    image?: string | null
  }
}

export { authConfig }
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig as any)

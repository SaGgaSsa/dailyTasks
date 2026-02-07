import { authConfig } from './auth.config'
import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      username: string
      role: string
    }
  }

  interface User {
    id: number
    email: string
    name: string
    username: string
    role: string
  }
}

export { authConfig }
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig as any)

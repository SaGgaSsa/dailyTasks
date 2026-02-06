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
    }
  }
  
  interface User {
    id: string
    email: string
    name: string
    username: string
    role: string
  }
}

export { authConfig }
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

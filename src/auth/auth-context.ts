import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type AuthState = {
  status: 'loading' | 'signedIn' | 'signedOut'
  session: Session | null
  email: string | null
  /** True after opening a password-reset email link in this tab, until a new password is saved or skipped. */
  recovering: boolean
  finishRecovery: () => void
  /** True when the app could not reach Supabase while starting, so "signed out" may not be the real state. */
  unreachable: boolean
  dismissUnreachable: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}

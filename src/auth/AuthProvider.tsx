import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { clearRecoveryPending, recoveryPending, supabase } from '../lib/supabase'
import { AuthContext, type AuthState } from './auth-context'

/**
 * Keeps track of whether Greg is signed in, for the whole app.
 *
 * `status` starts as "loading" and only becomes "signedIn" once Supabase reports a
 * session. Nothing behind the login is drawn in any other state (see AuthGate in App.tsx).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(supabase !== null)
  const [recovering, setRecovering] = useState(recoveryPending)
  const [unreachable, setUnreachable] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let active = true

    // Fires once straight away with the saved session (or none), then on every change.
    // Keep this callback synchronous and free of Supabase calls: awaiting one here can deadlock.
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      // "No session" at start-up can mean signed out OR that Supabase could not be reached to
      // renew the sign-in. The direct question below can tell the two apart, so let it decide.
      if (event === 'INITIAL_SESSION' && !nextSession) return
      // Whether a new password is still owed is decided in lib/supabase.ts (this tab's own
      // address, confirmed by Supabase). Re-read it on every change so the two stay in step.
      setRecovering(recoveryPending())
      setSession(nextSession)
      if (nextSession) setUnreachable(false)
      setLoading(false)
    })

    // Belt and braces: if that first event is slow or never arrives, ask directly.
    supabase.auth
      .getSession()
      .then(({ data: current, error }) => {
        if (!active) return
        setSession((existing) => existing ?? current.session)
        setRecovering(recoveryPending())
        // An error here means Supabase could not be reached to renew the sign-in, so the
        // person may well still be signed in. Say so instead of showing a bare login form.
        if (error && !current.session) setUnreachable(true)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setUnreachable(true)
        setLoading(false)
      })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const finishRecovery = useCallback(() => {
    clearRecoveryPending()
    setRecovering(false)
  }, [])

  const dismissUnreachable = useCallback(() => setUnreachable(false), [])

  const value = useMemo<AuthState>(() => {
    const status = loading ? 'loading' : session ? 'signedIn' : 'signedOut'
    return {
      status,
      session,
      email: session?.user.email ?? null,
      recovering,
      finishRecovery,
      unreachable: unreachable && !session,
      dismissUnreachable,
    }
  }, [loading, session, recovering, finishRecovery, unreachable, dismissUnreachable])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

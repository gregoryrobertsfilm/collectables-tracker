import { useState, type FormEvent } from 'react'
import { friendlyAuthError } from '../auth/messages'
import { Button, Field, FullScreenMessage, Logo, Notice } from '../components/ui'
import { isInstalledToHomeScreen } from '../lib/device'
import { emailLinkProblem, supabase } from '../lib/supabase'

/**
 * The only screen anyone sees without signing in.
 * There is deliberately no "create account" option: the single account is made in Supabase.
 */
export function Login() {
  const [mode, setMode] = useState<'signIn' | 'forgot'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(emailLinkProblem)
  const [sent, setSent] = useState(false)

  async function signIn(event: FormEvent) {
    event.preventDefault()
    if (!supabase || busy) return
    setBusy(true)
    setError(null)
    const { error: problem } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    // On success the AuthProvider notices the new session and the app appears.
    if (problem) {
      setError(friendlyAuthError(problem))
      setBusy(false)
    }
  }

  async function sendReset(event: FormEvent) {
    event.preventDefault()
    if (!supabase || busy) return
    setBusy(true)
    setError(null)
    const { error: problem } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    setBusy(false)
    if (problem) setError(friendlyAuthError(problem))
    else setSent(true)
  }

  function switchMode(next: 'signIn' | 'forgot') {
    setMode(next)
    setError(null)
    setSent(false)
  }

  return (
    <FullScreenMessage>
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo size={56} />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Collectables Tracker</h1>
        <p className="mt-1 text-ink-2">{mode === 'signIn' ? 'Sign in to continue.' : 'Reset your password.'}</p>
      </div>

      {mode === 'signIn' ? (
        <form onSubmit={signIn} className="space-y-4">
          <Field
            label="Email"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <Notice tone="bad">{error}</Notice> : null}
          <Button type="submit" busy={busy} className="w-full">
            Sign in
          </Button>
          <div className="text-center">
            <Button type="button" variant="quiet" onClick={() => switchMode('forgot')}>
              Forgot password?
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={sendReset} className="space-y-4">
          <Field
            label="Email"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error ? <Notice tone="bad">{error}</Notice> : null}
          {sent ? (
            <Notice tone="good">
              If that is the account’s email, a reset link is on its way.{' '}
              {isInstalledToHomeScreen()
                ? 'The link opens in Safari. Choose a new password there, then come back to this app and sign in with it.'
                : 'Open it on this device.'}
            </Notice>
          ) : null}
          <Button type="submit" busy={busy} className="w-full">
            Email me a reset link
          </Button>
          <div className="text-center">
            <Button type="button" variant="quiet" onClick={() => switchMode('signIn')}>
              Back to sign in
            </Button>
          </div>
        </form>
      )}
    </FullScreenMessage>
  )
}

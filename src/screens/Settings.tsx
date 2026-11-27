import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/auth-context'
import { friendlyAuthError } from '../auth/messages'
import { Button, Card, Notice } from '../components/ui'
import { supabase } from '../lib/supabase'

/** Settings. Only "My account" exists so far; the other settings arrive with the features they control. */
export function Settings() {
  const { email } = useAuth()
  const [busy, setBusy] = useState<'here' | 'everywhere' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function signOut(scope: 'local' | 'global') {
    if (!supabase || busy) return
    setBusy(scope === 'local' ? 'here' : 'everywhere')
    setError(null)
    const { error: problem } = await supabase.auth.signOut({ scope })
    // On success the AuthProvider notices and the login screen appears.
    if (problem) {
      setError(friendlyAuthError(problem))
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Card>
        <h2 className="font-semibold">My account</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-ink-3">Signed in as</dt>
            <dd className="break-all text-base text-ink">{email ?? 'Unknown'}</dd>
          </div>
        </dl>
        {error ? (
          <div className="mt-3">
            <Notice tone="bad">{error}</Notice>
          </div>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" busy={busy === 'here'} disabled={busy !== null} onClick={() => signOut('local')}>
            Sign out on this device
          </Button>
          <Button variant="secondary" busy={busy === 'everywhere'} disabled={busy !== null} onClick={() => signOut('global')}>
            Sign out everywhere
          </Button>
        </div>
        <p className="mt-3 text-sm text-ink-3">
          “Sign out everywhere” is for a lost phone. Other devices are signed out within the hour. Then set a new
          password with “Forgot password?” on the sign-in screen.
        </p>
      </Card>

      <Card>
        <h2 className="font-semibold">Your data</h2>
        <ul className="mt-2 divide-y divide-line">
          <li>
            <Link to="/import" className="flex min-h-12 items-center justify-between font-medium text-accent">
              Import a spreadsheet <span aria-hidden="true">›</span>
            </Link>
          </li>
          <li>
            <Link to="/check" className="flex min-h-12 items-center justify-between font-medium text-accent">
              Starting data check <span aria-hidden="true">›</span>
            </Link>
          </li>
        </ul>
      </Card>

      <p className="text-center text-sm text-ink-3">
        Version {__APP_VERSION__} · build {__BUILD_ID__}
      </p>
    </div>
  )
}

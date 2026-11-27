import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/auth-context'
import { friendlyAuthError } from '../auth/messages'
import { Button, Field, FullScreenMessage, Logo, Notice } from '../components/ui'
import { supabase } from '../lib/supabase'

export const MIN_PASSWORD_LENGTH = 10

/** Shown after opening a password-reset email link, before anything else in the app. */
export function SetNewPassword() {
  const { email, finishRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!supabase || busy) return
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    setBusy(true)
    setError(null)
    const { error: problem } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (problem) setError(friendlyAuthError(problem))
    else setSaved(true)
  }

  if (saved) {
    return (
      <FullScreenMessage>
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={56} />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Password saved</h1>
        </div>
        <Notice tone="good">
          Your new password is saved. If you use the app from your iPhone home screen, go back to it and sign in
          there with the new password. Other devices will ask you to sign in again.
        </Notice>
        <Button className="mt-4 w-full" onClick={finishRecovery}>
          Continue
        </Button>
      </FullScreenMessage>
    )
  }

  return (
    <FullScreenMessage>
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo size={56} />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Choose a new password</h1>
        <p className="mt-1 text-ink-2">Let your phone or computer suggest and save a strong one.</p>
      </div>
      <form onSubmit={save} className="space-y-4">
        {/* Read-only, so the password manager saves the new password against the right account. */}
        <Field label="Email" type="email" name="email" autoComplete="username" readOnly value={email ?? ''} />
        <Field
          label="New password"
          type="password"
          name="new-password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <Notice tone="bad">{error}</Notice> : null}
        <Button type="submit" busy={busy} className="w-full">
          Save password
        </Button>
        <div className="text-center">
          {/* A way out, so nobody can be stuck on this screen. The email link already signed them in. */}
          <Button type="button" variant="quiet" onClick={finishRecovery}>
            Not now
          </Button>
        </div>
      </form>
    </FullScreenMessage>
  )
}

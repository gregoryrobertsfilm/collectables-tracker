import { useAuth } from '../auth/auth-context'
import { Card } from '../components/ui'
import { isInstalledToHomeScreen } from '../lib/device'

/** Stage 2 home screen: proves the login works. Reminders, money and quick buttons arrive in stage 6. */
export function Home() {
  const { email } = useAuth()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Home</h1>
        {email ? <p className="mt-1 break-words text-ink-2">Signed in as {email}</p> : null}
      </div>

      <Card>
        <h2 className="font-semibold">Nothing here yet</h2>
        <p className="mt-1 text-ink-2">
          Nothing is stored here yet. Your figures, copies, listings and sales are loaded in the next stage.
        </p>
      </Card>

      {isInstalledToHomeScreen() ? null : (
        <Card>
          <h2 className="font-semibold">Put it on your iPhone home screen</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-2">
            <li>Open this page in Safari on your iPhone.</li>
            <li>Tap the Share button (in the page menu if you don’t see it).</li>
            <li>Tap “Add to Home Screen”.</li>
            <li>Leave “Open as Web App” switched on, then tap “Add”.</li>
          </ol>
          <p className="mt-2 text-sm text-ink-3">
            You’ll sign in once more inside the home-screen app. After that it stays signed in.
          </p>
        </Card>
      )}
    </div>
  )
}

import { Link } from 'react-router'
import { useAuth } from '../auth/auth-context'
import { Button, Card, Notice, Spinner } from '../components/ui'
import { useSnapshot } from '../data/useSnapshot'
import { isInstalledToHomeScreen } from '../lib/device'

/**
 * Home. For now: the headline counts, straight from the database.
 * Reminders, this month's money and the quick buttons arrive in stage 6.
 */
export function Home() {
  const { email } = useAuth()
  const { state, reload } = useSnapshot()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Home</h1>
        {email ? <p className="mt-1 break-words text-ink-2">Signed in as {email}</p> : null}
      </div>

      {state.status === 'loading' ? (
        <div className="flex items-center gap-2 text-ink-2" role="status">
          <Spinner /> Loading your collection…
        </div>
      ) : null}

      {state.status === 'error' ? (
        <>
          <Notice tone="bad">{state.message}</Notice>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </>
      ) : null}

      {state.status === 'ready' && state.isEmpty ? (
        <Card>
          <h2 className="font-semibold">Nothing here yet</h2>
          <p className="mt-1 text-ink-2">Load your starting spreadsheet to fill the app with your figures, copies, listings and sales.</p>
          <Link
            to="/import"
            className="mt-3 inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-4 text-base font-semibold text-accent-ink"
          >
            Import a spreadsheet
          </Link>
        </Card>
      ) : null}

      {state.status === 'ready' && !state.isEmpty ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Tile label="Copies you own" value={state.stats.copiesOwned} />
            <Tile label="For sale" value={state.stats.forSale} />
            <Tile label="Greg’s collection" value={state.stats.gregs} />
            <Tile label="Kaitlyn’s collection" value={state.stats.kaitlyns} />
            <Tile label="Units on a live listing" value={state.stats.listedUnits} />
            <Tile label="For sale, not listed" value={state.stats.forSaleNotListed} />
          </div>
          <Card>
            <h2 className="font-semibold">More is coming</h2>
            <p className="mt-1 text-ink-2">
              Your data is loaded. Searching and browsing your figures arrives in the next stage.
            </p>
            <Link to="/check" className="mt-2 inline-flex min-h-11 items-center font-semibold text-accent">
              See the starting data check
            </Link>
          </Card>
        </>
      ) : null}

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

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-3xl font-bold tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-ink-2">{label}</p>
    </div>
  )
}

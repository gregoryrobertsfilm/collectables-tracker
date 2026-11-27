import { Link } from 'react-router'
import { Button, Card, Notice, Spinner } from '../components/ui'
import { useSnapshot } from '../data/useSnapshot'
import { startingDataChecks } from '../lib/import/checks'

/**
 * "Prove it worked" (brief, section 10): each number the starting spreadsheet should
 * produce, next to what the app counts from the database right now.
 */
export function DataCheck() {
  const { state, reload } = useSnapshot()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Starting data check</h1>
        <p className="mt-1 text-ink-2">
          Each number your starting spreadsheet should produce, next to what the app counts in your database right
          now.
        </p>
      </div>

      {state.status === 'loading' ? (
        <div className="flex items-center gap-2 text-ink-2" role="status">
          <Spinner /> Counting…
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
          <h2 className="font-semibold">Nothing loaded yet</h2>
          <p className="mt-1 text-ink-2">Import your starting spreadsheet first, then come back here.</p>
          <Link
            to="/import"
            className="mt-3 inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-4 text-base font-semibold text-accent-ink"
          >
            Import a spreadsheet
          </Link>
        </Card>
      ) : null}

      {state.status === 'ready' && !state.isEmpty ? <Results rows={startingDataChecks(state.stats)} onRecount={reload} /> : null}
    </div>
  )
}

function Results({ rows, onRecount }: { rows: ReturnType<typeof startingDataChecks>; onRecount: () => void }) {
  const wrong = rows.filter((row) => !row.ok).length
  return (
    <>
      {wrong === 0 ? (
        <Notice tone="good">All {rows.length} checks match.</Notice>
      ) : (
        <Notice tone="bad">
          {wrong} of {rows.length} checks do not match. They are marked below.
        </Notice>
      )}
      <Card className="p-0!">
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.label} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{row.label}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${row.ok ? 'bg-good-soft text-good' : 'bg-bad-soft text-bad'}`}
                >
                  {row.ok ? 'Match' : 'Different'}
                </span>
              </div>
              <dl className="mt-1 grid grid-cols-2 gap-x-4 text-sm">
                <div>
                  <dt className="text-ink-3">Expected</dt>
                  <dd className="tabular-nums">{row.expected}</dd>
                </div>
                <div>
                  <dt className="text-ink-3">In the app</dt>
                  <dd className={`tabular-nums ${row.ok ? '' : 'font-bold text-bad'}`}>{row.actual}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </Card>
      <p className="text-sm text-ink-3">
        These expected numbers describe your starting spreadsheet. Once you start adding, selling and listing, the app’s
        numbers will move on and this page will no longer match. That is normal.
      </p>
      <Button variant="secondary" onClick={onRecount}>
        Count again
      </Button>
    </>
  )
}

import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router'
import { Button, Card, Notice } from '../components/ui'
import { saveImport, type ImportCounts } from '../data/inventory'
import { useSnapshot } from '../data/useSnapshot'
import { snapshotFromImport } from '../lib/import/checks'
import type { ImportData, ImportProblem } from '../lib/import/model'
import { parseWorkbook } from '../lib/import/parse'
import { ReaderUnavailableError, ReadTimeoutError, readSpreadsheetFile } from '../lib/import/read-xlsx'
import { computeStats, type Stats } from '../lib/inventory/stats'
import { formatCents } from '../lib/money'
import { supabase } from '../lib/supabase'

type Step =
  | { name: 'choose' }
  | { name: 'reading'; fileName: string }
  | { name: 'problems'; fileName: string; problems: ImportProblem[] }
  | { name: 'ready'; fileName: string; data: ImportData; stats: Stats; notes: string[] }
  | { name: 'saving'; fileName: string; data: ImportData; stats: Stats; notes: string[] }
  | { name: 'done'; counts: ImportCounts }

/**
 * Loads a spreadsheet in the same layout as Greg's starting data file.
 * Nothing is saved until "Import" is pressed, and then it is all or nothing.
 */
export function Import() {
  const { state: existing, reload } = useSnapshot()
  const [step, setStep] = useState<Step>({ name: 'choose' })
  // Where a problem happened decides where it is shown, so it is never off-screen on a phone.
  const [error, setError] = useState<{ where: 'file' | 'save'; text: string } | null>(null)
  const input = useRef<HTMLInputElement>(null)

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    setStep({ name: 'reading', fileName: file.name })
    try {
      const sheets = await readSpreadsheetFile(file)
      const result = parseWorkbook(sheets, { fileName: file.name })
      if (!result.ok) {
        setStep({ name: 'problems', fileName: file.name, problems: result.problems })
        return
      }
      setStep({
        name: 'ready',
        fileName: file.name,
        data: result.data,
        stats: computeStats(snapshotFromImport(result.data)),
        notes: result.notes,
      })
    } catch (problem) {
      setStep({ name: 'choose' })
      setError({
        where: 'file',
        text:
          problem instanceof ReaderUnavailableError
            ? 'Couldn’t load the spreadsheet reader. Check your connection, or tap “Update now” if it is showing, then try again.'
            : problem instanceof ReadTimeoutError
              ? 'Reading that file took too long and was stopped. Try again; if it keeps happening, tell Claude.'
              : 'That file could not be read. It needs to be an Excel file (.xlsx) in the same layout as your starting data.',
      })
    }
  }

  async function save() {
    if (step.name !== 'ready' || !supabase) return
    setError(null)
    setStep({ ...step, name: 'saving' })
    try {
      const counts = await saveImport(supabase, step.data)
      setStep({ name: 'done', counts })
      reload()
    } catch (problem) {
      setStep({ ...step, name: 'ready' })
      setError({ where: 'save', text: problem instanceof Error ? problem.message : 'The import failed. Nothing was changed.' })
    }
  }

  const alreadyHasData = existing.status === 'ready' && !existing.isEmpty

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import a spreadsheet</h1>
        <p className="mt-1 text-ink-2">
          Loads an Excel file in the same layout as your starting data. You see what it contains first; nothing is
          saved until you press Import.
        </p>
      </div>

      {error?.where === 'file' ? <Notice tone="bad">{error.text}</Notice> : null}

      {step.name === 'done' ? (
        <Card>
          <h2 className="font-semibold">Imported</h2>
          <p className="mt-1 text-ink-2">Everything in the file was saved.</p>
          <CountList
            rows={[
              ['Releases', step.counts.releases],
              ['Figures', step.counts.figures],
              ['Copies (owned and sold)', step.counts.copies],
              ['Listings', step.counts.listings],
              ['Sales', step.counts.sales],
            ]}
          />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              to="/check"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-4 text-base font-semibold text-accent-ink"
            >
              See the starting data check
            </Link>
            <Button variant="secondary" onClick={() => setStep({ name: 'choose' })}>
              Import another file
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <h2 className="font-semibold">1. Choose the file</h2>
          {alreadyHasData && existing.status === 'ready' ? (
            <div className="mt-2">
              <Notice tone="warn">
                Your database already holds {existing.stats.copiesOwned} copies. Importing adds to it. Records with IDs
                that are already there are refused, and then nothing at all is saved.
              </Notice>
            </div>
          ) : null}
          {/* The button below is the control; this input only opens the file picker. */}
          <input ref={input} type="file" accept=".xlsx" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={chooseFile} />
          <div className="mt-3">
            <Button
              variant={step.name === 'choose' ? 'primary' : 'secondary'}
              busy={step.name === 'reading'}
              disabled={step.name === 'saving'}
              onClick={() => input.current?.click()}
            >
              {step.name === 'choose' ? 'Choose spreadsheet' : 'Choose a different file'}
            </Button>
          </div>
          {'fileName' in step ? <p className="mt-2 break-all text-sm text-ink-2">{step.fileName}</p> : null}
        </Card>
      )}

      {step.name === 'problems' ? (
        <Card>
          <h2 className="font-semibold">This file can’t be imported yet</h2>
          <p className="mt-1 text-ink-2">
            {step.problems.length === 1 ? 'One thing needs' : `${step.problems.length} things need`} fixing in the
            spreadsheet. Nothing was saved.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {step.problems.slice(0, 50).map((problem, index) => (
              <li key={index} className="rounded-lg bg-bad-soft px-3 py-2 text-bad">
                <span className="font-semibold">
                  {problem.tab}
                  {problem.row ? `, row ${problem.row}` : ''}:
                </span>{' '}
                {problem.message}
              </li>
            ))}
          </ul>
          {step.problems.length > 50 ? <p className="mt-2 text-sm text-ink-2">…and {step.problems.length - 50} more.</p> : null}
        </Card>
      ) : null}

      {step.name === 'ready' || step.name === 'saving' ? (
        <Card>
          <h2 className="font-semibold">2. Check what’s in it</h2>
          <CountList
            rows={[
              ['Brand', step.data.brands.map((b) => b.name).join(', ')],
              ['Releases', step.data.releases.length],
              ['Figures', step.data.figures.length],
              ['Copies you own', step.stats.copiesOwned],
              ['For sale / Greg’s / Kaitlyn’s', `${step.stats.forSale} / ${step.stats.gregs} / ${step.stats.kaitlyns}`],
              ['Live listings', step.stats.liveListings],
              ['Units on a live listing', step.stats.listedUnits],
              ['For sale, not listed', step.stats.forSaleNotListed],
              ['Sales (history)', step.stats.sales],
              ['Net from those sales', formatCents(step.stats.netCents)],
            ]}
          />
          {step.notes.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-2">
              {step.notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          ) : null}
          <h2 className="mt-5 font-semibold">3. Save it</h2>
          <p className="mt-1 text-sm text-ink-2">All of it is saved together. If anything is refused, nothing is saved.</p>
          {error?.where === 'save' ? (
            <div className="mt-3">
              <Notice tone="bad">{error.text}</Notice>
            </div>
          ) : null}
          <div className="mt-3">
            <Button busy={step.name === 'saving'} onClick={save}>
              Import into my database
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

function CountList({ rows }: { rows: Array<[string, string | number | undefined]> }) {
  return (
    <dl className="mt-3 divide-y divide-line text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 py-2">
          <dt className="text-ink-2">{label}</dt>
          <dd className="text-base font-semibold tabular-nums">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

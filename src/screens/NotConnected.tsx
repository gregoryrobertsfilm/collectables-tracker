import { FullScreenMessage, Logo, Notice } from '../components/ui'

/** Shown instead of the app when the database settings are missing or wrong. Shows no data. */
export function NotConnected({ problem }: { problem: string }) {
  return (
    <FullScreenMessage>
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size={56} />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Not connected yet</h1>
        <p className="mt-1 text-ink-2">The app is running, but it has not been linked to its database.</p>
      </div>
      <Notice tone="warn">{problem}</Notice>
      <p className="mt-4 text-sm text-ink-3">
        This is a setup step, not a fault. Ask Claude Code to “connect the app to Supabase”.
      </p>
    </FullScreenMessage>
  )
}

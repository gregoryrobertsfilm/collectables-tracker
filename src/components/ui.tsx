import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

/** Small shared building blocks so every screen looks and behaves the same. */

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--color-accent)" />
      <rect x="14" y="14" width="15" height="15" rx="4" fill="var(--color-accent-ink)" />
      <rect x="35" y="14" width="15" height="15" rx="4" fill="var(--color-accent-ink)" opacity="0.55" />
      <rect x="14" y="35" width="15" height="15" rx="4" fill="var(--color-accent-ink)" opacity="0.55" />
      <rect x="35" y="35" width="15" height="15" rx="4" fill="var(--color-accent-ink)" />
    </svg>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet'
  busy?: boolean
}

export function Button({ variant = 'primary', busy = false, className = '', children, disabled, ...rest }: ButtonProps) {
  const look =
    variant === 'primary'
      ? 'bg-accent text-accent-ink hover:opacity-90'
      : variant === 'secondary'
        ? 'bg-surface text-ink border border-line hover:bg-surface-2'
        : 'text-accent hover:bg-accent-soft'
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${look} ${className}`}
    >
      {busy ? <Spinner /> : null}
      {children}
    </button>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }

export function Field({ label, hint, id, className = '', ...rest }: FieldProps) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-ink-2">
        {label}
      </label>
      <input
        id={fieldId}
        aria-describedby={hint ? `${fieldId}-hint` : undefined}
        {...rest}
        className="block min-h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      {hint ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-sm text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function Notice({ tone, children }: { tone: 'bad' | 'good' | 'warn' | 'info'; children: ReactNode }) {
  const look = {
    bad: 'bg-bad-soft text-bad',
    good: 'bg-good-soft text-good',
    warn: 'bg-warn-soft text-warn',
    info: 'bg-accent-soft text-accent',
  }[tone]
  return (
    <div role={tone === 'bad' ? 'alert' : 'status'} className={`rounded-xl px-3.5 py-3 text-sm font-medium ${look}`}>
      {children}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface p-4 ${className}`}>{children}</section>
}

export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  )
}

export function FullScreenMessage({ children }: { children: ReactNode }) {
  return (
    <main className="pt-safe pb-safe px-safe flex flex-1 items-center justify-center py-6">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  )
}

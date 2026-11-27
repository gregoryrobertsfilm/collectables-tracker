import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readSupabaseConfig } from './config'

// Only these two named values are read, so nothing else from the settings can end up in the app.
const result = readSupabaseConfig({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
})

/** Plain-language reason the app cannot reach the database, or null when all is well. */
export const configProblem: string | null = result.ok ? null : result.problem

const hashAtStart = typeof window === 'undefined' ? '' : window.location.hash
const queryAtStart = typeof window === 'undefined' ? '' : window.location.search

/**
 * True when the app was opened from a "reset your password" email link.
 *
 * This is read from the address BEFORE the database connection is created, because
 * Supabase removes the link's details from the address as soon as it has used them.
 * It is provisional: it is cancelled below if Supabase does not accept the link.
 *
 * Only this browser tab's own address counts. Supabase also announces a recovery to every
 * other open tab, and those tabs must not switch to the "choose a new password" screen.
 */
let openedFromRecoveryLink = isRecoveryAddress(hashAtStart)

let linkProblem: string | null = emailLinkProblemFrom(`${hashAtStart}&${queryAtStart}`)

// A failed link leaves "error=…" in the address. Remove it so the message is not shown
// again every time the page is reloaded.
if (linkProblem && typeof window !== 'undefined') {
  window.history.replaceState(null, '', window.location.pathname)
}

/**
 * Whether an address fragment (the part after #) is a Supabase password-recovery email link.
 * A real link carries a one-time sign-in token as well as type=recovery. Without the token,
 * "type=recovery" is just text anyone could type, and must not change what the app shows.
 */
export function isRecoveryAddress(hash: string): boolean {
  if (!hash.startsWith('#')) return false
  if (hasParam(hash, 'error') || hasParam(hash, 'error_code')) return false
  if (!hasParam(hash, 'access_token')) return false
  return /(^|[#&])type=recovery(&|$)/.test(hash)
}

/** Explains a failed email link. Supabase reports failures as error=… in the address. */
export function emailLinkProblemFrom(hashAndQuery: string): string | null {
  if (!hasParam(hashAndQuery, 'error') && !hasParam(hashAndQuery, 'error_code')) return null
  return 'That email link has expired or was already used. Ask for a new one with “Forgot password?”.'
}

function hasParam(text: string, name: string): boolean {
  return new RegExp(`(^|[#?&])${name}=`).test(text)
}

/** The message about a failed email link, until the next successful sign-in clears it. */
export function emailLinkProblem(): string | null {
  return linkProblem
}

/**
 * The one connection to the database, shared by the whole app.
 * It is null only when the settings are missing, in which case the app shows a setup screen.
 */
export const supabase: SupabaseClient | null = result.ok
  ? createClient(result.config.url, result.config.publishableKey, {
      auth: {
        // Stay signed in on this device until "Sign out" is tapped.
        persistSession: true,
        autoRefreshToken: true,
        // Needed for the password-reset link that Supabase emails.
        detectSessionInUrl: true,
      },
    })
  : null

// If Supabase rejected the link (for example a made-up token), this was not a recovery.
void supabase?.auth.initialize().then(({ error }) => {
  if (error) openedFromRecoveryLink = false
})

// Registered immediately, before any screen exists. The callback must stay simple and must
// not call Supabase itself (that can deadlock).
supabase?.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') openedFromRecoveryLink = false
  // Once signed in, an earlier "that link has expired" message is old news.
  if (event === 'SIGNED_IN') linkProblem = null
})

/** Whether a new password still needs to be chosen after opening a reset link in this tab. */
export function recoveryPending(): boolean {
  return openedFromRecoveryLink
}

/** Call once the new password has been saved or the step has been skipped. */
export function clearRecoveryPending(): void {
  openedFromRecoveryLink = false
}

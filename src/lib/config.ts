/**
 * Where the app finds the database.
 *
 * Both values are public by design (they ship to every browser). They come from the
 * file named `.env`. See `.env.example`. Do not create `.env.local`: it silently overrides
 * `.env` in every build made on this Mac, including the ones that get published.
 */

export type SupabaseConfig = { url: string; publishableKey: string }

export type ConfigResult = { ok: true; config: SupabaseConfig } | { ok: false; problem: string }

/** Checks the two values and explains, in plain words, what is wrong if anything is. */
export function readSupabaseConfig(env: Record<string, string | undefined>): ConfigResult {
  const url = (env.VITE_SUPABASE_URL ?? '').trim()
  const publishableKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim()

  if (!url || !publishableKey) {
    return { ok: false, problem: 'The database address or key has not been filled in yet.' }
  }
  if (url.includes('your-project-ref') || publishableKey.includes('xxxxxxxx')) {
    return { ok: false, problem: 'The database settings still contain the example values.' }
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, problem: 'The database address is not a valid web address.' }
  }
  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  if (parsed.protocol !== 'https:' && !isLocal) {
    return { ok: false, problem: 'The database address must start with https://' }
  }

  // The app's security rules (public/_headers) only allow talking to *.supabase.co, so any
  // other address could never work once published. Catch it here with a clear message.
  if (!isLocal && !parsed.hostname.endsWith('.supabase.co')) {
    return { ok: false, problem: 'The database address should look like https://xxxx.supabase.co' }
  }

  // Guard against the one dangerous mistake: pasting the secret key where the public one goes.
  if (looksLikeSecretKey(publishableKey)) {
    return {
      ok: false,
      problem:
        'The key that was filled in looks like a SECRET key. Only the "publishable" key belongs in the app. Replace it, then create a new secret key in Supabase because this one has been exposed.',
    }
  }

  return { ok: true, config: { url: parsed.origin, publishableKey } }
}

/** True for Supabase secret keys: new style `sb_secret_…` or an old-style token whose role is service_role. */
export function looksLikeSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true
  const parts = key.split('.')
  if (parts.length !== 3) return false
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: unknown }
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

import { describe, expect, it } from 'vitest'
import { looksLikeSecretKey, readSupabaseConfig } from './config'

/** Builds an old-style Supabase token carrying the given role (unsigned; only the shape matters here). */
function legacyKey(role: string): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ iss: 'supabase', role })}.signature`
}

describe('readSupabaseConfig', () => {
  const good = { VITE_SUPABASE_URL: 'https://abcdefghijklmnop.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc123' }

  it('accepts a real-looking address and publishable key', () => {
    expect(readSupabaseConfig(good)).toEqual({
      ok: true,
      config: { url: 'https://abcdefghijklmnop.supabase.co', publishableKey: 'sb_publishable_abc123' },
    })
  })

  it('tidies stray spaces and a trailing slash', () => {
    const result = readSupabaseConfig({
      VITE_SUPABASE_URL: '  https://abcdefghijklmnop.supabase.co/  ',
      VITE_SUPABASE_PUBLISHABLE_KEY: ' sb_publishable_abc123 ',
    })
    expect(result).toEqual({
      ok: true,
      config: { url: 'https://abcdefghijklmnop.supabase.co', publishableKey: 'sb_publishable_abc123' },
    })
  })

  it('drops anything after the address, such as /rest/v1/', () => {
    const result = readSupabaseConfig({ ...good, VITE_SUPABASE_URL: 'https://abcdefghijklmnop.supabase.co/rest/v1/' })
    expect(result).toEqual({
      ok: true,
      config: { url: 'https://abcdefghijklmnop.supabase.co', publishableKey: 'sb_publishable_abc123' },
    })
  })

  it('refuses an address that is not a Supabase project, such as the dashboard page', () => {
    const result = readSupabaseConfig({ ...good, VITE_SUPABASE_URL: 'https://supabase.com/dashboard/project/abcdefghijklmnop' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problem).toMatch(/xxxx\.supabase\.co/)
    expect(readSupabaseConfig({ ...good, VITE_SUPABASE_URL: 'https://evil-supabase.co' }).ok).toBe(false)
    expect(readSupabaseConfig({ ...good, VITE_SUPABASE_URL: 'https://abc.supabase.co.example.com' }).ok).toBe(false)
  })

  it('accepts an old-style public (anon) key', () => {
    expect(readSupabaseConfig({ ...good, VITE_SUPABASE_PUBLISHABLE_KEY: legacyKey('anon') }).ok).toBe(true)
  })

  it('reports missing values', () => {
    expect(readSupabaseConfig({}).ok).toBe(false)
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: good.VITE_SUPABASE_URL }).ok).toBe(false)
    expect(readSupabaseConfig({ ...good, VITE_SUPABASE_PUBLISHABLE_KEY: '   ' }).ok).toBe(false)
  })

  it('reports the untouched example values', () => {
    expect(
      readSupabaseConfig({
        VITE_SUPABASE_URL: 'https://your-project-ref.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx',
      }).ok,
    ).toBe(false)
  })

  it('reports an address that is not a web address or is not https', () => {
    expect(readSupabaseConfig({ ...good, VITE_SUPABASE_URL: 'abcdefghijklmnop' }).ok).toBe(false)
    expect(readSupabaseConfig({ ...good, VITE_SUPABASE_URL: 'http://abcdefghijklmnop.supabase.co' }).ok).toBe(false)
  })

  it('allows plain http only for a database running on this Mac', () => {
    expect(readSupabaseConfig({ ...good, VITE_SUPABASE_URL: 'http://localhost:54321' }).ok).toBe(true)
    expect(readSupabaseConfig({ ...good, VITE_SUPABASE_URL: 'http://127.0.0.1:54321' }).ok).toBe(true)
  })

  it('refuses a secret key, new style or old style', () => {
    const newStyle = readSupabaseConfig({ ...good, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc123' })
    expect(newStyle.ok).toBe(false)
    if (!newStyle.ok) expect(newStyle.problem).toMatch(/SECRET/)
    expect(readSupabaseConfig({ ...good, VITE_SUPABASE_PUBLISHABLE_KEY: legacyKey('service_role') }).ok).toBe(false)
  })
})

describe('looksLikeSecretKey', () => {
  it('spots secret keys and leaves public ones alone', () => {
    expect(looksLikeSecretKey('sb_secret_abc')).toBe(true)
    expect(looksLikeSecretKey(legacyKey('service_role'))).toBe(true)
    expect(looksLikeSecretKey('sb_publishable_abc')).toBe(false)
    expect(looksLikeSecretKey(legacyKey('anon'))).toBe(false)
    expect(looksLikeSecretKey('not.a.token')).toBe(false)
    expect(looksLikeSecretKey('')).toBe(false)
  })
})

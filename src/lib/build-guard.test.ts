import { describe, expect, it } from 'vitest'
import { checkBuildSettings } from './build-guard'

const good = {
  VITE_SUPABASE_URL: 'https://abcdefghijklmnop.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc123',
}

function legacyKey(role: string): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ iss: 'supabase', role })}.signature`
}

describe('checkBuildSettings: stops a bad build before it can be published', () => {
  it('passes a correct setup, for ordinary builds and for deploys', () => {
    expect(checkBuildSettings({ viteEnv: good, envFiles: ['.env', '.env.example'], forDeploy: false })).toEqual([])
    expect(checkBuildSettings({ viteEnv: good, envFiles: ['.env', '.env.example'], forDeploy: true })).toEqual([])
  })

  it('lets an ordinary build run with no settings yet (the app shows "Not connected")', () => {
    expect(checkBuildSettings({ viteEnv: {}, envFiles: ['.env.example'], forDeploy: false })).toEqual([])
  })

  it('refuses to deploy with no settings, example values, or a missing key', () => {
    expect(checkBuildSettings({ viteEnv: {}, envFiles: [], forDeploy: true })).toHaveLength(1)
    expect(
      checkBuildSettings({
        viteEnv: { VITE_SUPABASE_URL: 'https://your-project-ref.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx' },
        envFiles: ['.env'],
        forDeploy: true,
      }),
    ).toHaveLength(1)
    expect(checkBuildSettings({ viteEnv: { VITE_SUPABASE_URL: good.VITE_SUPABASE_URL }, envFiles: ['.env'], forDeploy: true })).toHaveLength(1)
  })

  it('refuses a secret key in ANY build, new style or old style, in any VITE_ setting', () => {
    for (const forDeploy of [false, true]) {
      const newStyle = checkBuildSettings({ viteEnv: { ...good, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc' }, envFiles: ['.env'], forDeploy })
      expect(newStyle.join(' ')).toMatch(/SECRET/)
      const oldStyle = checkBuildSettings({ viteEnv: { ...good, VITE_SUPABASE_PUBLISHABLE_KEY: legacyKey('service_role') }, envFiles: ['.env'], forDeploy })
      expect(oldStyle.join(' ')).toMatch(/SECRET/)
      const elsewhere = checkBuildSettings({ viteEnv: { ...good, VITE_OTHER: ' sb_secret_abc ' }, envFiles: ['.env'], forDeploy })
      expect(elsewhere.join(' ')).toMatch(/SECRET/)
    }
  })

  it('refuses any extra VITE_ setting, because everything named VITE_ is published', () => {
    const problems = checkBuildSettings({ viteEnv: { ...good, VITE_SUPABASE_SERVICE_KEY: 'whatever' }, envFiles: ['.env'], forDeploy: false })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/VITE_SUPABASE_SERVICE_KEY/)
  })

  it('refuses to deploy while a file like .env.local exists, because it overrides .env', () => {
    const problems = checkBuildSettings({ viteEnv: good, envFiles: ['.env', '.env.example', '.env.local'], forDeploy: true })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/\.env\.local/)
    // An ordinary build on the Mac is still allowed.
    expect(checkBuildSettings({ viteEnv: good, envFiles: ['.env', '.env.local'], forDeploy: false })).toEqual([])
  })

  it('refuses to deploy an app pointed at this Mac instead of Supabase', () => {
    const problems = checkBuildSettings({ viteEnv: { ...good, VITE_SUPABASE_URL: 'http://127.0.0.1:54321' }, envFiles: ['.env'], forDeploy: true })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/points at this Mac/)
  })
})

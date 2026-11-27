import { looksLikeSecretKey, readSupabaseConfig } from './config.ts'

/**
 * Checks the database settings while the app is being BUILT, before anything can be published.
 *
 * Why here and not only in the running app: values named VITE_… are copied into the app's
 * public code during the build. If a secret key were pasted in by mistake, a check that
 * runs later in the browser would be too late; the secret would already be published.
 *
 * Returns a list of problems in plain words. An empty list means it is safe to carry on.
 *
 * `forDeploy` is true for the builds that get published (npm run deploy:preview / deploy:live).
 * Those must be fully set up. Ordinary builds on this Mac may still have no settings at all.
 */
export function checkBuildSettings(input: {
  /** Every setting the build can see whose name starts with VITE_. */
  viteEnv: Record<string, string | undefined>
  /** Names of settings files present in the project folder, e.g. [".env", ".env.local"]. */
  envFiles: string[]
  forDeploy: boolean
}): string[] {
  const problems: string[] = []
  // VITE_USER_NODE_ENV is set by the build tool itself in some setups; it is harmless.
  const allowed = new Set(['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_USER_NODE_ENV'])

  for (const [name, value] of Object.entries(input.viteEnv)) {
    if (!name.startsWith('VITE_') || value === undefined) continue
    if (looksLikeSecretKey(value.trim())) {
      problems.push(
        `${name} holds a Supabase SECRET key. It would be published for anyone to read. Remove it, then create a new secret key in Supabase because this one must be treated as exposed.`,
      )
    }
    if (!allowed.has(name)) {
      problems.push(
        `${name} is not a setting this app knows. Everything named VITE_… is published inside the app, so only VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are allowed.`,
      )
    }
  }

  // ".env" and ".env.example" are the only settings files this project uses.
  const stray = input.envFiles.filter((name) => name !== '.env' && name !== '.env.example')
  if (input.forDeploy && stray.length > 0) {
    problems.push(
      `Found ${stray.join(', ')}. Files like .env.local silently override .env in every build, so the published app could point at the wrong database. Delete ${stray.length === 1 ? 'it' : 'them'} before deploying.`,
    )
  }

  if (input.forDeploy) {
    const result = readSupabaseConfig(input.viteEnv)
    if (!result.ok) {
      problems.push(`The database settings in .env are not ready: ${result.problem}`)
    } else if (new URL(result.config.url).protocol !== 'https:') {
      problems.push('The database address in .env points at this Mac, not at Supabase. A published app could never reach it.')
    }
  }

  return problems
}

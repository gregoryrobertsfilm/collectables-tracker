/**
 * Spotting that a newer version of the app has been published.
 *
 * An app opened from the iPhone home screen can stay open in the background for days and
 * has no reload button, so without this check it would keep showing an old version.
 * Each build writes a small file, /version.json, holding a unique build id. The running
 * app compares that file with the id it was built with.
 */

/** Pulls the build id out of /version.json. Returns null for anything unexpected. */
export function readBuildId(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null
  const build = (body as { build?: unknown }).build
  return typeof build === 'string' && build.length > 0 && build.length <= 64 ? build : null
}

/** True only when the published build id is known and differs from the running one. */
export function isUpdateAvailable(runningBuild: string, publishedBuild: string | null): boolean {
  if (!publishedBuild) return false
  // "dev" is the id used while developing on the Mac: never nag there.
  if (runningBuild === 'dev') return false
  return publishedBuild !== runningBuild
}

/** Asks the host which build is published. Never throws: a failed check just means "no news". */
export async function fetchPublishedBuild(fetcher: typeof fetch = fetch): Promise<string | null> {
  try {
    const response = await fetcher('/version.json', { cache: 'no-store' })
    if (!response.ok) return null
    const type = response.headers.get('content-type') ?? ''
    if (!type.includes('json')) return null
    return readBuildId(await response.json())
  } catch {
    return null
  }
}

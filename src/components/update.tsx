import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchPublishedBuild, isUpdateAvailable } from '../lib/version'

const CHECK_AT_MOST_EVERY_MS = 60_000

const UpdateContext = createContext(false)

/**
 * Watches for a newer published build. Checks when the app is opened, whenever it comes
 * back to the front, and at most once a minute. The banner itself is drawn by <UpdateBanner />.
 */
export function UpdateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let lastCheck = 0
    let active = true

    async function check() {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastCheck < CHECK_AT_MOST_EVERY_MS) return
      lastCheck = now
      const published = await fetchPublishedBuild()
      if (active && isUpdateAvailable(__BUILD_ID__, published)) setReady(true)
    }

    void check()
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])

  return <UpdateContext.Provider value={ready}>{children}</UpdateContext.Provider>
}

/**
 * "A new version is ready." Shown only when one is. Signed-in screens place it inside the
 * sticky title bar so the two move as one block; other screens place it at the top of the page.
 */
export function UpdateBanner({ className = '' }: { className?: string }) {
  const ready = useContext(UpdateContext)
  if (!ready) return null
  return (
    <div role="status" className={`bg-accent text-accent-ink ${className}`}>
      <div className="px-safe mx-auto flex w-full max-w-3xl items-center gap-3 py-2">
        <p className="flex-1 text-sm font-semibold">A new version is ready.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-11 rounded-lg bg-accent-ink px-3 text-sm font-bold text-accent"
        >
          Update now
        </button>
      </div>
    </div>
  )
}

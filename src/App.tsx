import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { useAuth } from './auth/auth-context'
import { AuthProvider } from './auth/AuthProvider'
import { AppShell } from './components/AppShell'
import { Button, FullScreenMessage, Logo, Notice, Spinner } from './components/ui'
import { UpdateBanner, UpdateProvider } from './components/update'
import { configProblem } from './lib/supabase'
import { Home } from './screens/Home'
import { Login } from './screens/Login'
import { NotConnected } from './screens/NotConnected'
import { SetNewPassword } from './screens/SetNewPassword'
import { Settings } from './screens/Settings'

export function App() {
  return (
    <UpdateProvider>
      <div className="flex min-h-dvh flex-col">
        {configProblem ? (
          <>
            <UpdateBanner className="pt-safe" />
            <NotConnected problem={configProblem} />
          </>
        ) : (
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        )}
      </div>
    </UpdateProvider>
  )
}

/**
 * The single door into the app. Whatever address is typed, nothing behind the login is
 * drawn unless there is a signed-in session. (The database enforces the same rule on its
 * side, so this gate is for tidiness; the real lock is in Supabase.)
 */
function AuthGate() {
  const { status, recovering, unreachable, dismissUnreachable } = useAuth()

  if (status === 'signedIn' && !recovering) {
    return (
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <>
      <UpdateBanner className="pt-safe" />
      {status === 'loading' ? (
        <Opening />
      ) : status === 'signedIn' ? (
        <SetNewPassword />
      ) : unreachable ? (
        <FullScreenMessage>
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo size={56} />
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Can’t reach the database</h1>
          </div>
          <Notice tone="warn">
            Check your internet connection. You have not been signed out; the app just could not confirm your
            sign-in.
          </Notice>
          <Button className="mt-4 w-full" onClick={() => window.location.reload()}>
            Try again
          </Button>
          <div className="mt-2 text-center">
            <Button variant="quiet" onClick={dismissUnreachable}>
              Sign in instead
            </Button>
          </div>
        </FullScreenMessage>
      ) : (
        <Login />
      )}
    </>
  )
}

/** The start-up screen. Says so if confirming the sign-in is taking a while (poor signal, for example). */
function Opening() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 6000)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <FullScreenMessage>
      <div className="flex flex-col items-center gap-3 text-center text-ink-2" role="status">
        <Spinner />
        <p className="text-sm">{slow ? 'Still trying to reach the database. Check your connection.' : 'Opening…'}</p>
      </div>
    </FullScreenMessage>
  )
}

import { NavLink, Outlet } from 'react-router'
import { Logo } from './ui'
import { UpdateBanner } from './update'

/**
 * The frame around every signed-in screen: a title bar, the page, and the main navigation.
 * On a phone the navigation sits at the bottom within thumb reach; on a computer it moves to the top.
 * New sections are added to NAV as each stage is built.
 */
const NAV = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/settings', label: 'Settings', icon: GearIcon, end: false },
]

export function AppShell() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="pt-safe sticky top-0 z-10 border-b border-line bg-page/90 backdrop-blur">
        <UpdateBanner />
        <div className="px-safe mx-auto flex h-14 w-full max-w-3xl items-center gap-3">
          <Logo size={28} />
          <span className="text-lg font-bold tracking-tight">Collectables</span>
          <nav aria-label="Main" className="ml-auto hidden gap-1 sm:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold ${isActive ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-2'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="px-safe mx-auto w-full max-w-3xl flex-1 py-5">
        <Outlet />
      </main>

      <nav aria-label="Main" className="pb-safe sticky bottom-0 z-10 border-t border-line bg-surface sm:hidden">
        <ul className="mx-auto flex max-w-3xl">
          {NAV.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${isActive ? 'text-accent' : 'text-ink-3'}`
                }
              >
                <item.icon />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function HomeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  )
}

import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { FolderOpen, History } from 'lucide-react'

import { useAuthStore } from '../../stores/auth'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { useStudioStore } from '../../features/studio/studioStore'

const navItem = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all duration-200',
    isActive
      ? 'bg-brand-600 text-white shadow-lift'
      : 'text-ink-muted hover:bg-brand-50 hover:text-brand-800',
  )

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()
  const inStudio = location.pathname.startsWith('/studio')

  const hasVersions = useStudioStore((s) => s.hasVersions)
  const setProjectsModalOpen = useStudioStore((s) => s.setProjectsModalOpen)
  const setVersionsModalOpen = useStudioStore((s) => s.setVersionsModalOpen)

  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 border-b border-border-subtle bg-white/90 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img src="/logo.png" alt="Storyza" className="h-9 w-9 rounded-xl" />
            <span className="font-display text-2xl font-semibold tracking-tight text-brand-700">
              Storyza
            </span>
          </Link>

          {inStudio && (
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-4">
              <Button variant="outline" size="sm" onClick={() => setProjectsModalOpen(true)}>
                <FolderOpen className="h-4 w-4" /> My projects
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVersionsModalOpen(true)}
                disabled={!hasVersions}
              >
                <History className="h-4 w-4" /> Versions
              </Button>
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            <nav className="flex items-center gap-1">
              <NavLink to="/" className={navItem} end>
                <span aria-hidden>🏠</span> Home
              </NavLink>
              <NavLink to="/studio" className={navItem}>
                <span aria-hidden>🎬</span> Studio
              </NavLink>
              {user?.role === 'teacher' && (
                <NavLink to="/teacher" className={navItem}>
                  <span aria-hidden>🧑‍🏫</span> Teacher
                </NavLink>
              )}
            </nav>

            {user ? (
              <>
                <span className="flex items-center gap-2 rounded-full border border-border-subtle bg-white py-1.5 pr-3 pl-1.5 text-sm font-bold text-ink-muted">
                  <span
                    aria-hidden
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-sunny-300 text-[11px] text-sunny-900"
                  >
                    {initials(user.full_name)}
                  </span>
                  <span className="hidden sm:inline">{user.full_name}</span>
                </span>
                <Button variant="ghost" size="sm" onClick={logout} className="text-xs">
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link to="/register">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Create account
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="sm">Sign in</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main
        className={cn(
          'flex-1 overflow-hidden',
          inStudio ? 'flex min-h-0 p-3' : 'min-h-0 overflow-y-auto px-4 py-3',
        )}
      >
        {children}
      </main>
    </div>
  )
}
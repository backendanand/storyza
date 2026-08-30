import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Loader2, Save } from 'lucide-react'

import { useAuthStore } from '../../stores/auth'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  triggerSaveNow,
  useStudioStore,
  type SaveState,
} from '../../features/studio/studioStore'

const navItem = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all duration-200',
    isActive
      ? 'bg-brand-600 text-white shadow-lift'
      : 'text-slate-600 hover:bg-brand-50 hover:text-brand-800',
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

const saveMeta: Record<SaveState, { label: string; variant: 'success' | 'info' | 'danger'; icon?: string }> = {
  idle: { label: '', variant: 'info' },
  saving: { label: 'Saving…', variant: 'info', icon: '⏳' },
  saved: { label: 'Saved', variant: 'success', icon: '✓' },
  error: { label: "Oops — couldn't save", variant: 'danger', icon: '⚠️' },
}

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()
  const inStudio = location.pathname.startsWith('/studio')

  const title = useStudioStore((s) => s.title)
  const setTitle = useStudioStore((s) => s.setTitle)
  const saveState = useStudioStore((s) => s.saveState)
  const saveError = useStudioStore((s) => s.saveError)
  const meta = saveMeta[saveState]

  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 border-b border-slate-100 bg-cream/90">
        <div className="flex h-16 items-center gap-3 px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img src="/logo.png" alt="Storyza" className="h-9 w-9 rounded-xl" />
            <span className="font-display text-2xl font-semibold tracking-tight text-brand-700">
              Storyza
            </span>
          </Link>

          {inStudio && (
            <div className="flex min-w-0 flex-1 items-center justify-center gap-3 px-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name your project ✏️"
                className="h-10 min-w-0 max-w-sm flex-1 rounded-2xl border-2 border-slate-100 bg-white px-4 font-display text-base text-slate-900 transition-colors focus:border-brand-300 focus:ring-2 focus:ring-brand-100 focus:outline-none"
              />
              {meta.label && (
                <Badge variant={meta.variant} icon={meta.icon} className="hidden sm:inline-flex">
                  {meta.label}
                </Badge>
              )}
              {saveState === 'error' && saveError && (
                <span className="hidden text-xs font-semibold text-coral-700 lg:inline">{saveError}</span>
              )}
              <Button size="sm" onClick={triggerSaveNow} disabled={saveState === 'saving'} className="px-4">
                {saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
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
                <span className="flex items-center gap-2 rounded-full border-2 border-slate-100 bg-white py-1.5 pr-3 pl-1.5 text-sm font-bold text-slate-700">
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
              <Link to="/login">
                <Button size="sm">Sign in</Button>
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</main>
    </div>
  )
}
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { useAuthStore } from '../../stores/auth'
import { Button } from '../ui/button'

const navLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    isActive ? 'bg-brand-100 text-brand-800' : 'text-slate-600 hover:bg-slate-100'
  }`

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Storyza" className="h-9 w-9 rounded-lg" />
            <span className="text-xl font-extrabold tracking-tight text-brand-700">Storyza</span>
          </Link>
          <nav className="ml-6 flex items-center gap-1">
            <NavLink to="/" className={navLink} end>
              Home
            </NavLink>
            <NavLink to="/studio" className={navLink}>
              Studio
            </NavLink>
            {user?.role === 'teacher' && (
              <NavLink to="/teacher" className={navLink}>
                Teacher
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm font-medium text-slate-600">{user.full_name}</span>
                <Button variant="outline" size="sm" onClick={logout}>
                  Sign out
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
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { Mascot } from '../../components/Mascot'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { apiClient } from '../../lib/api'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth'

interface UserStats {
  total_projects: number
  draft_projects: number
  shared_projects: number
  total_saves: number
  total_scenes: number
  total_animations: number
  total_audio: number
  total_keyframes: number
  total_duration: number
  member_since: string | null
  last_login_at: string | null
}

interface ProjectRead {
  id: string
  title: string
  status: string
  updated_at: string | null
}

const roleLabels: Record<string, string> = {
  platform_admin: 'Platform admin',
  school_admin: 'School admin',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
}

const stats = [
  { key: 'total_projects', label: 'Projects', emoji: '🎬', color: 'bg-brand-100', text: 'text-brand-800' },
  { key: 'shared_projects', label: 'Shared', emoji: '🎉', color: 'bg-mint-100', text: 'text-mint-800' },
  { key: 'draft_projects', label: 'Drafts', emoji: '✏️', color: 'bg-sunny-100', text: 'text-sunny-800' },
  { key: 'total_saves', label: 'Saves', emoji: '💾', color: 'bg-coral-100', text: 'text-coral-800' },
  { key: 'total_scenes', label: 'Scenes', emoji: '🖼️', color: 'bg-grape-100', text: 'text-grape-800' },
  { key: 'total_animations', label: 'Animations', emoji: '🧩', color: 'bg-brand-100', text: 'text-brand-800' },
  { key: 'total_audio', label: 'Audio clips', emoji: '🔊', color: 'bg-sunny-100', text: 'text-sunny-800' },
  { key: 'total_keyframes', label: 'Key moments', emoji: '⏱️', color: 'bg-mint-100', text: 'text-mint-800' },
]

const coverPalettes = [
  'from-brand-400 to-grape-500',
  'from-sunny-400 to-coral-400',
  'from-mint-400 to-brand-500',
  'from-coral-400 to-grape-500',
  'from-grape-400 to-brand-600',
]

function pickPalette(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return coverPalettes[hash % coverPalettes.length]
}

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

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function AccountPage() {
  const user = useAuthStore((s) => s.user)

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['me', 'stats'],
    queryFn: () => apiClient.get<UserStats>('/me/stats'),
    enabled: !!user,
  })

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<{ items: ProjectRead[] }>('/projects'),
    enabled: !!user,
  })

  const creations = projects?.items ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Profile header */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-brand-700 to-grape-700 p-8 text-white shadow-soft md:p-10">
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-sunny-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-coral-400/20 blur-2xl" />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center">
          <span
            aria-hidden
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/15 text-2xl font-display font-bold ring-4 ring-white/20"
          >
            {initials(user?.full_name)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl md:text-4xl">{user?.full_name ?? 'My account'}</h1>
              <Badge variant="success" className="bg-white/20 text-white">
                {roleLabels[user?.role ?? 'student']}
              </Badge>
            </div>
            <p className="mt-1 text-brand-100">{user?.email}</p>
            <p className="mt-2 text-sm font-semibold text-brand-100/80">
              🎨 Member since {formatDate(statsData?.member_since)} · ⏱️ Total playtime {statsData?.total_duration ?? 0}s
            </p>
          </div>
          <Mascot variant="happy" size={150} className="hidden md:block md:ml-auto" />
        </div>
      </section>

      {/* Statistics */}
      <section>
        <h2 className="mb-3 font-display text-2xl text-slate-900">Your stats 📊</h2>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.key} className="group transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
                <CardContent className="flex items-center gap-4 p-5">
                  <span
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl transition-transform group-hover:scale-110',
                      stat.color,
                    )}
                    aria-hidden
                  >
                    {stat.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className={cn('font-display text-2xl leading-tight', stat.text)}>
                      {String(statsData?.[stat.key as keyof UserStats] ?? 0)}
                    </p>
                    <p className="truncate text-xs font-bold text-slate-500">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* My projects */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl text-slate-900">My projects 🗂️</h2>
          <Link to="/studio">
            <Button variant="ghost" size="sm" className="text-brand-700">
              + New
            </Button>
          </Link>
        </div>

        {creations.length === 0 ? (
          <Card className="flex flex-col items-center gap-4 p-10 text-center" accent="sunny">
            <Mascot variant="surprised" size={110} />
            <div>
              <h3 className="font-display text-xl text-slate-900">No projects yet!</h3>
              <p className="mt-1 text-sm text-slate-500">
                Head to the studio and make your very first animation. ✨
              </p>
            </div>
            <Link to="/studio">
              <Button>Make my first animation 🎬</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {creations.map((project) => (
              <Link key={project.id} to={`/studio?project=${project.id}`} className="group">
                <Card className="overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
                  <div
                    className={cn(
                      'flex h-32 items-center justify-center bg-gradient-to-br text-5xl',
                      pickPalette(project.id),
                    )}
                  >
                    <span className="drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)] transition-transform group-hover:scale-110">
                      ✨
                    </span>
                  </div>
                  <CardContent className="flex items-center justify-between gap-2 p-4">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-base text-slate-900">
                        {project.title || 'Untitled animation'}
                      </h3>
                      {project.updated_at && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {new Date(project.updated_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Badge variant={project.status === 'published' ? 'success' : 'neutral'}>
                      {project.status === 'published' ? 'Shared 🎉' : 'Draft ✏️'}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
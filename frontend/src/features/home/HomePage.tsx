import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { Mascot } from '../../components/Mascot'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { apiClient } from '../../lib/api'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth'

interface ProjectRead {
  id: string
  title: string
  status: string
  updated_at: string | null
}

const quickActions = [
  {
    emoji: '🎬',
    title: 'Make an animation',
    description: 'Add characters, move them around and press play.',
    color: 'bg-sunny-100',
  },
  {
    emoji: '🎨',
    title: 'Build a scene',
    description: 'Drag characters and props onto your canvas.',
    color: 'bg-coral-100',
  },
  {
    emoji: '📖',
    title: 'Tell a story',
    description: 'Use scenes and dialogue to turn ideas into stories.',
    color: 'bg-mint-100',
  },
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

export function HomePage() {
  const user = useAuthStore((s) => s.user)
  const isTeacher = user?.role === 'teacher'

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<{ items: ProjectRead[] }>('/projects'),
    enabled: !!user && !isTeacher,
  })

  const creations = projects?.items ?? []

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-brand-700 to-grape-700 p-8 text-white shadow-soft md:p-10">
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-sunny-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-coral-400/20 blur-2xl" />
        <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-center">
          <div className="max-w-xl">
            <h1 className="font-display text-4xl leading-tight md:text-5xl">
              {isTeacher
                ? `Welcome back, ${user?.full_name?.split(' ')[0] ?? 'Teacher'}!`
                : user
                  ? "Let's create something amazing!"
                  : 'Turn ideas into animations!'}
            </h1>
            <p className="mt-3 text-lg text-brand-100">
              {isTeacher
                ? 'Your classroom is ready. Assign activities, review creations and cheer on your students.'
                : 'Add characters, move them around, press play — and share your work with your class.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {isTeacher ? (
                <Link to="/teacher">
                  <Button size="lg" variant="sunny" className="bg-sunny-400 text-sunny-900 shadow-sunny hover:bg-sunny-500">
                    Open Teacher dashboard 🧑‍🏫
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/studio">
                    <Button size="lg" variant="sunny" className="text-sunny-900">
                      Start creating ✨
                    </Button>
                  </Link>
                  {!user && (
                    <Link to="/login">
                      <Button size="lg" variant="outline" className="border-white/50 text-white hover:border-white/80 hover:bg-white/10">
                        I'm a teacher
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="hidden shrink-0 md:block md:ml-auto">
            <Mascot variant="happy" size={210} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {quickActions.map((card) => (
          <Link key={card.title} to="/studio" className="group">
            <Card className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
              <CardContent className="flex flex-col gap-3 p-6">
                <span
                  className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-2xl text-3xl transition-transform group-hover:scale-110',
                    card.color,
                  )}
                >
                  {card.emoji}
                </span>
                <h2 className="font-display text-lg text-slate-900">{card.title}</h2>
                <p className="text-sm text-slate-500">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      {user && !isTeacher && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl text-slate-900">My creations 🎨</h2>
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
                <h3 className="font-display text-xl text-slate-900">No animations yet!</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Let's make your very first one — it's easy and fun.
                </p>
              </div>
              <Link to="/studio">
                <Button>Make my first animation 🎬</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {creations.map((project) => (
                <Link
                  key={project.id}
                  to={`/studio?project=${project.id}`}
                  className="group"
                >
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
                      <Badge variant={project.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                        {project.status === 'PUBLISHED' ? 'Shared 🎉' : 'Draft ✏️'}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
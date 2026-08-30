import { BookOpenCheck, ClipboardList, Users } from 'lucide-react'

import { Mascot } from '../../components/Mascot'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'

const panels = [
  {
    icon: ClipboardList,
    emoji: '📚',
    accent: 'sunny' as const,
    title: 'Activities',
    description: 'Pick an activity and assign it to your class.',
  },
  {
    icon: Users,
    emoji: '👧',
    accent: 'mint' as const,
    title: 'My classes',
    description: 'See your classes and the students in them.',
  },
  {
    icon: BookOpenCheck,
    emoji: '📝',
    accent: 'grape' as const,
    title: 'Submissions',
    description: 'Review projects, score rubrics and give feedback.',
  },
]

export function TeacherDashboard() {
  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-grape-500 to-brand-700 p-8 text-white shadow-soft md:p-10">
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-sunny-400/20 blur-2xl" />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-3xl md:text-4xl">Teacher dashboard</h1>
            <p className="mt-2 max-w-xl text-brand-100">
              Assign creative activities, review student work and track progress. Everything your
              class makes, in one happy place.
            </p>
          </div>
          <Mascot variant="happy" size={140} className="hidden md:block md:ml-auto" />
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        {panels.map((panel) => (
          <Card key={panel.title} accent={panel.accent}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-2xl text-2xl"
                  aria-hidden
                >
                  {panel.emoji}
                </span>
                <panel.icon className="h-5 w-5 text-slate-300" />
              </div>
              <CardTitle>{panel.title}</CardTitle>
              <CardDescription>{panel.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm font-semibold text-slate-400">
              We're building this next! 🚧
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
import { BookOpenCheck, ClipboardList, Users } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'

const panels = [
  {
    icon: ClipboardList,
    title: 'Activities',
    description: 'Pick an activity and assign it to your class.',
  },
  {
    icon: Users,
    title: 'My classes',
    description: 'See your classes and the students in them.',
  },
  {
    icon: BookOpenCheck,
    title: 'Submissions',
    description: 'Review projects, score rubrics and give feedback.',
  },
]

export function TeacherDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Teacher dashboard</h1>
        <p className="mt-1 text-slate-500">
          Assign creative activities, review student work and track progress.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {panels.map((panel) => (
          <Card key={panel.title}>
            <CardHeader>
              <panel.icon className="h-8 w-8 text-brand-600" />
              <CardTitle>{panel.title}</CardTitle>
              <CardDescription>{panel.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-400">Coming soon</CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
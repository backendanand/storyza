import { Link } from 'react-router-dom'
import { Clapperboard, BookOpen, Palette } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { useAuthStore } from '../../stores/auth'

const starterCards = [
  {
    icon: Clapperboard,
    title: 'Make an animation',
    description: 'Add characters, move them around and press play.',
    to: '/studio',
  },
  {
    icon: Palette,
    title: 'Build a scene',
    description: 'Drag characters and props onto your canvas.',
    to: '/studio',
  },
  {
    icon: BookOpen,
    title: 'Tell a story',
    description: 'Use scenes and dialogue to turn ideas into stories.',
    to: '/studio',
  },
]

export function HomePage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-10 text-white">
        <h1 className="text-4xl font-extrabold tracking-tight">
          {user ? `Hi ${user.full_name ?? 'there'}, let's create!` : 'Turn ideas into animations'}
        </h1>
        <p className="mt-3 max-w-xl text-lg text-brand-100">
          Storyza is a place to make animations and stories. Add characters, move them around,
          press play — and share your work with your class.
        </p>
        <div className="mt-6 flex gap-3">
          <Link to="/studio">
            <Button size="lg" className="bg-white text-brand-800 hover:bg-brand-50">
              Start creating
            </Button>
          </Link>
          {!user && (
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                Teacher sign in
              </Button>
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {starterCards.map((card) => (
          <Link key={card.title} to={card.to}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <card.icon className="h-8 w-8 text-brand-600" />
                <CardTitle>{card.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Mascot } from '../../components/Mascot'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { useAuthStore } from '../../stores/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <Mascot variant="wink" size={110} />
        <h1 className="font-display text-3xl text-slate-900">Welcome back!</h1>
        <p className="text-sm font-semibold text-slate-500">
          Sign in and let's keep making awesome animations 🎬
        </p>
      </div>

      <Card className="w-full" accent="brand">
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-slate-700">Email</span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@school.edu"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-slate-700">Password</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Your secret password"
                required
              />
            </label>
            {error && (
              <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-semibold text-coral-700">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" disabled={submitting} className="mt-1">
              {submitting ? 'Signing in…' : 'Sign in 🚀'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
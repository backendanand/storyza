import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { Mascot } from '../../components/Mascot'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { useAuthStore } from '../../stores/auth'

export function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const register = useAuthStore((s) => s.register)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? '/'

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("Passwords don't match")
      return
    }
    setSubmitting(true)
    try {
      await register({ email, full_name: fullName, password })
      navigate(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <Mascot variant="happy" size={110} />
        <h1 className="font-display text-3xl text-slate-900">Create your account!</h1>
        <p className="text-sm font-semibold text-slate-500">
          Make, save and share awesome animations 🎬
        </p>
      </div>

      <Card className="w-full" accent="brand">
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-slate-700">Full name</span>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                placeholder="e.g. Priya Sharma"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-slate-700">Email</span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-slate-700">Password</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-slate-700">Confirm password</span>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="Repeat your password"
                required
                minLength={8}
              />
            </label>
            {error && (
              <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-semibold text-coral-700">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" disabled={submitting} className="mt-1">
              {submitting ? 'Creating account…' : 'Create account 🎉'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-sm font-semibold text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-brand-700 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  )
}

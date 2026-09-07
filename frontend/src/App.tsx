import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { HomePage } from './features/home/HomePage'
import { StudioPage } from './features/studio/StudioPage'
import { TeacherDashboard } from './features/teacher/TeacherDashboard'
import { useAuthStore } from './stores/auth'

function AuthPrompt() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  if (user) return <StudioPage />
  return (
    <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  )
}

export default function App() {
  const loadMe = useAuthStore((s) => s.loadMe)
  const location = useLocation()

  useEffect(() => {
    void loadMe().catch(() => {})
  }, [loadMe, location.pathname])

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/studio" element={<AuthPrompt />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </AppShell>
  )
}
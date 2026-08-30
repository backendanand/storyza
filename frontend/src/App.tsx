import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'

import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './features/auth/LoginPage'
import { HomePage } from './features/home/HomePage'
import { StudioPage } from './features/studio/StudioPage'
import { TeacherDashboard } from './features/teacher/TeacherDashboard'
import { useAuthStore } from './stores/auth'

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
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </AppShell>
  )
}
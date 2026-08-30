import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { apiClient, setAuthToken } from '../lib/api'

export type UserRole = 'platform_admin' | 'school_admin' | 'teacher' | 'student' | 'parent'

export interface User {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  status: string
  school_id: string | null
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

interface AuthState {
  token: string | null
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loadMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      login: async (email, password) => {
        const tokens = await apiClient.post<TokenResponse>('/auth/login', { email, password })
        setAuthToken(tokens.access_token)
        set({ token: tokens.access_token })
        const user = await apiClient.get<User>('/auth/me')
        set({ user })
      },

      logout: () => {
        setAuthToken(null)
        set({ token: null, user: null })
      },

      loadMe: async () => {
        if (!get().token) return
        const user = await apiClient.get<User>('/auth/me')
        set({ user })
      },
    }),
    {
      name: 'storyza-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        setAuthToken(state?.token ?? null)
      },
    },
  ),
)
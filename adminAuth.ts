import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AdminAuthState {
  isAuthenticated: boolean
  login: (password: string) => boolean
  logout: () => void
}

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      login: (password: string) => {
        const secret = import.meta.env.VITE_ADMIN_SECRET || 'vertice-admin-2025'
        if (password === secret) {
          set({ isAuthenticated: true })
          return true
        }
        return false
      },
      logout: () => set({ isAuthenticated: false }),
    }),
    { name: 'vertice-admin-auth' }
  )
)

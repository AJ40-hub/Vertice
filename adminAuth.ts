import { create } from 'zustand'

interface AdminAuthState {
  isAuthenticated: boolean
  isChecking: boolean
  checkSession: () => Promise<boolean>
  login: (password: string) => Promise<boolean>
  logout: () => Promise<void>
}

export const useAdminAuth = create<AdminAuthState>()((set) => ({
  isAuthenticated: false,
  isChecking: true,
  checkSession: async () => {
    set({ isChecking: true })
    try {
      const response = await fetch('/api/admin/session', { credentials: 'same-origin' })
      const data = await response.json()
      const authenticated = Boolean(data?.authenticated)
      set({ isAuthenticated: authenticated, isChecking: false })
      return authenticated
    } catch {
      set({ isAuthenticated: false, isChecking: false })
      return false
    }
  },
  login: async (password: string) => {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password }),
    })
    const ok = response.ok
    set({ isAuthenticated: ok, isChecking: false })
    return ok
  },
  logout: async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined)
    set({ isAuthenticated: false, isChecking: false })
  },
}))

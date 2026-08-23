import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  dbUser: any | null
  isLoading: boolean
  setUser: (user: User | null) => void
  initialize: () => Promise<void>
  signOut: () => Promise<void>
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  dbUser: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  initialize: async () => {
    set({ isLoading: true })
    const { data: { session } } = await supabase.auth.getSession()
    
    let dbUser = null
    if (session?.access_token) {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        if (res.ok) {
          dbUser = await res.json()
        }
      } catch (e) {
        console.error("Failed to fetch dbUser", e)
      }
    }
    
    set({ user: session?.user || null, dbUser, isLoading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      let currentDbUser = null
      if (session?.access_token) {
        try {
          const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          })
          if (res.ok) {
            currentDbUser = await res.json()
          }
        } catch (e) {}
      }
      set({ user: session?.user || null, dbUser: currentDbUser })
    })
  },
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, dbUser: null })
  }
}))

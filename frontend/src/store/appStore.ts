import { create } from 'zustand'
import type { HealthResponse, ProvenanceResponse, Zone } from '../lib/api'
import { api } from '../lib/api'

interface AppState {
  sidebarExpanded: boolean
  health: HealthResponse | null
  provenance: ProvenanceResponse | null
  zones: Zone[]
  analysisTime: string | null
  toast: { message: string; type?: 'info' | 'error' | 'success' } | null
  commandOpen: boolean
  setSidebarExpanded: (v: boolean) => void
  toggleSidebar: () => void
  setToast: (t: AppState['toast']) => void
  setCommandOpen: (v: boolean) => void
  bootstrap: () => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  sidebarExpanded: true,
  health: null,
  provenance: null,
  zones: [],
  analysisTime: null,
  toast: null,
  commandOpen: false,
  setSidebarExpanded: (v) => set({ sidebarExpanded: v }),
  toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
  setToast: (toast) => set({ toast }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  bootstrap: async () => {
    const results = await Promise.allSettled([
      api.health(),
      api.provenance(),
      api.zones(),
    ])
    if (results[0].status === 'fulfilled') set({ health: results[0].value })
    if (results[1].status === 'fulfilled') {
      const p = results[1].value
      set({
        provenance: p,
        analysisTime: p.sources?.[0]?.timestamp ?? new Date().toISOString(),
      })
    }
    if (results[2].status === 'fulfilled') set({ zones: results[2].value.zones ?? [] })
  },
}))

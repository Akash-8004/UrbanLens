import { create } from 'zustand'
import type { HeatmapLayerId } from '../lib/constants'

interface SelectionState {
  zoneId: string | null
  heatLayer: HeatmapLayerId
  overlayOpacity: number
  showBuildings3d: boolean
  pinnedLayer: HeatmapLayerId | null
  compareBlend: number
  highlightedHotspotId: string | null
  setZoneId: (id: string | null) => void
  setHeatLayer: (l: HeatmapLayerId) => void
  setOverlayOpacity: (o: number) => void
  setShowBuildings3d: (v: boolean) => void
  setPinnedLayer: (l: HeatmapLayerId | null) => void
  setCompareBlend: (b: number) => void
  setHighlightedHotspotId: (id: string | null) => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  zoneId: null,
  heatLayer: 'heat_stress',
  overlayOpacity: 0.75,
  showBuildings3d: false,
  pinnedLayer: null,
  compareBlend: 0.5,
  highlightedHotspotId: null,
  setZoneId: (zoneId) => set({ zoneId }),
  setHeatLayer: (heatLayer) => set({ heatLayer }),
  setOverlayOpacity: (overlayOpacity) => set({ overlayOpacity }),
  setShowBuildings3d: (showBuildings3d) => set({ showBuildings3d }),
  setPinnedLayer: (pinnedLayer) => set({ pinnedLayer }),
  setCompareBlend: (compareBlend) => set({ compareBlend }),
  setHighlightedHotspotId: (highlightedHotspotId) => set({ highlightedHotspotId }),
}))

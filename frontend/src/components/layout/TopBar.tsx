import { Download, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { NAV_ITEMS } from '../../lib/constants'
import { api } from '../../lib/api'
import { useAppStore } from '../../store/appStore'
import { useSelectionStore } from '../../store/selectionStore'
import { DataProvenanceTag } from '../ui/DataProvenanceTag'
import { Select } from '../ui/Select'
import { GradientButton } from '../ui/GradientButton'

const titles: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((n) => [n.to, n.label]),
)

export function TopBar() {
  const { pathname } = useLocation()
  const title = titles[pathname] ?? 'UrbanLens'
  const zones = useAppStore((s) => s.zones)
  const setToast = useAppStore((s) => s.setToast)
  const zoneId = useSelectionStore((s) => s.zoneId)
  const setZoneId = useSelectionStore((s) => s.setZoneId)
  const analysisTime = useAppStore((s) => s.analysisTime)
  const [exportOpen, setExportOpen] = useState(false)

  const download = async (kind: 'pdf' | 'geojson' | 'geotiff' | 'csv') => {
    try {
      const map = {
        pdf: () => api.exportReportPdf(),
        geojson: () => api.exportGeojson(),
        geotiff: () => api.exportGeotiff(),
        csv: () => api.exportCsv(),
      }
      const blob = await map[kind]()
      const ext = kind === 'pdf' ? 'pdf' : kind === 'csv' ? 'csv' : kind === 'geotiff' ? 'tif' : 'geojson'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `urbanlens-${kind}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      setToast({ message: 'Export downloaded', type: 'success' })
    } catch {
      setToast({ message: 'Export unavailable — start backend', type: 'error' })
    }
    setExportOpen(false)
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-bg/90 px-6 backdrop-blur-md">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-text-muted">Mission Control</p>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {analysisTime && (
          <span className="hidden font-mono text-[10px] text-text-faint md:inline">
            Analysis {new Date(analysisTime).toLocaleDateString()}
          </span>
        )}
        <DataProvenanceTag />
        <Select
          value={zoneId ?? (zones[0]?.id ?? '')}
          onChange={(v) => setZoneId(v || null)}
          options={zones.map((z) => ({ value: z.id, label: z.name }))}
          className="min-w-[160px]"
        />
        <div className="relative">
          <GradientButton variant="ghost" className="flex items-center gap-1" onClick={() => setExportOpen(!exportOpen)}>
            <Download size={14} /> Export <ChevronDown size={12} />
          </GradientButton>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-border bg-panel-alt py-1 shadow-lg">
              {(['pdf', 'geojson', 'geotiff', 'csv'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-xs hover:bg-panel"
                  onClick={() => download(k)}
                >
                  {k.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

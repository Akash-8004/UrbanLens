import type { Map as MapLibreMap } from 'maplibre-gl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type HeatmapResponse } from '../lib/api'
import { HEAT_CLASSES } from '../lib/constants'
import { fmtTemp, fmtArea } from '../lib/format'
import { PageShell } from '../components/layout/PageShell'
import { HeatMap, flyToHotspot, flyToZone, flyToIndia, type BasemapId } from '../components/map/HeatMap'
import { MapControls } from '../components/map/MapControls'
import { MapLegend } from '../components/map/MapLegend'
import { Drawer } from '../components/ui/Drawer'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { ZonePopup } from '../components/map/ZonePopup'
import { useAppStore } from '../store/appStore'
import { useSelectionStore } from '../store/selectionStore'

export default function HeatMapPage() {
  const layer = useSelectionStore((s) => s.heatLayer)
  const pinned = useSelectionStore((s) => s.pinnedLayer)
  const zoneId = useSelectionStore((s) => s.zoneId)
  const setZoneId = useSelectionStore((s) => s.setZoneId)
  const highlighted = useSelectionStore((s) => s.highlightedHotspotId)
  const setHighlighted = useSelectionStore((s) => s.setHighlightedHotspotId)
  const zones = useAppStore((s) => s.zones)
  const [data, setData] = useState<HeatmapResponse | null>(null)
  const [compare, setCompare] = useState<HeatmapResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [zoneInsight, setZoneInsight] = useState<string>()
  const [basemap, setBasemap] = useState<BasemapId>('satellite')
  const mapRef = useRef<MapLibreMap | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    api
      .heatmap(layer)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [layer])

  useEffect(() => {
    if (!pinned || pinned === layer) {
      setCompare(null)
      return
    }
    api.heatmap(pinned).then(setCompare).catch(() => setCompare(null))
  }, [pinned, layer])

  useEffect(() => {
    if (!zoneId) return
    const z = zones.find((x) => x.id === zoneId)
    if (z?.bounds) flyToZone(mapRef.current, z.bounds)
    api.driversZone(zoneId).then((r) => setZoneInsight(r.insight)).catch(() => undefined)
    setDrawer(true)
  }, [zoneId, zones])

  const onMapReady = useCallback((map: MapLibreMap) => {
    mapRef.current = map
  }, [])

  const hotspots = data?.hotspots ?? []

  return (
    <PageShell fullBleed className="relative flex h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      <div className="absolute left-4 top-4 z-10 space-y-2">
        <MapControls basemap={basemap} onBasemap={setBasemap} />
        <MapLegend data={data} />
        <div className="flex gap-1">
          <button
            type="button"
            className="glass rounded-lg px-2 py-1 text-[10px] text-text-muted hover:text-text"
            onClick={() => flyToIndia(mapRef.current)}
          >
            India
          </button>
          <button
            type="button"
            className="glass rounded-lg px-2 py-1 text-[10px] text-text-muted hover:text-text"
            onClick={() =>
              mapRef.current?.flyTo({ center: [72.89, 19.05], zoom: 11.2, duration: 1200 })
            }
          >
            Mumbai
          </button>
        </div>
      </div>
      <div className="absolute right-4 top-4 z-10 max-h-[55vh] w-60 overflow-auto rounded-xl glass p-3 shadow-glow">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-text-muted">Hotspot ranking</p>
        {error && <p className="text-xs text-thermal-ext">{error}</p>}
        {!data && !error && <Skeleton className="h-32" />}
        {hotspots
          .slice()
          .sort((a, b) => b.peak_lst - a.peak_lst)
          .map((h, i) => {
            const cls = HEAT_CLASSES[h.class]
            return (
              <button
                key={h.id}
                type="button"
                onMouseEnter={() => setHighlighted(h.id)}
                onMouseLeave={() => setHighlighted(null)}
                onClick={() => {
                  flyToHotspot(mapRef.current, h.lon, h.lat)
                  setZoneId(h.zone_id ?? zones.find((z) => z.name === h.name)?.id ?? null)
                  setDrawer(true)
                }}
                className={`mb-1.5 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-panel-alt ${
                  highlighted === h.id ? 'ring-1 ring-accent-cyan/50 bg-panel-alt' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-text-faint">#{i + 1}</span>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: cls?.color ?? '#94A3B8' }}
                  />
                  {h.name}
                </span>
                <span className="font-mono tabular-nums text-thermal-high">{fmtTemp(h.peak_lst)}</span>
              </button>
            )
          })}
      </div>
      <div className="min-h-0 flex-1">
        {data ? (
          <HeatMap
            data={data}
            compareData={compare}
            basemap={basemap}
            onMapReady={onMapReady}
            className="h-full rounded-none border-0"
          />
        ) : (
          <Skeleton className="h-full min-h-[420px] rounded-none" />
        )}
      </div>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Zone detail">
        {zoneId && zones.find((z) => z.id === zoneId) ? (
          <ZonePopup
            zone={zones.find((z) => z.id === zoneId)!}
            insight={zoneInsight}
            drivers={hotspots.find((h) => h.zone_id === zoneId || h.name === zones.find((z) => z.id === zoneId)?.name)?.top_drivers}
          />
        ) : (
          <p className="text-sm text-text-muted">Select a hotspot or zone to inspect {fmtArea(0)} stats.</p>
        )}
        {zoneId && (
          <Badge color="amber" className="mt-3">
            Synthetic demo raster · 30 m grid
          </Badge>
        )}
      </Drawer>
    </PageShell>
  )
}

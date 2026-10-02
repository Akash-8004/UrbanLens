import type { Map as MapLibreMap } from 'maplibre-gl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type HeatmapResponse, type Hotspot } from '../lib/api'
import { HEAT_CLASSES } from '../lib/constants'
import { fmtTemp, fmtArea } from '../lib/format'
import { PageShell } from '../components/layout/PageShell'
import { HeatMap, flyToHotspot, flyToIndia, flyToMumbai, flyToZone, type BasemapId } from '../components/map/HeatMap'
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
  const [activeSpot, setActiveSpot] = useState<Hotspot | null>(null)
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

  // Selecting a zone/location should zoom map to that location.
  useEffect(() => {
    if (!zoneId) return
    const z = zones.find((x) => x.id === zoneId)
    if (z?.bounds) flyToZone(mapRef.current, z.bounds)
    api.driversZone(zoneId).then((r) => setZoneInsight(r.insight)).catch(() => undefined)
  }, [zoneId, zones])

  const onMapReady = useCallback((map: MapLibreMap) => {
    mapRef.current = map
  }, [])

  const openHotspot = useCallback(
    (h: Hotspot) => {
      setActiveSpot(h)
      setZoneId(h.zone_id ?? zones.find((z) => z.name === h.name)?.id ?? null)
      setHighlighted(h.id)
      setDrawer(true)
      flyToHotspot(mapRef.current, h.lon, h.lat)
      if (h.insight) setZoneInsight(h.insight)
      else if (h.zone_id) {
        api.driversZone(h.zone_id).then((r) => setZoneInsight(r.insight)).catch(() => undefined)
      }
    },
    [setHighlighted, setZoneId, zones],
  )

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
            onClick={() => flyToMumbai(mapRef.current)}
          >
            Mumbai corridor
          </button>
        </div>
      </div>
      <div className="absolute right-4 top-4 z-10 max-h-[55vh] w-72 overflow-auto rounded-xl glass p-3 shadow-glow">
        <p className="mb-1 text-[10px] uppercase tracking-wider text-text-muted">Street-level detections</p>
        <p className="mb-2 text-[9px] text-text-faint">
          Top hotspots · click zooms to exact coords · {hotspots.length} total
        </p>
        {error && <p className="text-xs text-thermal-ext">{error}</p>}
        {!data && !error && <Skeleton className="h-32" />}
        {hotspots
          .slice()
          .sort((a, b) => b.peak_lst - a.peak_lst)
          .slice(0, 24)
          .map((h, i) => {
            const cls = HEAT_CLASSES[h.class]
            return (
              <button
                key={h.id}
                type="button"
                onMouseEnter={() => setHighlighted(h.id)}
                onMouseLeave={() => setHighlighted(null)}
                onClick={() => openHotspot(h)}
                className={`mb-1.5 w-full rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-panel-alt ${
                  highlighted === h.id ? 'bg-panel-alt ring-1 ring-accent-cyan/50' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-text-faint">#{i + 1}</span>
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: h.color ?? cls?.color ?? '#94A3B8' }}
                    />
                    <span className="truncate font-medium">{h.locality ?? h.name.split('·')[0]}</span>
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-thermal-high">{fmtTemp(h.peak_lst)}</span>
                </div>
                <p className="mt-0.5 truncate pl-7 text-[10px] text-text-muted">{h.road ?? h.name}</p>
                <p className="mt-0.5 pl-7 font-mono text-[9px] text-accent-cyan">
                  {h.lat.toFixed(5)}°N, {h.lon.toFixed(5)}°E
                </p>
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
            highlightedId={highlighted}
            onMapReady={onMapReady}
            onHotspotClick={openHotspot}
            className="h-full rounded-none border-0"
          />
        ) : (
          <Skeleton className="h-full min-h-[420px] rounded-none" />
        )}
      </div>
      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title={activeSpot?.name ?? zones.find((z) => z.id === zoneId)?.name ?? 'Zone detail'}
      >
        {activeSpot && (
          <div className="mb-4 space-y-3 rounded-lg border border-border bg-panel-alt p-3 text-xs">
            <div className="rounded-md border border-accent-cyan/30 bg-bg/50 p-2 font-mono text-[11px] text-accent-cyan">
              <p className="text-[9px] uppercase tracking-wider text-text-muted">Coordinates</p>
              <p>{activeSpot.lat.toFixed(6)}° N</p>
              <p>{activeSpot.lon.toFixed(6)}° E</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-text-muted">Peak LST</p>
                <p className="font-mono text-thermal-high">{fmtTemp(activeSpot.peak_lst)}</p>
              </div>
              <div>
                <p className="text-text-muted">Class</p>
                <p>{activeSpot.class_label ?? HEAT_CLASSES[activeSpot.class]?.label}</p>
              </div>
              <div>
                <p className="text-text-muted">Road / site</p>
                <p>{activeSpot.road ?? '—'}</p>
              </div>
              <div>
                <p className="text-text-muted">Footprint</p>
                <p className="font-mono">{activeSpot.radius_m ? `${activeSpot.radius_m} m` : fmtArea(activeSpot.area_km2)}</p>
              </div>
            </div>
          </div>
        )}
        {zoneId && zones.find((z) => z.id === zoneId) ? (
          <ZonePopup
            zone={zones.find((z) => z.id === zoneId)!}
            insight={zoneInsight ?? activeSpot?.insight}
            drivers={activeSpot?.top_drivers}
          />
        ) : (
          <p className="text-sm text-text-muted">Select a Mumbai heat spot on the map or list.</p>
        )}
        <Badge color="amber" className="mt-3">
          Discrete zone hotspots · Mumbai corridor
        </Badge>
      </Drawer>
    </PageShell>
  )
}

import maplibregl, { type Map as MapLibreMap, type MapLayerMouseEvent } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'
import type { BBox, HeatmapResponse, Hotspot } from '../../lib/api'
import { useSelectionStore } from '../../store/selectionStore'
import { syncBuildingLayer } from './BuildingExtrusions'
import { ScanlineOverlay } from './ScanlineOverlay'

const OVERLAY_ID = 'heatmap-overlay'
const OVERLAY_SRC = 'heatmap-src'
const HS_SRC = 'hotspots-src'

export const BASEMAPS = {
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: '© Esri, Maxar, Earthstar Geographics',
  },
  streets: {
    id: 'streets',
    label: 'Streets',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap contributors',
  },
  dark: {
    id: 'dark',
    label: 'Dark canvas',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '© Esri',
  },
  topo: {
    id: 'topo',
    label: 'Topo',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '© Esri',
  },
} as const

export type BasemapId = keyof typeof BASEMAPS

function bboxToCoords(b: BBox): [[number, number], [number, number], [number, number], [number, number]] {
  const [minLon, minLat, maxLon, maxLat] = b
  return [
    [minLon, maxLat],
    [maxLon, maxLat],
    [maxLon, minLat],
    [minLon, minLat],
  ]
}

function makeStyle(basemap: BasemapId): maplibregl.StyleSpecification {
  const bm = BASEMAPS[basemap]
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      basemap: {
        type: 'raster',
        tiles: [...bm.tiles],
        tileSize: 256,
        attribution: bm.attribution,
        maxzoom: 19,
      },
    },
    layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
  }
}

function popupHtml(p: Record<string, unknown>): string {
  const name = String(p.name ?? 'Hotspot')
  const locality = String(p.locality ?? p.zone_id ?? '')
  const road = String(p.road ?? '')
  const cls = String(p.class_label ?? '')
  const peak = Number(p.peak_lst ?? 0).toFixed(1)
  const lat = Number(p.lat)
  const lon = Number(p.lon)
  const color = String(p.color ?? '#EF4444')
  const rad = p.radius_m != null ? `${Number(p.radius_m).toFixed(0)} m` : '—'
  return `
    <div style="font-family:Inter,system-ui,sans-serif;min-width:200px;max-width:270px;color:#E2E8F0">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">
        <strong style="font-size:12px;line-height:1.3">${name}</strong>
        <span style="flex-shrink:0;font-size:9px;letter-spacing:.08em;color:#10B981;border:1px solid rgba(16,185,129,.4);padding:2px 6px;border-radius:999px">● LIVE</span>
      </div>
      <div style="font-size:10px;color:#94A3B8;margin-bottom:8px">${locality}${road ? ' · ' + road : ''}</div>
      <div style="background:rgba(15,23,42,.7);border:1px solid #1E293B;border-radius:8px;padding:8px;margin-bottom:8px;font-family:ui-monospace,monospace;font-size:11px">
        <div style="color:#64748B;font-size:9px;margin-bottom:2px">COORDINATES</div>
        <div style="color:#22D3EE">${lat.toFixed(6)}° N</div>
        <div style="color:#22D3EE">${lon.toFixed(6)}° E</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;font-variant-numeric:tabular-nums">
        <div><div style="color:#64748B;font-size:9px">Peak LST</div><div style="color:#F59E0B;font-weight:600">${peak}°C</div></div>
        <div><div style="color:#64748B;font-size:9px">Class</div><div style="color:${color}">${cls}</div></div>
        <div><div style="color:#64748B;font-size:9px">Footprint</div><div>${rad}</div></div>
        <div><div style="color:#64748B;font-size:9px">Source</div><div>street scan</div></div>
      </div>
      <div style="margin-top:8px;font-size:9px;color:#64748B">Zoom in for street-level patches · click to lock</div>
    </div>
  `
}

function ensureHotspotLayers(map: MapLibreMap, geojson: GeoJSON.FeatureCollection) {
  if (!map.getSource(HS_SRC)) {
    map.addSource(HS_SRC, { type: 'geojson', data: geojson })
  } else {
    ;(map.getSource(HS_SRC) as maplibregl.GeoJSONSource).setData(geojson)
  }

  // Density heatmap — readable from corridor zoom, not one big locality blob
  if (!map.getLayer('hs-heat')) {
    map.addLayer({
      id: 'hs-heat',
      type: 'heatmap',
      source: HS_SRC,
      filter: ['==', ['get', 'kind'], 'point'],
      maxzoom: 15,
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 7, 0.6, 12, 1.4],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 7, 8, 11, 16, 14, 22],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.55, 12, 0.7, 14.5, 0.25],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.2, 'rgba(59,130,246,0.5)',
          0.45, 'rgba(34,211,238,0.65)',
          0.7, 'rgba(245,158,11,0.8)',
          0.9, 'rgba(239,68,68,0.9)',
          1, 'rgba(239,68,68,1)',
        ],
      },
    })
  }

  // Tiny street footprints — only when zoomed into locality
  if (!map.getLayer('hs-patch')) {
    map.addLayer({
      id: 'hs-patch',
      type: 'fill',
      source: HS_SRC,
      filter: ['==', ['get', 'kind'], 'patch'],
      minzoom: 12.2,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.55,
        'fill-antialias': true,
      },
    })
  }
  if (!map.getLayer('hs-patch-line')) {
    map.addLayer({
      id: 'hs-patch-line',
      type: 'line',
      source: HS_SRC,
      filter: ['==', ['get', 'kind'], 'patch'],
      minzoom: 12.2,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 1.2,
        'line-opacity': 0.85,
      },
    })
  }

  // Precise detection dots (small — scale with zoom; not locality discs)
  if (!map.getLayer('hs-dot')) {
    map.addLayer({
      id: 'hs-dot',
      type: 'circle',
      source: HS_SRC,
      filter: ['==', ['get', 'kind'], 'point'],
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, 2,
          10, 3.5,
          13, 5,
          16, 7,
        ],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 0.5,
          14, 1.5,
        ],
        'circle-stroke-color': '#0B1220',
        'circle-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, 0.35,
          10, 0.75,
          13, 0.95,
        ],
      },
    })
  }
}

export function HeatMap({
  data,
  compareData,
  basemap = 'satellite',
  highlightedId,
  onMapReady,
  onHotspotClick,
  className,
}: {
  data?: HeatmapResponse | null
  compareData?: HeatmapResponse | null
  basemap?: BasemapId
  highlightedId?: string | null
  onMapReady?: (map: MapLibreMap) => void
  onHotspotClick?: (h: Hotspot) => void
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const pulseRef = useRef<number | null>(null)
  const [scan, setScan] = useState(true)
  const [detected, setDetected] = useState(0)
  const opacity = useSelectionStore((s) => s.overlayOpacity)
  const show3d = useSelectionStore((s) => s.showBuildings3d)
  const blend = useSelectionStore((s) => s.compareBlend)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: makeStyle(basemap),
      center: [78.96, 22.5],
      zoom: 4.35,
      pitch: 0,
      bearing: 0,
      maxBounds: [
        [65.0, 5.0],
        [100.0, 38.5],
      ],
    })
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), 'bottom-left')
    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '290px',
      offset: 10,
      className: 'ul-hotspot-popup',
    })
    mapRef.current = map
    map.on('load', () => onMapReady?.(map))
    const t = setTimeout(() => setScan(false), 2200)
    return () => {
      clearTimeout(t)
      if (pulseRef.current) cancelAnimationFrame(pulseRef.current)
      popupRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const run = () => {
      const src = map.getSource('basemap') as maplibregl.RasterTileSource | undefined
      if (src && 'setTiles' in src) {
        ;(src as unknown as { setTiles: (t: string[]) => void }).setTiles([...BASEMAPS[basemap].tiles])
      } else {
        map.setStyle(makeStyle(basemap))
      }
    }
    if (map.isStyleLoaded()) run()
    else map.once('load', run)
  }, [basemap])

  // Subtle live pulse on dots
  useEffect(() => {
    const map = mapRef.current
    if (!map || !data) return
    let frame = 0
    const tick = () => {
      frame += 1
      const t = (Math.sin(frame / 22) + 1) / 2
      if (map.getLayer('hs-dot')) {
        map.setPaintProperty('hs-dot', 'circle-opacity', 0.55 + t * 0.4)
      }
      if (map.getLayer('hs-patch')) {
        map.setPaintProperty('hs-patch', 'fill-opacity', 0.4 + t * 0.25)
      }
      pulseRef.current = requestAnimationFrame(tick)
    }
    pulseRef.current = requestAnimationFrame(tick)
    return () => {
      if (pulseRef.current) cancelAnimationFrame(pulseRef.current)
    }
  }, [data, basemap])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !data?.hotspots_geojson) return
    const geo = data.hotspots_geojson
    const spots = data.hotspots ?? []

    setDetected(0)
    let n = 0
    const iv = window.setInterval(() => {
      n += Math.max(1, Math.floor(spots.length / 40))
      setDetected(Math.min(n, spots.length))
      if (n >= spots.length) window.clearInterval(iv)
    }, 40)

    const parseHotspot = (p: Record<string, unknown>): Hotspot => {
      const rawDrivers = p.top_drivers
      let drivers: string[] | undefined
      if (Array.isArray(rawDrivers)) drivers = rawDrivers as string[]
      else if (typeof rawDrivers === 'string') {
        try {
          drivers = JSON.parse(rawDrivers)
        } catch {
          drivers = rawDrivers.split(',').map((s) => s.trim()).filter(Boolean)
        }
      }
      return {
        id: String(p.id),
        name: String(p.name),
        class: Number(p.class),
        class_label: String(p.class_label ?? ''),
        color: String(p.color ?? ''),
        lat: Number(p.lat),
        lon: Number(p.lon),
        area_km2: Number(p.area_km2 ?? 0),
        peak_lst: Number(p.peak_lst),
        mean_lst: p.mean_lst != null ? Number(p.mean_lst) : undefined,
        zone_id: p.zone_id != null ? String(p.zone_id) : undefined,
        top_drivers: drivers,
        insight: p.insight != null ? String(p.insight) : undefined,
      }
    }

    const apply = () => {
      ensureHotspotLayers(map, geo)
      const interactive = ['hs-dot', 'hs-patch', 'hs-heat']
      const onEnter = (e: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = 'pointer'
        const f = e.features?.[0]
        if (!f?.properties) return
        const p = f.properties as Record<string, unknown>
        // Prefer exact stored coordinates
        const lngLat =
          p.lon != null && p.lat != null
            ? new maplibregl.LngLat(Number(p.lon), Number(p.lat))
            : e.lngLat
        popupRef.current?.setLngLat(lngLat).setHTML(popupHtml(p)).addTo(map)
        useSelectionStore.getState().setHighlightedHotspotId(String(p.id ?? ''))
      }
      const onLeave = () => {
        map.getCanvas().style.cursor = ''
        popupRef.current?.remove()
        useSelectionStore.getState().setHighlightedHotspotId(null)
      }
      const onClick = (e: MapLayerMouseEvent) => {
        const f = e.features?.[0]
        if (!f?.properties) return
        onHotspotClick?.(parseHotspot(f.properties as Record<string, unknown>))
      }

      interactive.forEach((id) => {
        map.off('mouseenter', id, onEnter)
        map.off('mouseleave', id, onLeave)
        map.off('click', id, onClick)
        if (map.getLayer(id)) {
          map.on('mouseenter', id, onEnter)
          map.on('mouseleave', id, onLeave)
          map.on('click', id, onClick)
        }
      })
    }

    if (map.isStyleLoaded()) apply()
    else map.once('load', apply)
    map.once('style.load', apply)
    return () => window.clearInterval(iv)
  }, [data, basemap, onHotspotClick])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('hs-dot')) return
    if (highlightedId) {
      map.setPaintProperty('hs-dot', 'circle-stroke-color', [
        'case',
        ['==', ['get', 'id'], highlightedId],
        '#22D3EE',
        '#0B1220',
      ])
      map.setPaintProperty('hs-dot', 'circle-radius', [
        'case',
        ['==', ['get', 'id'], highlightedId],
        8,
        4,
      ])
    } else {
      map.setPaintProperty('hs-dot', 'circle-stroke-color', '#0B1220')
      map.setPaintProperty('hs-dot', 'circle-radius', [
        'interpolate',
        ['linear'],
        ['zoom'],
        6, 2,
        10, 3.5,
        13, 5,
        16, 7,
      ])
    }
  }, [highlightedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !data?.image_png_b64 || !data.bbox) return
    const url = `data:image/png;base64,${data.image_png_b64}`
    const coords = bboxToCoords(data.bbox)
    const apply = () => {
      if (!map.getSource(OVERLAY_SRC)) {
        map.addSource(OVERLAY_SRC, { type: 'image', url, coordinates: coords })
        map.addLayer(
          {
            id: OVERLAY_ID,
            type: 'raster',
            source: OVERLAY_SRC,
            minzoom: 10.5,
            paint: {
              'raster-opacity': opacity * 0.22 * (compareData ? 1 - blend * 0.5 : 1),
              'raster-fade-duration': 250,
            },
          },
          map.getLayer('hs-heat') ? 'hs-heat' : undefined,
        )
      } else {
        ;(map.getSource(OVERLAY_SRC) as maplibregl.ImageSource).updateImage({ url, coordinates: coords })
        if (map.getLayer(OVERLAY_ID)) {
          map.setPaintProperty(OVERLAY_ID, 'raster-opacity', opacity * 0.22 * (compareData ? 1 - blend * 0.5 : 1))
        }
      }
      syncBuildingLayer(map, data.buildings_geojson, show3d)
      map.easeTo({ pitch: show3d ? 40 : 0, bearing: show3d ? -10 : 0, duration: 400 })
    }
    if (map.isStyleLoaded()) apply()
    else map.once('load', apply)
    map.once('style.load', apply)
  }, [data, opacity, show3d, compareData, blend, basemap])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !compareData?.image_png_b64 || !compareData.bbox) return
    const url = `data:image/png;base64,${compareData.image_png_b64}`
    const coords = bboxToCoords(compareData.bbox)
    const id = 'heatmap-compare'
    const src = 'heatmap-compare-src'
    const run = () => {
      if (!map.getSource(src)) {
        map.addSource(src, { type: 'image', url, coordinates: coords })
        map.addLayer({
          id,
          type: 'raster',
          source: src,
          minzoom: 10.5,
          paint: { 'raster-opacity': opacity * blend * 0.25 },
        })
      } else {
        ;(map.getSource(src) as maplibregl.ImageSource).updateImage({ url, coordinates: coords })
        if (map.getLayer(id)) map.setPaintProperty(id, 'raster-opacity', opacity * blend * 0.25)
      }
    }
    if (map.isStyleLoaded()) run()
    else map.once('load', run)
  }, [compareData, blend, opacity, basemap])

  const total = data?.hotspots?.length ?? 0

  return (
    <div className={`relative h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-border ${className ?? ''}`}>
      <div ref={containerRef} className="absolute inset-0" />
      <ScanlineOverlay show={scan} />
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-emerald/40 bg-bg/80 px-2.5 py-1 font-mono text-[10px] text-accent-emerald shadow-glow backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-emerald opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-emerald" />
          </span>
          LIVE STREET SCAN
        </span>
        <span className="rounded-full border border-border bg-bg/75 px-2 py-1 font-mono text-[10px] text-text-muted backdrop-blur">
          {detected}/{total} micro-spots
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 max-w-xs rounded-lg bg-bg/75 px-2.5 py-1.5 font-mono text-[9px] leading-relaxed text-text-muted backdrop-blur">
        Zoom into a locality for road-level heat spots · hover shows exact coordinates
      </div>
    </div>
  )
}

export function flyToHotspot(map: MapLibreMap | null, lon: number, lat: number) {
  map?.flyTo({ center: [lon, lat], zoom: 15.2, duration: 1400, pitch: 45 })
}

export function flyToZone(map: MapLibreMap | null, bounds: BBox) {
  if (!map || !bounds || bounds.length < 4) return
  map.fitBounds(
    [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[3]],
    ],
    { padding: 80, duration: 1200, maxZoom: 14 },
  )
}

export function flyToIndia(map: MapLibreMap | null) {
  map?.flyTo({ center: [78.96, 22.5], zoom: 4.35, duration: 1500, pitch: 0, bearing: 0 })
}

export function flyToMumbai(map: MapLibreMap | null) {
  map?.fitBounds(
    [
      [72.72, 18.90],
      [72.95, 19.82],
    ],
    { padding: 48, duration: 1400, pitch: 0 },
  )
}

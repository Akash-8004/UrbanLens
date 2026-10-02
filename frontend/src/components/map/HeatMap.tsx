import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'
import type { BBox, HeatmapResponse } from '../../lib/api'
import { useSelectionStore } from '../../store/selectionStore'
import { syncBuildingLayer } from './BuildingExtrusions'
import { ScanlineOverlay } from './ScanlineOverlay'

const OVERLAY_ID = 'heatmap-overlay'
const OVERLAY_SRC = 'heatmap-src'

/** Free no-key basemaps (Esri + OSM). Carto now requires a key. */
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

export function HeatMap({
  data,
  compareData,
  basemap = 'satellite',
  onMapReady,
  className,
}: {
  data?: HeatmapResponse | null
  compareData?: HeatmapResponse | null
  basemap?: BasemapId
  onMapReady?: (map: MapLibreMap) => void
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [scan, setScan] = useState(true)
  const opacity = useSelectionStore((s) => s.overlayOpacity)
  const show3d = useSelectionStore((s) => s.showBuildings3d)
  const blend = useSelectionStore((s) => s.compareBlend)
  const zoneHighlight = useSelectionStore((s) => s.zoneId)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: makeStyle(basemap),
      center: [72.89, 19.05],
      zoom: 11.2,
      pitch: show3d ? 55 : 0,
      bearing: show3d ? -20 : 0,
      maxBounds: [
        [68.0, 6.0],
        [98.0, 37.5],
      ], // keep view in India region
    })
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), 'bottom-left')
    mapRef.current = map
    map.on('load', () => onMapReady?.(map))
    const t = setTimeout(() => setScan(false), 2600)
    return () => {
      clearTimeout(t)
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Switch basemap without destroying overlay state
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

  useEffect(() => {
    const map = mapRef.current
    if (!map || !data?.image_png_b64 || !data.bbox) return
    const url = `data:image/png;base64,${data.image_png_b64}`
    const coords = bboxToCoords(data.bbox)
    const apply = () => {
      if (!map.getSource(OVERLAY_SRC)) {
        map.addSource(OVERLAY_SRC, { type: 'image', url, coordinates: coords })
        map.addLayer({
          id: OVERLAY_ID,
          type: 'raster',
          source: OVERLAY_SRC,
          paint: {
            'raster-opacity': opacity * (compareData ? 1 - blend * 0.5 : 1),
            'raster-fade-duration': 250,
          },
        })
      } else {
        ;(map.getSource(OVERLAY_SRC) as maplibregl.ImageSource).updateImage({ url, coordinates: coords })
        if (map.getLayer(OVERLAY_ID)) {
          map.setPaintProperty(OVERLAY_ID, 'raster-opacity', opacity * (compareData ? 1 - blend * 0.5 : 1))
        }
      }

      // Study-area outline
      const bb = data.bbox
      const ring: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [bb[0], bb[1]], [bb[2], bb[1]], [bb[2], bb[3]], [bb[0], bb[3]], [bb[0], bb[1]],
          ]],
        },
      }
      if (!map.getSource('study-bbox')) {
        map.addSource('study-bbox', { type: 'geojson', data: ring })
        map.addLayer({
          id: 'study-bbox-line',
          type: 'line',
          source: 'study-bbox',
          paint: { 'line-color': '#F59E0B', 'line-width': 2, 'line-dasharray': [2, 1], 'line-opacity': 0.85 },
        })
      }

      syncBuildingLayer(map, data.buildings_geojson, show3d)
      if (data.iot_node && !map.getSource('iot')) {
        map.addSource('iot', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [data.iot_node.lon, data.iot_node.lat] },
            properties: {},
          },
        })
        map.addLayer({
          id: 'iot-marker',
          type: 'circle',
          source: 'iot',
          paint: {
            'circle-radius': 7,
            'circle-color': '#06B6D4',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
            'circle-opacity': 0.95,
          },
        })
      }
      map.easeTo({ pitch: show3d ? 55 : 0, bearing: show3d ? -20 : 0, duration: 400 })
    }
    if (map.isStyleLoaded()) apply()
    else map.once('load', apply)
    // Re-apply after style swap
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
        map.addLayer({ id, type: 'raster', source: src, paint: { 'raster-opacity': opacity * blend } })
      } else {
        ;(map.getSource(src) as maplibregl.ImageSource).updateImage({ url, coordinates: coords })
        if (map.getLayer(id)) map.setPaintProperty(id, 'raster-opacity', opacity * blend)
      }
    }
    if (map.isStyleLoaded()) run()
    else map.once('load', run)
  }, [compareData, blend, opacity, basemap])

  // Soft vignette label for selected zone name
  useEffect(() => {
    void zoneHighlight
  }, [zoneHighlight])

  return (
    <div className={`relative h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-border ${className ?? ''}`}>
      <div ref={containerRef} className="absolute inset-0" />
      <ScanlineOverlay show={scan} />
      <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-bg/70 px-2 py-1 font-mono text-[9px] text-text-muted backdrop-blur">
        Mumbai study area · Andheri–Kurla corridor
      </div>
    </div>
  )
}

export function flyToHotspot(map: MapLibreMap | null, lon: number, lat: number) {
  map?.flyTo({ center: [lon, lat], zoom: 13.5, duration: 1200 })
}

export function flyToZone(map: MapLibreMap | null, bounds: BBox) {
  if (!map || !bounds || bounds.length < 4) return
  map.fitBounds(
    [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[3]],
    ],
    { padding: 64, duration: 1200, maxZoom: 14 },
  )
}

export function flyToIndia(map: MapLibreMap | null) {
  map?.flyTo({ center: [78.96, 22.5], zoom: 4.2, duration: 1500, pitch: 0 })
}

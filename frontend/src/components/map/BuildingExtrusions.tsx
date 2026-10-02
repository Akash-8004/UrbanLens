import type { Map as MapLibreMap } from 'maplibre-gl'

export function syncBuildingLayer(
  map: MapLibreMap,
  geojson: GeoJSON.FeatureCollection | undefined,
  visible: boolean,
) {
  const src = 'buildings-src'
  const layer = 'buildings-3d'
  if (!geojson?.features?.length) {
    if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', 'none')
    return
  }
  if (!map.getSource(src)) {
    map.addSource(src, { type: 'geojson', data: geojson })
    map.addLayer({
      id: layer,
      type: 'fill-extrusion',
      source: src,
      paint: {
        'fill-extrusion-color': [
          'interpolate',
          ['linear'],
          ['get', 'height'],
          0,
          '#3B82F6',
          20,
          '#F59E0B',
          45,
          '#EF4444',
        ],
        'fill-extrusion-height': ['coalesce', ['get', 'height'], ['get', 'mean_height_m'], 12],
        'fill-extrusion-opacity': 0.85,
      },
    })
  } else {
    ;(map.getSource(src) as unknown as { setData: (d: GeoJSON.FeatureCollection) => void }).setData(geojson)
  }
  map.setLayoutProperty(layer, 'visibility', visible ? 'visible' : 'none')
}

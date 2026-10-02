const BASE = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(text || `HTTP ${res.status}`, res.status)
  }
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) return res.json() as Promise<T>
  return res as unknown as T
}

export type BBox = [number, number, number, number]

export interface HealthResponse {
  status: string
  demo_mode?: boolean
}

export interface ProvenanceSource {
  name: string
  synthetic: boolean
  timestamp?: string
  resolution?: string
  license?: string
  citation?: string
  reason?: string
}

export interface ProvenanceResponse {
  sources: ProvenanceSource[]
  global_synthetic?: boolean
}

export interface ModelEntry {
  name: string
  version: string
  class?: string
  library?: string
  metrics?: Record<string, number | string>
  features?: string[]
}

export interface ModelsResponse {
  models: ModelEntry[]
}

export interface Zone {
  id: string
  name: string
  bounds: BBox
  centroid: [number, number]
  area_km2: number
  population_proxy?: number
}

export interface Hotspot {
  id: string
  name: string
  class: number
  class_label?: string
  color?: string
  lat: number
  lon: number
  area_km2: number
  peak_lst: number
  mean_lst?: number
  radius_km?: number
  radius_m?: number
  locality?: string
  road?: string
  top_drivers?: string[]
  zone_id?: string
  insight?: string
  population_proxy?: number
}

export interface HeatmapResponse {
  image_png_b64: string
  width: number
  height: number
  bbox: BBox
  classes?: { id: number; label: string; color: string }[]
  legend?: { value: number; color: string; label?: string }[]
  stats?: { min: number; max: number; mean: number }
  hotspots?: Hotspot[]
  hotspots_geojson?: GeoJSON.FeatureCollection
  buildings_geojson?: GeoJSON.FeatureCollection
  iot_node?: { lat: number; lon: number; node_id: string }
  study_label?: string
}

export interface DriverFeature {
  feature: string
  mean_abs_shap: number
  mean_shap?: number
}

export interface DriversGlobalResponse {
  global_importance: DriverFeature[]
  beeswarm?: { feature: string; shap: number; value: number }[]
  waterfall?: { feature: string; shap: number; cumulative?: number }[]
}

export interface DriversZoneResponse {
  zone_id: string
  importance: DriverFeature[]
  insight?: string
}

export interface CorrelationsResponse {
  features: string[]
  matrix: number[][]
}

export interface ForecastPoint {
  ts: string
  value: number
  pi_lower?: number
  pi_upper?: number
}

export interface ForecastResponse {
  zone_id?: string
  series: ForecastPoint[]
  metrics?: { rmse?: number; mae?: number; skill?: number }
  horizons?: Record<string, { value: number; pi_lower?: number; pi_upper?: number }>
}

export interface Intervention {
  id: string
  name: string
  cooling_effect_c?: [number, number]
  cost_per_m2?: number
  co_benefit_score?: number
  citation?: string
}

export interface OptimizeRequest {
  zone_id: string
  budget: number
  weights?: { cooling?: number; cost?: number; cobenefit?: number }
}

export interface ParetoPoint {
  cooling: number
  cost: number
  cobenefit: number
  x?: number[]
}

export interface OptimizeResponse {
  pareto: ParetoPoint[]
  recommended?: ParetoPoint & { interventions?: Record<string, number> }
  presets?: { low?: ParetoPoint; medium?: ParetoPoint; high?: ParetoPoint }
}

export interface PlanResponse {
  total_cost_cr: number
  total_cooling_c: number
  area_km2: number
  zones?: { zone_id: string; interventions: string[]; cooling: number; cost_cr: number }[]
}

export interface IotReading {
  node_id: string
  ts: string
  temp_c: number
  humidity_pct: number
  lux_proxy?: number
  battery?: number
  rssi?: number
  status?: string
  mode?: string
}

export interface IotHistoryResponse {
  readings: IotReading[]
}

export interface IotValidationResponse {
  era5_bias?: { slope: number; intercept: number; r2: number }
  comparisons?: { source: string; temp_c: number; delta?: number }[]
  notes?: string
}

export interface PinnMetricsResponse {
  physics_residual_wm2?: number
  ablation_residual_wm2?: number
  ood_improvement_pct?: number
  chart?: { label: string; with_physics: number; without_physics: number }[]
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),
  provenance: () => request<ProvenanceResponse>('/api/meta/provenance'),
  models: () => request<ModelsResponse>('/api/meta/models'),
  zones: () => request<{ zones: Zone[] }>('/api/meta/zones'),
  heatmap: (layer = 'heat_stress') =>
    request<HeatmapResponse>(`/api/heatmap?layer=${encodeURIComponent(layer)}`),
  heatmapZone: (zoneId: string) =>
    request<Record<string, unknown>>(`/api/heatmap/zones/${encodeURIComponent(zoneId)}`),
  driversGlobal: () => request<DriversGlobalResponse>('/api/drivers/global'),
  driversZone: (zoneId: string) =>
    request<DriversZoneResponse>(`/api/drivers/zone/${encodeURIComponent(zoneId)}`),
  driversCorrelations: () => request<CorrelationsResponse>('/api/drivers/correlations'),
  forecast: (zoneId: string, horizon = 'all') =>
    request<ForecastResponse>(
      `/api/forecast?zone_id=${encodeURIComponent(zoneId)}&horizon=${encodeURIComponent(horizon)}`,
    ),
  forecastCitywide: () => request<ForecastResponse>('/api/forecast/citywide'),
  interventionsCatalogue: () => request<{ interventions: Intervention[] }>('/api/interventions/catalogue'),
  interventionsOptimize: (body: OptimizeRequest) =>
    request<OptimizeResponse>('/api/interventions/optimize', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  interventionsPlan: (budget?: number) =>
    request<PlanResponse>(
      `/api/interventions/plan${budget != null ? `?budget=${budget}` : ''}`,
    ),
  iotLatest: () => request<IotReading>('/api/iot/latest'),
  iotHistory: (hours = 24, nodeId?: string) => {
    const q = new URLSearchParams({ hours: String(hours) })
    if (nodeId) q.set('node_id', nodeId)
    return request<IotHistoryResponse>(`/api/iot/history?${q}`)
  },
  iotValidation: () => request<IotValidationResponse>('/api/iot/validation'),
  pinnMetrics: () => request<PinnMetricsResponse>('/api/pinn/metrics'),
  exportReportPdf: () =>
    fetch(`${BASE}/api/export/report.pdf`, { method: 'POST' }).then((r) => {
      if (!r.ok) throw new ApiError('Export failed', r.status)
      return r.blob()
    }),
  exportGeojson: () => fetch(`${BASE}/api/export/heatmap.geojson`).then((r) => r.blob()),
  exportGeotiff: () => fetch(`${BASE}/api/export/heatmap.geotiff`).then((r) => r.blob()),
  exportCsv: () => fetch(`${BASE}/api/export/summary.csv`).then((r) => r.blob()),
}

export function iotStreamUrl(): string {
  return `${BASE}/api/iot/stream`
}

export function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

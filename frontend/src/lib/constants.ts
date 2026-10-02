export const HEAT_CLASSES = [
  { id: 0, key: 'low', label: 'Low', color: '#3B82F6' },
  { id: 1, key: 'mod', label: 'Moderate', color: '#22D3EE' },
  { id: 2, key: 'high', label: 'High', color: '#F59E0B' },
  { id: 3, key: 'ext', label: 'Extreme', color: '#EF4444' },
] as const

export const FEATURE_NAMES: Record<string, string> = {
  lst: 'Land Surface Temp',
  ndvi: 'NDVI',
  ndbi: 'Built-up Index',
  mndwi: 'MNDWI',
  impervious_pct: 'Impervious %',
  building_density: 'Building Density',
  mean_height_m: 'Mean Height',
  svf: 'Sky View Factor',
  era5_temp: 'ERA5 Temp',
  era5_humidity: 'Humidity',
  era5_wind: 'Wind',
  net_radiation: 'Net Radiation',
}

export const HEATMAP_LAYERS = [
  { id: 'heat_stress', label: 'Heat Stress' },
  { id: 'lst', label: 'LST' },
  { id: 'ndvi', label: 'NDVI' },
  { id: 'ndbi', label: 'NDBI' },
  { id: 'svf', label: 'SVF' },
  { id: 'impervious', label: 'Impervious' },
] as const

export type HeatmapLayerId = (typeof HEATMAP_LAYERS)[number]['id']

export const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: 'LayoutDashboard' },
  { to: '/heatmap', label: 'Heat Map', icon: 'Map' },
  { to: '/drivers', label: 'Drivers', icon: 'BarChart3' },
  { to: '/forecast', label: 'Forecast', icon: 'TrendingUp' },
  { to: '/optimizer', label: 'Optimizer', icon: 'Sparkles' },
  { to: '/sensors', label: 'Sensors', icon: 'Radio' },
  { to: '/about', label: 'About', icon: 'Info' },
] as const

export const PAGE_TRANSITION = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
}

export const STAGGER = { staggerChildren: 0.04 }

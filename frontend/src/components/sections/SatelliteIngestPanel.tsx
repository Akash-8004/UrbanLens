import { motion } from 'framer-motion'
import { Satellite, RadioTower, CloudSun, Map as MapIcon, Orbit, Waves } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { GlassCard } from '../ui/GlassCard'
import { DataProvenanceTag } from '../ui/DataProvenanceTag'
import { cn } from '../../lib/cn'

const MISSIONS = [
  {
    id: 'LC08',
    name: 'Landsat 8 OLI/TIRS',
    agency: 'NASA / USGS',
    icon: Satellite,
    role: 'Land Surface Temperature (LST)',
    collection: 'LANDSAT/LC08/C02/T1_L2',
    bands: ['ST_B10 (thermal)', 'SR_B4 / B5 (NDVI)', 'QA_PIXEL'],
    res: '30 m · 16-day revisit',
    product: 'Collection-2 Level-2 surface temp',
    accent: 'from-thermal-high/30 to-thermal-ext/10',
    chip: 'amber' as const,
    pipeline: ['Scene filter (cloud < 20%)', 'ST_B10 → °C', 'Bias vs IoT air temp'],
  },
  {
    id: 'S2A/B',
    name: 'Sentinel-2 MSI',
    agency: 'ESA Copernicus',
    icon: Orbit,
    role: 'Vegetation & built-up indices',
    collection: 'COPERNICUS/S2_SR_HARMONIZED',
    bands: ['B8 / B4 → NDVI', 'B11 / B8 → NDBI', 'B3 / B11 → MNDWI'],
    res: '10–20 m · 5-day revisit',
    product: 'Surface reflectance (harmonized)',
    accent: 'from-accent-emerald/25 to-accent-cyan/10',
    chip: 'emerald' as const,
    pipeline: ['Composite mosaic', 'Index stack', 'Resample → 30 m grid'],
  },
  {
    id: 'ERA5',
    name: 'ERA5 Reanalysis',
    agency: 'ECMWF / CDS',
    icon: CloudSun,
    role: 'Background meteorology',
    collection: 'reanalysis-era5-single-levels',
    bands: ['2m temperature', 'Relative humidity', '10m wind', 'Net radiation proxy'],
    res: '~31 km · hourly',
    product: 'CDS API 2m_temperature (+ humidity/wind)',
    accent: 'from-accent-cyan/25 to-thermal-low/10',
    chip: 'cyan' as const,
    pipeline: ['Grid sample at nodes', 'Diurnal fields', 'Delta-bias vs sensors'],
  },
  {
    id: 'OSM/GHSL',
    name: 'OSM + GHSL morphology',
    agency: 'OpenStreetMap / JRC',
    icon: MapIcon,
    role: 'Canyon geometry & density',
    collection: 'building footprints · road graph',
    bands: ['Mean height', 'Building density', 'Sky-view factor (SVF)'],
    res: 'vector → 30 m raster',
    product: 'Urban form features for UHI drivers',
    accent: 'from-accent-violet/25 to-panel',
    chip: 'violet' as const,
    pipeline: ['Footprint rasterize', 'SVF approx.', 'Stack with LST'],
  },
]

const FLOW = [
  { t: 'Acquire', d: 'Landsat 8 ST + Sentinel-2 SR + ERA5 + OSM' },
  { t: 'Align', d: 'Reproject EPSG:4326 · clip Western Line bbox' },
  { t: 'Indices', d: 'NDVI · NDBI · MNDWI · impervious · SVF' },
  { t: 'Detect', d: 'Pixel heat class → street micro-hotspots' },
  { t: 'Explain', d: 'SHAP drivers per zone + IoT ground truth' },
]

export function SatelliteIngestPanel({
  thumbs,
}: {
  thumbs: Record<string, string>
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-accent-cyan">Earth observation ingest</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
            Satellite-driven heat detection stack
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted">
            UrbanLens treats thermal remote sensing as the primary signal. Land-surface temperature from Landsat 8
            TIRS is fused with Sentinel-2 optical indices and ERA5 meteorology, then snapped to a 30&nbsp;m analysis
            grid so street-level hotspots are attributed to real urban morphology — not a single city-wide blob.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DataProvenanceTag />
          <Badge color="cyan">EO pipeline · active</Badge>
        </div>
      </div>

      {/* Acquisition flow */}
      <GlassCard hover={false} className="overflow-hidden p-0">
        <div className="border-b border-border/60 bg-panel-alt/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <RadioTower size={14} className="text-accent-cyan" />
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Acquisition → detection path</p>
          </div>
        </div>
        <div className="grid gap-0 sm:grid-cols-5">
          {FLOW.map((s, i) => (
            <motion.div
              key={s.t}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                'relative border-border/50 p-4 sm:border-r',
                i === FLOW.length - 1 && 'sm:border-r-0',
              )}
            >
              <p className="font-mono text-[10px] text-accent-cyan">0{i + 1}</p>
              <p className="mt-1 text-sm font-semibold">{s.t}</p>
              <p className="mt-1 text-[11px] leading-snug text-text-muted">{s.d}</p>
              <motion.div
                className="mt-3 h-0.5 rounded-full bg-gradient-to-r from-accent-cyan/0 via-accent-cyan/70 to-thermal-high/50"
                animate={{ opacity: [0.35, 1, 0.35], scaleX: [0.85, 1, 0.85] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.25 }}
              />
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Mission cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {MISSIONS.map((m, i) => {
          const Icon = m.icon
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard className={cn('h-full overflow-hidden border-t-0 bg-gradient-to-br p-0', m.accent)}>
                <div className="border-b border-border/50 bg-bg/40 px-4 py-3 backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg border border-border bg-panel p-2">
                        <Icon size={18} className="text-accent-cyan" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold tracking-tight">{m.name}</p>
                        <p className="text-[10px] text-text-muted">{m.agency}</p>
                      </div>
                    </div>
                    <Badge color={m.chip}>{m.id}</Badge>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-faint">Detection role</p>
                    <p className="text-sm text-text">{m.role}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-faint">Collection / product</p>
                      <p className="font-mono text-[11px] leading-relaxed text-accent-cyan">{m.collection}</p>
                      <p className="mt-1 text-[11px] text-text-muted">{m.product}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-faint">Resolution</p>
                      <p className="text-[11px] text-text">{m.res}</p>
                      <p className="mt-2 text-[10px] uppercase tracking-wider text-text-faint">Bands / variables</p>
                      <ul className="mt-1 space-y-0.5">
                        {m.bands.map((b) => (
                          <li key={b} className="font-mono text-[10px] text-text-muted">
                            · {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10px] uppercase tracking-wider text-text-faint">On-platform processing</p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.pipeline.map((step) => (
                        <span
                          key={step}
                          className="rounded-md border border-border/80 bg-panel/80 px-2 py-1 text-[10px] text-text-muted"
                        >
                          {step}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>

      {/* Derived products from satellite stack */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Derived EO products</p>
            <h3 className="text-lg font-semibold tracking-tight">What the platform actually “sees”</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] text-text-muted">
            <Waves size={12} className="text-thermal-high" />
            Thermal + optical fusion → heat stress classes
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              { k: 'lst', label: 'LST (°C)', src: 'Landsat 8 ST_B10', note: 'Skin temperature field' },
              { k: 'ndvi', label: 'NDVI', src: 'Sentinel-2 B8/B4', note: 'Vegetation deficit' },
              { k: 'ndbi', label: 'NDBI', src: 'Sentinel-2 B11/B8', note: 'Built-up intensity' },
              { k: 'svf', label: 'SVF', src: 'OSM morphology', note: 'Canyon trapping' },
            ] as const
          ).map((item) => (
            <GlassCard key={item.k} hover={false} className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text">{item.label}</p>
                  <p className="font-mono text-[9px] text-accent-cyan">{item.src}</p>
                </div>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-thermal-high" />
              </div>
              {thumbs[item.k] ? (
                <div className="relative">
                  <img
                    src={`data:image/png;base64,${thumbs[item.k]}`}
                    alt={item.label}
                    className="h-32 w-full object-cover opacity-95"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/90 to-transparent px-3 py-2">
                    <p className="text-[10px] text-text-muted">{item.note}</p>
                  </div>
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center bg-panel-alt text-[10px] text-text-faint">
                  Awaiting raster artifact…
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      </div>

      <GlassCard hover={false} className="border-dashed border-border/80 bg-panel/40 text-[11px] leading-relaxed text-text-muted">
        <p className="font-medium text-text">How heat spots are produced</p>
        <p className="mt-1">
          LST pixels are classified into Low → Extreme stress, then clustered into street-scale detections along the
          Western Line (Churchgate → Palghar). Each detection carries coordinates, peak LST, and SHAP drivers so the
          map behaves like a live EO console — with demo-mode synthetic rasters standing in for offline satellite
          downloads (real GEE/CDS adapters remain pluggable).
        </p>
      </GlassCard>
    </section>
  )
}

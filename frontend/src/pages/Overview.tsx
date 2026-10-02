import { useEffect, useState } from 'react'
import { Brain, Cpu, Leaf, Radio, MapPin, TrendingUp, Satellite } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { api, type HeatmapResponse } from '../lib/api'
import { fmtTemp, fmtArea, fmtNum } from '../lib/format'
import { PageShell } from '../components/layout/PageShell'
import { HeroBand } from '../components/sections/HeroBand'
import { MetricStrip } from '../components/sections/MetricStrip'
import { PipelineFlow } from '../components/sections/PipelineFlow'
import { ModuleCard } from '../components/sections/ModuleCard'
import { SatelliteIngestPanel } from '../components/sections/SatelliteIngestPanel'
import { GlassCard } from '../components/ui/GlassCard'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { GradientButton } from '../components/ui/GradientButton'
import { useAppStore } from '../store/appStore'
import { useSelectionStore } from '../store/selectionStore'

export default function Overview() {
  const zones = useAppStore((s) => s.zones)
  const zoneId = useSelectionStore((s) => s.zoneId)
  const setZoneId = useSelectionStore((s) => s.setZoneId)
  const activeId = zoneId ?? zones[0]?.id ?? null
  const activeZone = zones.find((z) => z.id === activeId)

  const [heat, setHeat] = useState<HeatmapResponse | null>(null)
  const [iot, setIot] = useState<number | null>(null)
  const [forecastPeak, setForecastPeak] = useState<number | null>(null)
  const [zoneDetail, setZoneDetail] = useState<Record<string, unknown> | null>(null)
  const [zoneInsight, setZoneInsight] = useState<string>('')
  const [zoneForecast, setZoneForecast] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoneLoading, setZoneLoading] = useState(false)
  const [thumbs, setThumbs] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!zoneId && zones[0]?.id) setZoneId(zones[0].id)
  }, [zones, zoneId, setZoneId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [h, i, fc, layers] = await Promise.allSettled([
        api.heatmap('heat_stress'),
        api.iotLatest(),
        api.forecastCitywide(),
        Promise.all(['lst', 'ndvi', 'ndbi', 'svf'].map((l) => api.heatmap(l))),
      ])
      if (cancelled) return
      if (h.status === 'fulfilled') setHeat(h.value)
      if (i.status === 'fulfilled') setIot(i.value.temp_c)
      if (fc.status === 'fulfilled') {
        const peak = Math.max(...(fc.value.series?.map((p) => p.value) ?? [0]), 0)
        setForecastPeak(peak || null)
      }
      if (layers.status === 'fulfilled') {
        const t: Record<string, string> = {}
        ;['lst', 'ndvi', 'ndbi', 'svf'].forEach((k, idx) => {
          const img = layers.value[idx]?.image_png_b64
          if (img) t[k] = img
        })
        setThumbs(t)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!activeId) return
    let cancelled = false
    setZoneLoading(true)
    Promise.allSettled([
      api.heatmapZone(activeId),
      api.driversZone(activeId),
      api.forecast(activeId),
    ]).then(([zd, dr, fc]) => {
      if (cancelled) return
      if (zd.status === 'fulfilled') setZoneDetail(zd.value)
      else setZoneDetail(null)
      if (dr.status === 'fulfilled') setZoneInsight(dr.value.insight ?? '')
      if (fc.status === 'fulfilled') {
        const h48 = fc.value.horizons?.['48']?.value
        const last = fc.value.series?.[fc.value.series.length - 1]?.value
        setZoneForecast(h48 ?? last ?? null)
      }
      setZoneLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [activeId])

  const hotspots = heat?.hotspots ?? []
  const hottest = hotspots.reduce(
    (best, h) => (h.peak_lst > (best?.peak_lst ?? -999) ? h : best),
    hotspots[0],
  )
  const hotspotArea = hotspots.reduce((s, h) => s + (h.area_km2 || 0), 0)
  const meanLst = typeof zoneDetail?.mean_lst === 'number' ? (zoneDetail.mean_lst as number) : heat?.stats?.mean ?? 0
  const maxLst = typeof zoneDetail?.max_lst === 'number' ? (zoneDetail.max_lst as number) : hottest?.peak_lst ?? 0
  const areaKm2 = typeof zoneDetail?.area_km2 === 'number' ? (zoneDetail.area_km2 as number) : hotspotArea

  const metrics = [
    { label: activeZone ? `${activeZone.name} mean LST` : 'Mean LST', value: meanLst, unit: '°C' },
    { label: 'Micro-hotspots', value: hotspots.length || 0, suffix: '' },
    { label: activeZone ? 'Zone peak LST' : 'Hottest detection', value: maxLst, unit: '°C' },
    { label: activeZone ? 'Zone 48h peak' : 'City 48h peak', value: zoneForecast ?? forecastPeak ?? 0, unit: '°C' },
    { label: 'IoT live', value: iot ?? 0, unit: '°C' },
    { label: 'EO grid cells', value: (heat?.width ?? 0) * (heat?.height ?? 0) || 14000, suffix: '' },
  ]

  return (
    <PageShell className="space-y-10">
      <HeroBand />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeId ?? 'city'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge color="cyan">
              <MapPin size={10} className="mr-1 inline" />
              {activeZone?.name ?? 'Citywide'}
            </Badge>
            <Badge color="amber">
              <Satellite size={10} className="mr-1 inline" />
              LST from Landsat thermal path
            </Badge>
            <span className="text-[10px] text-text-muted">
              KPIs update when you change the zone · detections are EO-derived
            </span>
          </div>
          {loading || zoneLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <MetricStrip metrics={metrics} />
          )}
        </motion.div>
      </AnimatePresence>

      {activeZone && (
        <GlassCard className="border-accent-cyan/20 bg-gradient-to-br from-panel to-panel-alt">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[10px] uppercase tracking-wider text-accent-cyan">Zone spotlight · EO attribution</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight">{activeZone.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {zoneInsight || 'Loading SHAP insight for this zone…'}
              </p>
              <p className="mt-2 text-[11px] text-text-faint">
                Surface heating here is inferred from thermal + optical satellite features (LST, NDVI, NDBI, SVF), then
                validated against the live IoT node where available.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-right">
              <div>
                <p className="text-[10px] text-text-muted">Population proxy</p>
                <p className="font-mono text-lg tabular-nums">{fmtNum(activeZone.population_proxy ?? 0, 0)}</p>
              </div>
              <div>
                <p className="text-[10px] text-text-muted">Area</p>
                <p className="font-mono text-lg tabular-nums">{fmtArea(activeZone.area_km2 ?? 0)}</p>
              </div>
              <div>
                <p className="text-[10px] text-text-muted">Mean LST</p>
                <p className="font-mono text-lg tabular-nums text-thermal-high">{fmtTemp(meanLst)}</p>
              </div>
              <div>
                <p className="text-[10px] text-text-muted">48h outlook</p>
                <p className="font-mono text-lg tabular-nums">
                  <TrendingUp size={14} className="mr-1 inline text-thermal-ext" />
                  {fmtTemp(zoneForecast ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      <SatelliteIngestPanel thumbs={thumbs} />

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Pipeline</p>
            <h2 className="text-xl font-semibold tracking-tight">Four-layer intelligence stack</h2>
          </div>
          <Link to="/heatmap">
            <GradientButton className="text-xs">Open live heat map</GradientButton>
          </Link>
        </div>
        <PipelineFlow />
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ModuleCard
          title="Satellite data fusion"
          desc="Landsat 8 LST + Sentinel-2 indices + ERA5 met + OSM morphology on a shared 30 m grid."
          icon={Cpu}
          accent="cyan"
          spark={[32, 34, 33, 36, 38, 40, 39]}
        />
        <ModuleCard
          title="Physics-informed ML"
          desc="Energy-balance PINN constrains latent fluxes so detections stay physically plausible."
          icon={Brain}
          accent="violet"
          spark={[12, 11, 10, 9, 8, 7]}
        />
        <ModuleCard
          title="Intervention optimizer"
          desc="NSGA-II Pareto cooling vs cost — scenarios rooted in satellite-derived stress maps."
          icon={Leaf}
          accent="emerald"
          spark={[5, 6, 7, 8, 9, 11]}
        />
        <ModuleCard
          title="IoT ground truth"
          desc="ESP32 + DHT11 validates satellite LST vs air temperature with live SSE telemetry."
          icon={Radio}
          accent="amber"
          spark={[28, 29, 31, 30, 32, 33]}
        />
      </section>
    </PageShell>
  )
}

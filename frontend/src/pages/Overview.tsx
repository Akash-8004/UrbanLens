import { useEffect, useState } from 'react'
import { Brain, Cpu, Leaf, Radio, MapPin, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type HeatmapResponse } from '../lib/api'
import { fmtTemp, fmtArea, fmtNum } from '../lib/format'
import { PageShell } from '../components/layout/PageShell'
import { HeroBand } from '../components/sections/HeroBand'
import { MetricStrip } from '../components/sections/MetricStrip'
import { PipelineFlow } from '../components/sections/PipelineFlow'
import { ModuleCard } from '../components/sections/ModuleCard'
import { GlassCard } from '../components/ui/GlassCard'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
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

  // Default zone once list arrives
  useEffect(() => {
    if (!zoneId && zones[0]?.id) setZoneId(zones[0].id)
  }, [zones, zoneId, setZoneId])

  // City-wide bootstrap (once)
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

  // Zone-reactive panel
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
  const hotspotArea = hotspots.reduce((s, h) => s + h.area_km2, 0)
  const meanLst = typeof zoneDetail?.mean_lst === 'number' ? (zoneDetail.mean_lst as number) : heat?.stats?.mean ?? 0
  const maxLst = typeof zoneDetail?.max_lst === 'number' ? (zoneDetail.max_lst as number) : hottest?.peak_lst ?? 0
  const areaKm2 = typeof zoneDetail?.area_km2 === 'number' ? (zoneDetail.area_km2 as number) : hotspotArea

  const metrics = [
    { label: activeZone ? `${activeZone.name} mean LST` : 'Mean LST', value: meanLst, unit: '°C' },
    { label: activeZone ? 'Zone area' : 'Hotspot area', value: areaKm2, unit: ' km²' },
    { label: activeZone ? 'Zone peak LST' : 'Hottest zone', value: maxLst, unit: '°C' },
    { label: activeZone ? 'Zone 48h peak' : 'City 48h peak', value: zoneForecast ?? forecastPeak ?? 0, unit: '°C' },
    { label: 'IoT live', value: iot ?? 0, unit: '°C' },
    { label: 'Zones tracked', value: zones.length || 12, suffix: '' },
  ]

  return (
    <PageShell className="space-y-8">
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
            <span className="text-[10px] text-text-muted">
              KPIs update when you change the zone in the top bar
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
              <p className="text-[10px] uppercase tracking-wider text-accent-cyan">Zone spotlight</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight">{activeZone.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {zoneInsight || 'Loading SHAP insight for this zone…'}
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

      <section>
        <p className="text-[10px] uppercase tracking-wider text-text-muted">Pipeline</p>
        <h2 className="text-xl font-semibold tracking-tight">Four-layer intelligence stack</h2>
        <div className="mt-4">
          <PipelineFlow />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ModuleCard title="Data Fusion" desc="Multi-source ingest with synthetic Mumbai corridor." icon={Cpu} accent="cyan" spark={[32, 34, 33, 36, 38]} />
        <ModuleCard title="Physics-Informed ML" desc="Energy-balance PINN constrains latent fluxes." icon={Brain} accent="violet" spark={[12, 11, 10, 9, 8]} />
        <ModuleCard title="Intervention Optimizer" desc="NSGA-II Pareto cooling vs cost trade-offs." icon={Leaf} accent="emerald" spark={[5, 6, 7, 8, 9]} />
        <ModuleCard title="IoT Integration" desc="ESP32 + DHT11 ground truth with SSE stream." icon={Radio} accent="amber" spark={[28, 29, 31, 30, 32]} />
      </section>

      <section>
        <p className="mb-3 text-[10px] uppercase tracking-wider text-text-muted">City context rasters</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {['lst', 'ndvi', 'ndbi', 'svf'].map((k) => (
            <GlassCard key={k} hover={false} className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-text-muted">{k}</p>
                <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan" />
              </div>
              {thumbs[k] ? (
                <img
                  src={`data:image/png;base64,${thumbs[k]}`}
                  alt={k}
                  className="h-28 w-full object-cover opacity-90"
                />
              ) : (
                <Skeleton className="h-28 w-full rounded-none" />
              )}
            </GlassCard>
          ))}
        </div>
      </section>
    </PageShell>
  )
}

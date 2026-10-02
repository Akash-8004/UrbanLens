import { useEffect, useState } from 'react'
import { api, type ForecastResponse } from '../lib/api'
import { fmtNum } from '../lib/format'
import { PageShell } from '../components/layout/PageShell'
import { GlassCard } from '../components/ui/GlassCard'
import { Skeleton } from '../components/ui/Skeleton'
import { ForecastChart } from '../components/charts/ForecastChart'
import { Sparkline } from '../components/sensors/Sparkline'
import { StatTile } from '../components/ui/StatTile'
import { useSelectionStore } from '../store/selectionStore'
import { useAppStore } from '../store/appStore'

export default function Forecast() {
  const zoneId = useSelectionStore((s) => s.zoneId)
  const zones = useAppStore((s) => s.zones)
  const active = zoneId ?? zones[0]?.id ?? 'kurla'
  const [zoneFc, setZoneFc] = useState<ForecastResponse | null>(null)
  const [city, setCity] = useState<ForecastResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return
    setErr(null)
    Promise.allSettled([api.forecast(active), api.forecastCitywide()]).then(([z, c]) => {
      if (z.status === 'fulfilled') setZoneFc(z.value)
      else setErr(z.reason?.message)
      if (c.status === 'fulfilled') setCity(c.value)
    })
  }, [active])

  const horizons = zoneFc?.horizons ?? {}

  return (
    <PageShell className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text-muted">48-hour outlook</p>
        <h2 className="text-xl font-semibold">Heat stress forecast</h2>
      </div>
      {err && <p className="text-sm text-thermal-ext">{err}</p>}
      <GlassCard>
        {!zoneFc?.series?.length ? <Skeleton className="h-80" /> : <ForecastChart series={zoneFc.series} />}
      </GlassCard>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {['6', '12', '24', '48'].map((h) => (
          <StatTile
            key={h}
            label={`+${h}h`}
            value={horizons[h]?.value ?? 0}
            unit="°C"
          />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard>
          <p className="text-xs text-text-muted">RMSE</p>
          <p className="font-mono text-lg">{fmtNum(zoneFc?.metrics?.rmse ?? 0, 2)}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs text-text-muted">Skill vs persistence</p>
          <p className="font-mono text-lg">{fmtNum(zoneFc?.metrics?.skill ?? 0, 2)}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs text-text-muted">Citywide sparkline</p>
          <Sparkline values={city?.series?.map((p) => p.value) ?? []} color="#F59E0B" />
        </GlassCard>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        {zones.slice(0, 8).map((z) => (
          <ZoneSpark key={z.id} zoneId={z.id} name={z.name} />
        ))}
      </div>
    </PageShell>
  )
}

function ZoneSpark({ zoneId, name }: { zoneId: string; name: string }) {
  const [vals, setVals] = useState<number[]>([])
  useEffect(() => {
    api.forecast(zoneId).then((r) => setVals(r.series?.map((p) => p.value) ?? [])).catch(() => setVals([]))
  }, [zoneId])
  return (
    <GlassCard className="p-3" hover={false}>
      <p className="text-[10px] text-text-muted">{name}</p>
      {vals.length ? <Sparkline values={vals} /> : <Skeleton className="mt-2 h-8" />}
    </GlassCard>
  )
}

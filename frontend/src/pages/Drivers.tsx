import { useEffect, useState } from 'react'
import { api, type DriversGlobalResponse, type CorrelationsResponse } from '../lib/api'
import { PageShell } from '../components/layout/PageShell'
import { GlassCard } from '../components/ui/GlassCard'
import { Skeleton } from '../components/ui/Skeleton'
import { AttributionBar } from '../components/charts/AttributionBar'
import { BeeswarmPlot } from '../components/charts/BeeswarmPlot'
import { WaterfallChart } from '../components/charts/WaterfallChart'
import { CorrelationMatrix } from '../components/charts/CorrelationMatrix'
import { useSelectionStore } from '../store/selectionStore'
import { useAppStore } from '../store/appStore'

export default function Drivers() {
  const zoneId = useSelectionStore((s) => s.zoneId)
  const zones = useAppStore((s) => s.zones)
  const activeZone = zoneId ?? zones[0]?.id
  const [global, setGlobal] = useState<DriversGlobalResponse | null>(null)
  const [zone, setZone] = useState<{ insight?: string; importance: DriversGlobalResponse['global_importance'] } | null>(null)
  const [corr, setCorr] = useState<CorrelationsResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    api.driversGlobal().then(setGlobal).catch((e) => setErr(e.message))
    api.driversCorrelations().then(setCorr).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!activeZone) return
    api
      .driversZone(activeZone)
      .then((r) => setZone({ insight: r.insight, importance: r.importance }))
      .catch(() => setZone(null))
  }, [activeZone])

  const bars = zone?.importance?.length ? zone.importance : global?.global_importance ?? []

  return (
    <PageShell className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text-muted">Explainability</p>
        <h2 className="text-xl font-semibold">SHAP driver attribution</h2>
      </div>
      {err && <p className="text-sm text-thermal-ext">{err}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h3 className="mb-2 text-sm font-medium">Global importance</h3>
          {!global ? <Skeleton className="h-64" /> : <AttributionBar data={bars} />}
        </GlassCard>
        <GlassCard>
          <h3 className="mb-2 text-sm font-medium">Zone insight</h3>
          {!zone ? (
            <Skeleton className="h-24" />
          ) : (
            <p className="text-sm leading-relaxed text-text-muted">{zone.insight ?? 'Select a zone in the top bar.'}</p>
          )}
        </GlassCard>
        <GlassCard className="lg:col-span-2">
          <h3 className="mb-2 text-sm font-medium">Beeswarm</h3>
          {!global?.beeswarm ? <Skeleton className="h-64" /> : <BeeswarmPlot beeswarm={global.beeswarm} />}
        </GlassCard>
        <GlassCard>
          <h3 className="mb-2 text-sm font-medium">Waterfall (hottest pixel)</h3>
          {!global ? <Skeleton className="h-56" /> : <WaterfallChart waterfall={global.waterfall} />}
        </GlassCard>
        <GlassCard>
          <h3 className="mb-2 text-sm font-medium">Feature correlations</h3>
          {!corr ? (
            <Skeleton className="h-56" />
          ) : (
            <CorrelationMatrix features={corr.features} matrix={corr.matrix} />
          )}
        </GlassCard>
      </div>
    </PageShell>
  )
}

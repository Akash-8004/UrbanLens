import { useEffect, useState } from 'react'
import { api, type Intervention, type OptimizeResponse, type PlanResponse } from '../lib/api'
import { fmtCurrencyCr, fmtTemp } from '../lib/format'
import { PageShell } from '../components/layout/PageShell'
import { GlassCard } from '../components/ui/GlassCard'
import { Skeleton } from '../components/ui/Skeleton'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Slider } from '../components/ui/Slider'
import { ParetoScatter } from '../components/charts/ParetoScatter'
import { useSelectionStore } from '../store/selectionStore'
import { useAppStore } from '../store/appStore'

type BudgetPreset = 'low' | 'medium' | 'high'

export default function Optimizer() {
  const zoneId = useSelectionStore((s) => s.zoneId)
  const zones = useAppStore((s) => s.zones)
  const active = zoneId ?? zones[0]?.id ?? 'kurla'
  const [catalogue, setCatalogue] = useState<Intervention[]>([])
  const [preset, setPreset] = useState<BudgetPreset>('medium')
  const [budget, setBudget] = useState(0.5)
  const [weights, setWeights] = useState({ cooling: 0.5, cost: 0.3, cobenefit: 0.2 })
  const [opt, setOpt] = useState<OptimizeResponse | null>(null)
  const [plan, setPlan] = useState<PlanResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.interventionsCatalogue().then((r) => setCatalogue(r.interventions ?? [])).catch(() => undefined)
    api.interventionsPlan().then(setPlan).catch(() => undefined)
  }, [])

  const runOptimize = () => {
    setLoading(true)
    api
      .interventionsOptimize({ zone_id: active, budget, weights })
      .then(setOpt)
      .catch(() => setOpt(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    runOptimize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, preset])

  useEffect(() => {
    const b = preset === 'low' ? 0.25 : preset === 'high' ? 0.85 : 0.5
    setBudget(b)
    api.interventionsPlan(b).then(setPlan).catch(() => undefined)
  }, [preset])

  const rec = opt?.recommended ?? opt?.presets?.[preset]

  return (
    <PageShell className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">NSGA-II</p>
          <h2 className="text-xl font-semibold">Intervention optimizer</h2>
        </div>
        <SegmentedControl
          options={[
            { value: 'low' as const, label: 'Low budget' },
            { value: 'medium' as const, label: 'Medium' },
            { value: 'high' as const, label: 'High' },
          ]}
          value={preset}
          onChange={setPreset}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          {loading || !opt ? <Skeleton className="h-72" /> : <ParetoScatter points={opt.pareto} highlight={rec} />}
        </GlassCard>
        <GlassCard>
          <h3 className="text-sm font-medium">Recommended</h3>
          {!rec ? (
            <Skeleton className="mt-4 h-24" />
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-text-muted">
              <li>Cooling: {fmtTemp(rec.cooling)}</li>
              <li>Cost index: {rec.cost.toFixed(2)}</li>
              <li>Co-benefit: {(rec.cobenefit * 100).toFixed(0)}%</li>
            </ul>
          )}
          <button type="button" className="mt-4 text-xs text-accent-cyan" onClick={runOptimize}>
            Re-run optimize
          </button>
        </GlassCard>
      </div>
      <GlassCard>
        <h3 className="mb-3 text-sm font-medium">What-if weights</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Slider label="Cooling" value={weights.cooling} onChange={(v) => setWeights((w) => ({ ...w, cooling: v }))} />
          <Slider label="Cost" value={weights.cost} onChange={(v) => setWeights((w) => ({ ...w, cost: v }))} />
          <Slider label="Co-benefit" value={weights.cobenefit} onChange={(v) => setWeights((w) => ({ ...w, cobenefit: v }))} />
        </div>
        <Slider className="mt-4" label="Budget cap" value={budget} onChange={setBudget} min={0.1} max={1} />
      </GlassCard>
      <GlassCard>
        <h3 className="text-sm font-medium">City plan</h3>
        {!plan ? (
          <Skeleton className="mt-2 h-16" />
        ) : (
          <p className="mt-2 text-sm text-text-muted">
            {fmtCurrencyCr(plan.total_cost_cr)} · {fmtTemp(plan.total_cooling_c)} total · {plan.area_km2.toFixed(1)} km²
          </p>
        )}
      </GlassCard>
      <GlassCard>
        <h3 className="mb-2 text-sm font-medium">Catalogue</h3>
        <ul className="space-y-1 text-xs text-text-muted">
          {catalogue.length ? (
            catalogue.map((c) => <li key={c.id}>{c.name}</li>)
          ) : (
            <Skeleton className="h-20" />
          )}
        </ul>
      </GlassCard>
    </PageShell>
  )
}

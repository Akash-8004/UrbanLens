import { useEffect, useState } from 'react'
import { api, type ModelEntry, type ProvenanceSource } from '../lib/api'
import { PageShell } from '../components/layout/PageShell'
import { GlassCard } from '../components/ui/GlassCard'
import { Skeleton } from '../components/ui/Skeleton'
import { PipelineFlow } from '../components/sections/PipelineFlow'
import { ResidualChart } from '../components/charts/ResidualChart'
import { GradientButton } from '../components/ui/GradientButton'
import { useAppStore } from '../store/appStore'

export default function About() {
  const setToast = useAppStore((s) => s.setToast)
  const [models, setModels] = useState<ModelEntry[]>([])
  const [sources, setSources] = useState<ProvenanceSource[]>([])
  const [pinn, setPinn] = useState<Awaited<ReturnType<typeof api.pinnMetrics>> | null>(null)

  useEffect(() => {
    api.models().then((m) => setModels(m.models ?? [])).catch(() => undefined)
    api.provenance().then((p) => setSources(p.sources ?? [])).catch(() => undefined)
    api.pinnMetrics().then(setPinn).catch(() => undefined)
  }, [])

  const exportPdf = async () => {
    try {
      const blob = await api.exportReportPdf()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'urbanlens-report.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setToast({ message: 'PDF export requires backend', type: 'error' })
    }
  }

  return (
    <PageShell className="space-y-8">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text-muted">Documentation</p>
        <h2 className="text-xl font-semibold">Architecture & provenance</h2>
      </div>
      <PipelineFlow />
      <GlassCard>
        <h3 className="mb-3 text-sm font-medium">Data provenance</h3>
        {!sources.length ? (
          <Skeleton className="h-24" />
        ) : (
          <ul className="space-y-2 text-xs">
            {sources.map((s) => (
              <li key={s.name} className="flex justify-between gap-4 border-b border-border/40 pb-2">
                <span>{s.name}</span>
                <span className={s.synthetic ? 'text-thermal-high' : 'text-accent-emerald'}>
                  {s.synthetic ? 'Synthetic' : 'Real'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
      <GlassCard>
        <h3 className="mb-3 text-sm font-medium">Model registry</h3>
        {!models.length ? (
          <Skeleton className="h-32" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-text-muted">
                <tr>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Version</th>
                  <th className="pb-2">Metrics</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.name} className="border-t border-border/40">
                    <td className="py-2 font-mono">{m.name}</td>
                    <td className="py-2">{m.version}</td>
                    <td className="py-2 text-text-muted">{JSON.stringify(m.metrics ?? {})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
      {pinn?.chart && (
        <GlassCard>
          <h3 className="mb-2 text-sm font-medium">PINN vs ablation</h3>
          <ResidualChart data={pinn.chart} />
          {pinn.ood_improvement_pct != null && (
            <p className="mt-2 text-xs text-accent-violet">OOD improvement {pinn.ood_improvement_pct.toFixed(1)}%</p>
          )}
        </GlassCard>
      )}
      <GlassCard>
        <h3 className="text-sm font-medium">Limitations</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-text-muted">
          <li>LST from satellite differs from air temperature measured at 2 m — IoT helps bridge the gap with bias correction.</li>
          <li>Default demo uses seeded synthetic Mumbai corridor data; real GEE/CDS adapters are optional.</li>
          <li>Optimizer results are scenario-level guidance, not municipal engineering sign-off.</li>
        </ul>
        <GradientButton className="mt-4" onClick={exportPdf}>
          Download PDF report
        </GradientButton>
      </GlassCard>
    </PageShell>
  )
}

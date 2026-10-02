import { useEffect, useState } from 'react'
import { api, iotStreamUrl, type IotReading, type IotValidationResponse } from '../lib/api'
import { PageShell } from '../components/layout/PageShell'
import { GlassCard } from '../components/ui/GlassCard'
import { Skeleton } from '../components/ui/Skeleton'
import { LiveGauge } from '../components/sensors/LiveGauge'
import { SensorCard } from '../components/sensors/SensorCard'
import { ComparisonChart } from '../components/charts/ComparisonChart'
import { fmtNum } from '../lib/format'

const BOM = [
  { part: 'ESP32 DevKit', qty: 1 },
  { part: 'DHT11', qty: 1 },
  { part: 'LDR + 10kΩ', qty: 1 },
  { part: 'USB power / 5V', qty: 1 },
]

export default function Sensors() {
  const [reading, setReading] = useState<IotReading | null>(null)
  const [history, setHistory] = useState<number[]>([])
  const [validation, setValidation] = useState<IotValidationResponse | null>(null)
  const [streamErr, setStreamErr] = useState<string | null>(null)

  useEffect(() => {
    api.iotLatest().then(setReading).catch(() => undefined)
    api.iotHistory(24).then((h) => setHistory(h.readings?.map((r) => r.temp_c) ?? [])).catch(() => undefined)
    api.iotValidation().then(setValidation).catch(() => undefined)
  }, [])

  useEffect(() => {
    let es: EventSource | null = null
    try {
      es = new EventSource(iotStreamUrl())
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as IotReading
          setReading(data)
          setHistory((prev) => [...prev.slice(-47), data.temp_c])
        } catch {
          /* ignore */
        }
      }
      es.onerror = () => setStreamErr('SSE offline — showing last snapshot')
    } catch {
      setStreamErr('EventSource unavailable')
    }
    return () => es?.close()
  }, [])

  const comp =
    validation?.comparisons?.map((c) => ({
      label: c.source,
      a: c.temp_c,
      b: (c.temp_c ?? 0) - (c.delta ?? 0),
    })) ?? []

  return (
    <PageShell className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text-muted">Ground truth</p>
        <h2 className="text-xl font-semibold">Live IoT feed</h2>
        <p className="text-xs text-text-muted">Demo stream may run at 5s cadence (accelerated).</p>
      </div>
      {streamErr && <p className="text-xs text-thermal-high">{streamErr}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard className="flex justify-center md:col-span-1">
          <LiveGauge reading={reading} />
        </GlassCard>
        <SensorCard reading={reading ?? undefined} history={history} />
        <GlassCard>
          <h3 className="text-sm font-medium">Validation</h3>
          {!validation ? (
            <Skeleton className="mt-4 h-32" />
          ) : (
            <>
              {validation.era5_bias && (
                <p className="mt-2 text-xs text-text-muted">
                  ERA5 bias R² {fmtNum(validation.era5_bias.r2, 3)} · slope {fmtNum(validation.era5_bias.slope, 3)}
                </p>
              )}
              {comp.length > 0 && <ComparisonChart series={comp} />}
              {validation.notes && <p className="mt-2 text-[10px] text-text-faint">{validation.notes}</p>}
            </>
          )}
        </GlassCard>
      </div>
      <GlassCard>
        <h3 className="mb-2 text-sm font-medium">Hardware BOM</h3>
        <table className="w-full text-xs text-text-muted">
          <tbody>
            {BOM.map((b) => (
              <tr key={b.part} className="border-b border-border/40">
                <td className="py-1">{b.part}</td>
                <td className="py-1 text-right font-mono">{b.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </PageShell>
  )
}

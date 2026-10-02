import { GlassCard } from '../ui/GlassCard'
import { fmtTs, fmtTemp } from '../../lib/format'
import type { IotReading } from '../../lib/api'
import { Sparkline } from './Sparkline'
import { StatusPulse } from './StatusPulse'

export function SensorCard({
  reading,
  history,
}: {
  reading?: IotReading
  history?: number[]
}) {
  return (
    <GlassCard>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-accent-cyan">{reading?.node_id ?? 'NODE'}</p>
          <p className="text-2xl font-mono tabular-nums">{reading ? fmtTemp(reading.temp_c) : '—'}</p>
          <p className="text-[10px] text-text-muted">{reading ? fmtTs(reading.ts) : 'Waiting for stream…'}</p>
        </div>
        <StatusPulse live={!!reading} />
      </div>
      {history && <Sparkline values={history} />}
    </GlassCard>
  )
}

import { fmtTemp, fmtNum } from '../../lib/format'
import type { IotReading } from '../../lib/api'
import { StatusPulse } from './StatusPulse'

export function LiveGauge({ reading }: { reading?: IotReading | null }) {
  const t = reading?.temp_c ?? 0
  const pct = Math.min(100, Math.max(0, ((t - 24) / 20) * 100))
  return (
    <div className="relative flex flex-col items-center">
      <StatusPulse live={!!reading} />
      <svg viewBox="0 0 120 70" className="mt-2 w-40">
        <path d="M 15 65 A 45 45 0 0 1 105 65" fill="none" stroke="#1E293B" strokeWidth="8" />
        <path
          d="M 15 65 A 45 45 0 0 1 105 65"
          fill="none"
          stroke="url(#gauge)"
          strokeWidth="8"
          strokeDasharray={`${(pct / 100) * 141} 141`}
        />
        <defs>
          <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        <text x="60" y="58" textAnchor="middle" fill="#E2E8F0" fontSize="16" fontFamily="JetBrains Mono">
          {reading ? fmtTemp(t) : '—'}
        </text>
      </svg>
      {reading && (
        <p className="text-xs text-text-muted">
          RH {fmtNum(reading.humidity_pct, 0)}% · {reading.mode ?? reading.status ?? 'live'}
        </p>
      )}
    </div>
  )
}

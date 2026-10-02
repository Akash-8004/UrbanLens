import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ForecastPoint } from '../../lib/api'
import { ChartTooltip } from './ChartTooltip'

export function ForecastChart({ series }: { series: ForecastPoint[] }) {
  const data = series.map((p) => ({
    ts: new Date(p.ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' }),
    value: p.value,
    pi_lower: p.pi_lower,
    pi_upper: p.pi_upper,
    band: p.pi_upper != null && p.pi_lower != null ? p.pi_upper - p.pi_lower : 0,
  }))
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data}>
        <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
        <XAxis dataKey="ts" tick={{ fill: '#94A3B8', fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="pi_upper" stroke="none" fill="#22D3EE" fillOpacity={0.12} />
        <Area type="monotone" dataKey="pi_lower" stroke="none" fill="#070A12" fillOpacity={1} />
        <Line type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2} dot={false} name="Forecast" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

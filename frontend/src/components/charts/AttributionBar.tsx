import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'
import { FEATURE_NAMES } from '../../lib/constants'
import type { DriverFeature } from '../../lib/api'
import { ChartTooltip } from './ChartTooltip'

export function AttributionBar({ data }: { data: DriverFeature[] }) {
  const rows = [...data]
    .sort((a, b) => b.mean_abs_shap - a.mean_abs_shap)
    .slice(0, 10)
    .map((d) => ({
      name: FEATURE_NAMES[d.feature] ?? d.feature,
      value: d.mean_abs_shap,
      sign: (d.mean_shap ?? 0) >= 0 ? '#EF4444' : '#3B82F6',
    }))
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 8 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#94A3B8', fontSize: 10 }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="value" radius={4}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.sign} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

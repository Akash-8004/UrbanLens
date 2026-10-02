import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DriversGlobalResponse } from '../../lib/api'
import { FEATURE_NAMES } from '../../lib/constants'
import { ChartTooltip } from './ChartTooltip'

export function WaterfallChart({ waterfall }: { waterfall: DriversGlobalResponse['waterfall'] }) {
  const rows = (waterfall ?? []).map((w, i) => ({
    name: FEATURE_NAMES[w.feature] ?? w.feature,
    shap: w.shap,
    fill: w.shap >= 0 ? '#EF4444' : '#3B82F6',
    i,
  }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows}>
        <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={60} />
        <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="shap" radius={3}>
          {rows.map((r) => (
            <Cell key={r.i} fill={r.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

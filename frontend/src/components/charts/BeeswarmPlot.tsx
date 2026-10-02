import { Scatter, ScatterChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FEATURE_NAMES } from '../../lib/constants'
import { ChartTooltip } from './ChartTooltip'

export function BeeswarmPlot({
  beeswarm,
}: {
  beeswarm: { feature: string; shap: number; value: number }[]
}) {
  const data = beeswarm.slice(0, 400).map((b, i) => ({
    x: b.shap,
    y: i % 20,
    feature: FEATURE_NAMES[b.feature] ?? b.feature,
    value: b.value,
  }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ScatterChart margin={{ left: 8, right: 8 }}>
        <XAxis type="number" dataKey="x" name="SHAP" tick={{ fill: '#94A3B8', fontSize: 10 }} />
        <YAxis hide type="number" dataKey="y" />
        <Tooltip content={<ChartTooltip />} />
        <Scatter data={data} fill="#22D3EE" fillOpacity={0.5} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

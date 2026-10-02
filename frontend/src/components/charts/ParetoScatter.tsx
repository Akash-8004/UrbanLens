import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import type { ParetoPoint } from '../../lib/api'
import { ChartTooltip } from './ChartTooltip'

export function ParetoScatter({ points, highlight }: { points: ParetoPoint[]; highlight?: ParetoPoint }) {
  const data = points.map((p) => ({ x: p.cost, y: p.cooling, z: p.cobenefit }))
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <XAxis type="number" dataKey="x" name="Cost" tick={{ fill: '#94A3B8', fontSize: 10 }} />
        <YAxis type="number" dataKey="y" name="Cooling °C" tick={{ fill: '#94A3B8', fontSize: 10 }} />
        <ZAxis type="number" dataKey="z" range={[40, 200]} />
        <Tooltip content={<ChartTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={data} fill="#8B5CF6" fillOpacity={0.7} />
        {highlight && (
          <Scatter
            data={[{ x: highlight.cost, y: highlight.cooling, z: highlight.cobenefit }]}
            fill="#10B981"
          />
        )}
      </ScatterChart>
    </ResponsiveContainer>
  )
}

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

export function ComparisonChart({
  series,
}: {
  series: { label: string; a: number; b: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={series}>
        <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} />
        <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} />
        <Tooltip content={<ChartTooltip />} />
        <Line type="monotone" dataKey="a" stroke="#06B6D4" dot={false} name="Sensor" />
        <Line type="monotone" dataKey="b" stroke="#F59E0B" dot={false} name="Model" />
      </LineChart>
    </ResponsiveContainer>
  )
}

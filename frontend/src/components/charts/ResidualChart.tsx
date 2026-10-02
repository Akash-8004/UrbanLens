import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

export function ResidualChart({
  data,
}: {
  data: { label: string; with_physics: number; without_physics: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid stroke="#1E293B" />
        <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} />
        <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="with_physics" fill="#8B5CF6" name="PINN" radius={4} />
        <Bar dataKey="without_physics" fill="#475569" name="Ablation" radius={4} />
      </BarChart>
    </ResponsiveContainer>
  )
}

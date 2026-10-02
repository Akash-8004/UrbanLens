export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-panel-alt px-3 py-2 text-xs shadow-glow">
      {label && <p className="mb-1 font-mono text-text-muted">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-mono tabular-nums">{p.value?.toFixed?.(2) ?? p.value}</span>
        </p>
      ))}
    </div>
  )
}

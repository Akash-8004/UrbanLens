import { FEATURE_NAMES } from '../../lib/constants'

export function CorrelationMatrix({
  features,
  matrix,
}: {
  features: string[]
  matrix: number[][]
}) {
  const cell = (v: number) => {
    const t = (v + 1) / 2
    const r = Math.round(59 + t * (239 - 59))
    const g = Math.round(130 + (1 - Math.abs(v)) * 80)
    const b = Math.round(246 - t * 100)
    return `rgb(${r},${g},${b})`
  }
  return (
    <div className="overflow-auto">
      <table className="border-collapse text-[10px]">
        <thead>
          <tr>
            <th />
            {features.map((f) => (
              <th key={f} className="p-1 font-mono text-text-muted">
                {(FEATURE_NAMES[f] ?? f).slice(0, 6)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td className="p-1 font-mono text-text-muted">{(FEATURE_NAMES[features[i]] ?? features[i]).slice(0, 8)}</td>
              {row.map((v, j) => (
                <td key={j} className="p-0">
                  <div
                    className="flex h-6 w-8 items-center justify-center font-mono tabular-nums text-bg"
                    style={{ background: cell(v) }}
                    title={v.toFixed(2)}
                  >
                    {v.toFixed(1)}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

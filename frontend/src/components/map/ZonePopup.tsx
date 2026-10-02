import { Link } from 'react-router-dom'
import type { Zone } from '../../lib/api'
import { fmtArea } from '../../lib/format'
import { GradientButton } from '../ui/GradientButton'

export function ZonePopup({
  zone,
  insight,
  drivers,
}: {
  zone: Zone
  insight?: string
  drivers?: string[]
}) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-semibold">{zone.name}</p>
        <p className="text-xs text-text-muted">{fmtArea(zone.area_km2)}</p>
      </div>
      {insight && <p className="text-xs leading-relaxed text-text-muted">{insight}</p>}
      {drivers?.length ? (
        <ul className="list-inside list-disc text-xs text-text-muted">
          {drivers.slice(0, 3).map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <Link to="/drivers">
          <GradientButton variant="ghost" className="text-xs">
            Drivers
          </GradientButton>
        </Link>
        <Link to="/optimizer">
          <GradientButton className="text-xs">Optimize</GradientButton>
        </Link>
      </div>
    </div>
  )
}

import { Badge } from './Badge'
import { useAppStore } from '../../store/appStore'

export function DataProvenanceTag() {
  const provenance = useAppStore((s) => s.provenance)
  const synthetic =
    provenance?.global_synthetic ??
    provenance?.sources?.every((s) => s.synthetic) ??
    true
  return (
    <Badge color={synthetic ? 'amber' : 'emerald'} className="cursor-default">
      {synthetic ? 'Synthetic / Demo Data' : 'Mixed Sources'}
    </Badge>
  )
}

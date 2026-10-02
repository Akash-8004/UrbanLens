import { useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { useAppStore } from '../../store/appStore'

const SHORTCUTS = [
  { key: '?', action: 'Show shortcuts' },
  { key: 'G then H', action: 'Go to Heat Map' },
  { key: 'Esc', action: 'Close drawer / modal' },
]

export function CommandHint() {
  const open = useAppStore((s) => s.commandOpen)
  const setOpen = useAppStore((s) => s.setCommandOpen)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts">
      <ul className="space-y-2 text-sm text-text-muted">
        {SHORTCUTS.map((s) => (
          <li key={s.key} className="flex justify-between gap-4">
            <kbd className="font-mono text-xs text-accent-cyan">{s.key}</kbd>
            <span>{s.action}</span>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

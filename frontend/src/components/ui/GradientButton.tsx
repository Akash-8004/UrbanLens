import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'

type Props = {
  children: React.ReactNode
  className?: string
  variant?: 'primary' | 'ghost'
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}

export function GradientButton({
  children,
  className,
  variant = 'primary',
  onClick,
  type = 'button',
  disabled,
}: Props) {
  const base =
    variant === 'primary'
      ? 'bg-gradient-to-r from-thermal-high to-thermal-ext text-bg font-semibold'
      : 'border border-border bg-panel-alt text-text hover:border-accent-cyan/50'
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={cn('rounded-lg px-4 py-2 text-sm transition-shadow disabled:opacity-50', base, className)}
    >
      {children}
    </motion.button>
  )
}

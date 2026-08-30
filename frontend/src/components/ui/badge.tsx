import type { ReactNode } from 'react'

import { cn } from '../../lib/utils'

type BadgeVariant = 'success' | 'info' | 'warning' | 'danger' | 'neutral'

const variants: Record<BadgeVariant, string> = {
  success: 'bg-mint-100 text-mint-800',
  info: 'bg-brand-100 text-brand-800',
  warning: 'bg-sunny-100 text-sunny-800',
  danger: 'bg-coral-100 text-coral-700',
  neutral: 'bg-slate-100 text-slate-600',
}

export interface BadgeProps {
  variant?: BadgeVariant
  icon?: ReactNode
  className?: string
  children: ReactNode
}

export function Badge({ variant = 'neutral', icon, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold',
        variants[variant],
        className,
      )}
    >
      {icon && <span aria-hidden className="shrink-0">{icon}</span>}
      {children}
    </span>
  )
}
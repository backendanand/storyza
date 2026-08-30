import * as React from 'react'

import { cn } from '../../lib/utils'

type ButtonVariant =
  | 'default'
  | 'outline'
  | 'ghost'
  | 'secondary'
  | 'sunny'
  | 'coral'
  | 'mint'
  | 'grape'
type ButtonSize = 'default' | 'sm' | 'lg' | 'xl' | 'icon'

const variants: Record<ButtonVariant, string> = {
  default:
    'bg-brand-600 text-white shadow-lift hover:bg-brand-700 focus-visible:ring-brand-300',
  outline:
    'border-2 border-brand-200 bg-white text-brand-700 hover:border-brand-300 hover:bg-brand-50 focus-visible:ring-brand-300 shadow-sm',
  ghost: 'text-slate-600 hover:bg-brand-50 hover:text-brand-800',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 focus-visible:ring-slate-300',
  sunny:
    'bg-sunny-400 text-sunny-900 shadow-sunny hover:bg-sunny-500 focus-visible:ring-sunny-300',
  coral:
    'bg-coral-500 text-white shadow-candy hover:bg-coral-600 focus-visible:ring-coral-300',
  mint:
    'bg-mint-500 text-white hover:bg-mint-600 focus-visible:ring-mint-300',
  grape:
    'bg-grape-500 text-white hover:bg-grape-600 focus-visible:ring-grape-300',
}

const sizes: Record<ButtonSize, string> = {
  default: 'h-11 px-5 text-sm',
  sm: 'h-9 px-4 text-xs',
  lg: 'h-13 px-7 text-base',
  xl: 'h-15 px-9 text-lg',
  icon: 'h-11 w-11',
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
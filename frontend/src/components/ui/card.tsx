import * as React from 'react'

import { cn } from '../../lib/utils'

type CardAccent = 'brand' | 'sunny' | 'coral' | 'mint' | 'grape'

const accents: Record<CardAccent, string> = {
  brand: 'bg-brand-400',
  sunny: 'bg-sunny-400',
  coral: 'bg-coral-400',
  mint: 'bg-mint-400',
  grape: 'bg-grape-400',
}

export function Card({
  className,
  accent,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { accent?: CardAccent }) {
  return (
    <div
      className={cn('overflow-hidden rounded-3xl border-2 border-white bg-white shadow-soft', className)}
      {...props}
    >
      {accent && <div className={cn('h-1.5 w-full', accents[accent])} />}
      {children}
    </div>
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-display text-xl text-slate-900', className)} {...props} />
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-slate-500', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}
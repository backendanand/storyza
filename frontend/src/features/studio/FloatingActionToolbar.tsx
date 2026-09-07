import { RefreshCcw, RotateCw, Trash2, ZoomIn, ZoomOut } from 'lucide-react'

import { cn } from '../../lib/utils'
import { selectObject, useStudioStore } from './studioStore'

interface FloatingActionToolbarProps {
  width: number
}

/**
 * Contextual toolbar that appears above the selected object on the canvas.
 * Keeps common transform actions (turn, bigger, smaller, delete, reset) close
 * to the object being edited instead of cluttering the right sidebar.
 */
export function FloatingActionToolbar({ width }: FloatingActionToolbarProps) {
  const scene = useStudioStore((s) => s.scene)
  const selectedId = useStudioStore((s) => s.selectedId)
  const isPlaying = useStudioStore((s) => s.isPlaying)
  const rotateSelected = useStudioStore((s) => s.rotateSelected)
  const scaleSelected = useStudioStore((s) => s.scaleSelected)
  const removeSelected = useStudioStore((s) => s.removeSelected)
  const reset = useStudioStore((s) => s.reset)

  const object = selectedId ? selectObject(scene, selectedId) : undefined
  if (!object || isPlaying || !object.visible) return null

  const actions = [
    { label: 'Turn', icon: RotateCw, onClick: () => rotateSelected(15), title: 'Turn selected object' },
    { label: 'Bigger', icon: ZoomIn, onClick: () => scaleSelected(1.15), title: 'Make selected object bigger' },
    { label: 'Smaller', icon: ZoomOut, onClick: () => scaleSelected(0.87), title: 'Make selected object smaller' },
    { label: 'Delete', icon: Trash2, onClick: removeSelected, title: 'Delete selected object', danger: true },
    { label: 'Reset', icon: RefreshCcw, onClick: reset, title: 'Start over on this scene' },
  ]

  // Center the toolbar over the object horizontally, clamped to the canvas.
  const left = Math.max(8, Math.min(width - 8 - 260, object.x))

  return (
    <div
      role="toolbar"
      aria-label={`Actions for ${object.name}`}
      className="absolute top-0 z-20 flex -translate-x-1/2 -translate-y-full gap-1 rounded-full border border-border-subtle bg-white/95 p-1 shadow-float backdrop-blur transition-all"
      style={{ left }}
    >
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.label}
            onClick={action.onClick}
            title={action.title}
            aria-label={action.title}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-700',
              action.danger && 'hover:bg-coral-50 hover:text-coral-600',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}

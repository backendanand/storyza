import { useEffect, useRef, useState } from 'react'

import { FloatingActionToolbar } from './FloatingActionToolbar'
import { StudioCanvas } from './StudioCanvas'

/**
 * Hero canvas area. Renders the Pixi stage inside a crisp 16:9 widescreen
 * frame with a soft light backdrop, and hosts the floating contextual toolbar
 * for the selected object.
 */
export function CanvasArea() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasWidth, setCanvasWidth] = useState(0)

  // Keep the floating toolbar within the 16:9 frame's bounds.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setCanvasWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
      {/* 16:9 stage frame — keeps its ratio but never exceeds the available space */}
      <div
        ref={containerRef}
        className="relative mx-auto aspect-video max-h-full w-full overflow-hidden rounded-2xl bg-white shadow-soft"
      >
        <StudioCanvas />
        <FloatingActionToolbar width={canvasWidth} />
      </div>
    </div>
  )
}

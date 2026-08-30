import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, Ticker } from 'pixi.js'

import { useStudioStore, selectObject } from './studioStore'

const WIDTH = 900
const HEIGHT = 520

function drawObject(kind: string, color: string, size: number): Graphics {
  const g = new Graphics()
  if (kind === 'background') {
    g.rect(0, 0, size, size * 0.6).fill(color)
    return g
  }
  // character / prop placeholder: rounded body with a "face"
  g.roundRect(0, 0, size, size, size * 0.25).fill(color)
  g.circle(size * 0.32, size * 0.38, size * 0.07).fill(0xffffff)
  g.circle(size * 0.68, size * 0.38, size * 0.07).fill(0xffffff)
  g.circle(size * 0.32, size * 0.38, size * 0.03).fill(0x1b1b1b)
  g.circle(size * 0.68, size * 0.38, size * 0.03).fill(0x1b1b1b)
  g.roundRect(size * 0.28, size * 0.58, size * 0.44, size * 0.06, size * 0.03).fill(0x8d6e63)
  return g
}

export function StudioCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const containersRef = useRef<Map<string, Container>>(new Map())
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null)

  const scene = useStudioStore((s) => s.scene)
  const selectedId = useStudioStore((s) => s.selectedId)
  const isPlaying = useStudioStore((s) => s.isPlaying)
  const select = useStudioStore((s) => s.select)
  const moveSelected = useStudioStore((s) => s.moveSelected)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const app = new Application()
    const containers = containersRef.current
    appRef.current = app
    let initialized = false
    let cancelled = false
    void app
      .init({ width: WIDTH, height: HEIGHT, background: 0x87ceeb, antialias: true })
      .then(() => {
        if (cancelled) {
          void app.destroy(true, { children: true })
          return
        }
        initialized = true
        mount.appendChild(app.canvas)

        app.stage.eventMode = 'static'
        app.stage.hitArea = app.screen

        app.stage.on('pointermove', (event) => {
          const drag = dragRef.current
          if (!drag) return
          moveSelected(event.global.x - drag.offsetX, event.global.y - drag.offsetY)
        })
        app.stage.on('pointerup', () => {
          dragRef.current = null
        })
        app.stage.on('pointerupoutside', () => {
          dragRef.current = null
        })
      })
      .catch((error) => {
        console.error('PixiJS failed to start', error)
      })

    return () => {
      cancelled = true
      if (initialized) {
        void app.destroy(true, { children: true })
      }
      if (appRef.current === app) {
        appRef.current = null
      }
      containers.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync objects from the store into PixiJS containers
  useEffect(() => {
    const stage = appRef.current?.stage
    if (!stage) return
    const seen = new Set<string>()
    for (const object of scene.objects) {
      seen.add(object.id)
      let container = containersRef.current.get(object.id)
      if (!container) {
        const size = 90
        container = new Container()
        container.addChild(drawObject(object.kind, object.color, size))
        container.eventMode = 'static'
        container.cursor = 'grab'
        container.on('pointerdown', (event) => {
          event.stopPropagation()
          select(object.id)
          dragRef.current = {
            offsetX: event.global.x - object.x,
            offsetY: event.global.y - object.y,
          }
        })
        stage.addChild(container)
        containersRef.current.set(object.id, container)
      }
      container.x = object.x
      container.y = object.y
      container.rotation = (object.rotation * Math.PI) / 180
      container.scale.set(object.scale)
      container.visible = object.visible
      container.alpha = object.id === selectedId ? 1 : 0.85
    }
    for (const [id, container] of containersRef.current) {
      if (!seen.has(id)) {
        stage.removeChild(container)
        container.destroy({ children: true })
        containersRef.current.delete(id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.objects, selectedId])

  // Playback: bounce the first object horizontally
  useEffect(() => {
    if (!isPlaying) return
    const firstId = scene.objects[0]?.id
    if (!firstId) return
    let t = 0
    const tick = () => {
      t += 0.03
      const object = scene.objects.find((o) => o.id === firstId)
      const container = containersRef.current.get(firstId)
      if (object && container) {
        container.x = object.x + Math.sin(t) * 120
      }
    }
    Ticker.shared.add(tick)
    return () => {
      Ticker.shared.remove(tick)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, scene.objects])

  const selected = selectObject(scene, selectedId)

  return (
    <div className="flex flex-col gap-3">
      <div ref={mountRef} className="rounded-xl ring-1 ring-slate-200 bg-sky-300/40" />
      {selected && (
        <p className="text-xs text-slate-500">
          Selected: <span className="font-semibold text-slate-700">{selected.name}</span> · x{' '}
          {selected.x.toFixed(0)} · y {selected.y.toFixed(0)} · {selected.rotation}° · scale{' '}
          {selected.scale.toFixed(2)}
        </p>
      )}
    </div>
  )
}
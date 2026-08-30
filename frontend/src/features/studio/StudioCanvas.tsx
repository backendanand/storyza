import { useEffect, useRef } from 'react'
import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js'

import { applySampled, sampleScene } from '../../lib/animation'
import { trackDuration } from './types'
import { selectObject, useStudioStore } from './studioStore'
import { playClip } from './audio/sfx'

const WIDTH = 900
const HEIGHT = 520

const textureCache = new Map<string, Texture>()

function fallbackGraphics(kind: string, color: string, size: number): Graphics {
  const g = new Graphics()
  if (kind === 'background') {
    g.rect(0, 0, size, size * 0.6).fill(color)
    return g
  }
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
  const bgContainerRef = useRef<Container | null>(null)
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null)

  const scene = useStudioStore((s) => s.scene)
  const tracks = useStudioStore((s) => s.tracks)
  const audio = useStudioStore((s) => s.audio)
  const background = useStudioStore((s) => s.background)
  const selectedId = useStudioStore((s) => s.selectedId)
  const isPlaying = useStudioStore((s) => s.isPlaying)
  const playheadTime = useStudioStore((s) => s.playheadTime)
  const setPlayhead = useStudioStore((s) => s.setPlayhead)
  const select = useStudioStore((s) => s.select)
  const moveSelected = useStudioStore((s) => s.moveSelected)
  const endDrag = useStudioStore((s) => s.endDrag)
  const playedAudioRef = useRef<Set<string>>(new Set())
  const playheadRef = useRef(0)
  const canvasRoRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    playheadRef.current = playheadTime
  }, [playheadTime])

  // Boot PixiJS once
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

        const syncCanvasWidth = () => {
          const rect = app.canvas.getBoundingClientRect()
          document.documentElement.style.setProperty('--canvas-w', `${Math.round(rect.width)}px`)
        }
        syncCanvasWidth()
        canvasRoRef.current = new ResizeObserver(syncCanvasWidth)
        canvasRoRef.current.observe(app.canvas)

        app.stage.eventMode = 'static'
        app.stage.hitArea = app.screen

        app.stage.on('pointermove', (event) => {
          const drag = dragRef.current
          if (!drag) return
          moveSelected(event.global.x - drag.offsetX, event.global.y - drag.offsetY)
        })
        app.stage.on('pointerup', () => {
          const hadDrag = dragRef.current !== null
          dragRef.current = null
          if (hadDrag) endDrag()
        })
        app.stage.on('pointerupoutside', () => {
          const hadDrag = dragRef.current !== null
          dragRef.current = null
          if (hadDrag) endDrag()
        })
      })
      .catch((error) => {
        console.error('PixiJS failed to start', error)
      })

    return () => {
      cancelled = true
      canvasRoRef.current?.disconnect()
      canvasRoRef.current = null
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

  // Background layer
  useEffect(() => {
    const stage = appRef.current?.stage
    if (!stage) return
    if (bgContainerRef.current) {
      stage.removeChild(bgContainerRef.current)
      bgContainerRef.current.destroy({ children: true })
      bgContainerRef.current = null
    }
    if (!background?.mediaUrl) return
    const container = new Container()
    container.eventMode = 'none'
    const sprite = new Sprite(Texture.WHITE)
    sprite.tint = 0x88aacc
    void Assets.load(background.mediaUrl)
      .then((texture) => {
        sprite.texture = texture
        sprite.width = WIDTH
        sprite.height = HEIGHT
      })
      .catch(() => {
        sprite.tint = 0x88aacc
      })
    container.addChild(sprite)
    stage.addChildAt(container, 0)
    bgContainerRef.current = container
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [background])

  // Sync scene objects into containers
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
        container.addChild(fallbackGraphics(object.kind, object.color, size))
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
      container.alpha = object.id === selectedId ? 1 : 0.9
      void hydrateSprite(container, object.mediaUrl)
    }
    for (const [id, container] of containersRef.current) {
      if (!seen.has(id)) {
        stage.removeChild(container)
        container.destroy({ children: true })
        containersRef.current.delete(id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.objects, selectedId, isPlaying])

  // Playback: advance playhead and apply sampled transforms
  useEffect(() => {
    const app = appRef.current
    if (!app || !isPlaying) return
    playedAudioRef.current.clear()
    const tick = () => {
      const dt = app.ticker.deltaMS / 1000
      const duration = trackDuration(tracks)
      const next = playheadRef.current + dt
      const wrapped = duration > 0 && next >= duration
      const time = duration > 0 ? (next % duration) : next
      setPlayhead(time)
      const sampled = sampleScene(tracks, time)
      for (const [id, container] of containersRef.current) {
        const base = scene.objects.find((o) => o.id === id)
        if (!base) continue
        const object = applySampled(base, sampled.get(id))
        container.x = object.x
        container.y = object.y
        container.rotation = (object.rotation * Math.PI) / 180
        container.scale.set(object.scale)
        container.visible = object.visible
      }
      if (wrapped) {
        playedAudioRef.current.clear()
      }
      for (const clip of audio) {
        if (clip.startTime <= time && !playedAudioRef.current.has(clip.id)) {
          playedAudioRef.current.add(clip.id)
          playClip(clip)
        }
      }
    }
    app.ticker.add(tick)
    return () => {
      app.ticker.remove(tick)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, tracks, scene.objects, audio])

  const selected = selectObject(scene, selectedId)

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[2rem] border-2 border-white bg-gradient-to-b from-sky-100 to-brand-50 p-3 shadow-soft">
        <div ref={mountRef} className="studio-canvas-mount" />
      </div>
      {selected && (
        <p className="shrink-0 rounded-2xl bg-white px-4 py-2 text-xs font-semibold text-slate-500 shadow-soft">
          Selected: <span className="font-display text-sm font-semibold text-slate-800">{selected.name}</span>
          <span className="text-slate-300"> · </span>x {selected.x.toFixed(0)} · y {selected.y.toFixed(0)} ·{' '}
          {selected.rotation}° · size {selected.scale.toFixed(2)} · {playheadTime.toFixed(1)}s
        </p>
      )}
    </div>
  )
}

async function hydrateSprite(container: Container, mediaUrl: string | null) {
  const existing = container.children.find((c) => c instanceof Sprite)
  if (mediaUrl) {
    const cached = textureCache.get(mediaUrl)
    const texture = cached ?? (await Assets.load(mediaUrl).catch(() => null))
    if (!texture) return
    if (!textureCache.has(mediaUrl)) textureCache.set(mediaUrl, texture)
    if (existing instanceof Sprite) {
      existing.texture = texture
    } else {
      const sprite = new Sprite(texture)
      sprite.width = 90
      sprite.height = 90
      container.addChildAt(sprite, 0)
      container.children.forEach((child) => {
        if (child instanceof Graphics) child.visible = false
      })
    }
  } else if (existing instanceof Sprite) {
    container.removeChild(existing)
    existing.destroy()
    container.children.forEach((child) => {
      if (child instanceof Graphics) child.visible = true
    })
  }
}
import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, ImageSource, Sprite, Text, Texture } from 'pixi.js'

import { applyAnimationDeltas, applySampled, sampleScene } from '../../lib/animation'
import { contentDuration, RECORD_WINDOW, type StudioObject } from './types'
import { selectObject, useStudioStore } from './studioStore'
import { playClip } from './audio/sfx'

const WIDTH = 900
const HEIGHT = 560
const BOX = 90
const HANDLE_COLOR = 0x2f6bff

const textureCache = new Map<string, Texture>()

async function loadSvgTexture(url: string): Promise<Texture | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const svg = await response.text()
    const objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    try {
      const image = new Image()
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error(`svg decode failed: ${url}`))
        image.src = objectUrl
      })
      let resource: ImageBitmap | HTMLImageElement = image
      try {
        resource = await createImageBitmap(image)
      } catch {
        resource = image
      }
      return new Texture(new ImageSource({ resource }))
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  } catch {
    return null
  }
}

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
  const overlayRef = useRef<Container | null>(null)
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null)
  const transformDragRef = useRef<TransformDrag | null>(null)

  const scene = useStudioStore((s) => s.scene)
  const tracks = useStudioStore((s) => s.tracks)
  const audio = useStudioStore((s) => s.audio)
  const animations = useStudioStore((s) => s.animations)
  const background = useStudioStore((s) => s.background)
  const selectedId = useStudioStore((s) => s.selectedId)
  const isPlaying = useStudioStore((s) => s.isPlaying)
  const playheadTime = useStudioStore((s) => s.playheadTime)
  const durationSetting = useStudioStore((s) => s.duration)
  const previewAnimation = useStudioStore((s) => s.previewAnimation)
  const recordingAnimation = useStudioStore((s) => s.recordingAnimation)
  const setPreviewAnimation = useStudioStore((s) => s.setPreviewAnimation)
  const setPlayhead = useStudioStore((s) => s.setPlayhead)
  const select = useStudioStore((s) => s.select)
  const moveSelected = useStudioStore((s) => s.moveSelected)
  const endDrag = useStudioStore((s) => s.endDrag)
  const transformSelected = useStudioStore((s) => s.transformSelected)
  const endTransform = useStudioStore((s) => s.endTransform)
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

    if (import.meta.env.DEV) {
      ;(window as unknown as { __storyzaContainers?: Map<string, Container> }).__storyzaContainers =
        containersRef.current
    }

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
        app.stage.sortableChildren = true

        const overlay = new Container()
        overlay.eventMode = 'static'
        overlay.zIndex = 1000
        overlay.visible = false
        app.stage.addChild(overlay)
        overlayRef.current = overlay

        app.stage.on('pointerdown', () => {
          if (!dragRef.current) select(null)
        })

        app.stage.on('pointermove', (event) => {
          const drag = dragRef.current
          if (drag) {
            moveSelected(event.global.x - drag.offsetX, event.global.y - drag.offsetY)
            return
          }
          const transform = transformDragRef.current
          if (transform) {
            handleTransformMove(transform, event.global.x, event.global.y, transformSelected)
          }
        })
        app.stage.on('pointerup', () => {
          const hadDrag = dragRef.current !== null
          dragRef.current = null
          if (hadDrag) endDrag()
          const transform = transformDragRef.current
          if (transform) {
            transformDragRef.current = null
            endTransform(transform.mode)
          }
        })
        app.stage.on('pointerupoutside', () => {
          const hadDrag = dragRef.current !== null
          dragRef.current = null
          if (hadDrag) endDrag()
          const transform = transformDragRef.current
          if (transform) {
            transformDragRef.current = null
            endTransform(transform.mode)
          }
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
    void loadSvgTexture(background.mediaUrl)
      .then((texture) => {
        if (texture) {
          sprite.texture = texture
          sprite.width = WIDTH
          sprite.height = HEIGHT
          sprite.tint = 0xffffff
        }
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

  // Draw the selection/transform overlay around the selected object
  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    const object = selectedId ? selectObject(scene, selectedId) : undefined
    if (isPlaying || !object || !object.visible) {
      overlay.visible = false
      return
    }
    overlay.visible = true
    buildSelectionOverlay(overlay, object, (mode, handleLocal) =>
      beginHandleDrag(transformDragRef, mode, handleLocal),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, selectedId, isPlaying])

  // Playback: advance playhead and apply sampled transforms
  useEffect(() => {
    const app = appRef.current
    if (!app || !isPlaying) return
    playedAudioRef.current.clear()
    const tick = () => {
      const dt = app.ticker.deltaMS / 1000
      const duration = recordingAnimation
        ? RECORD_WINDOW
        : Math.max(durationSetting, contentDuration(tracks, audio), 1)
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
  }, [isPlaying, tracks, scene.objects, audio, durationSetting, recordingAnimation])

  // Preview a named animation on its object (base pose + deltas), then restore.
  useEffect(() => {
    const app = appRef.current
    if (!app || !previewAnimation) return
    const animation = animations.find((a) => a.id === previewAnimation.animationId)
    const object = scene.objects.find((o) => o.id === previewAnimation.objectId)
    const container = containersRef.current.get(previewAnimation.objectId)
    if (!animation || !object || !container) {
      setPreviewAnimation(null)
      return
    }
    const start = performance.now()
    const tick = () => {
      const time = Math.min((performance.now() - start) / 1000, animation.duration)
      const deltas = sampleScene(animation.tracks, time).get(object.id)
      const applied = applyAnimationDeltas(object, deltas)
      container.x = applied.x
      container.y = applied.y
      container.rotation = (applied.rotation * Math.PI) / 180
      container.scale.set(applied.scale)
      if (time >= animation.duration) {
        setPreviewAnimation(null)
      }
    }
    app.ticker.add(tick)
    return () => {
      app.ticker.remove(tick)
      container.x = object.x
      container.y = object.y
      container.rotation = (object.rotation * Math.PI) / 180
      container.scale.set(object.scale)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewAnimation, animations, scene])

  return (
    <div className="h-full w-full min-h-0">
      <div ref={mountRef} className="studio-canvas-mount" />
    </div>
  )
}

interface TransformDrag {
  mode: 'resize' | 'rotate'
  objectId: string
  startScale: number
  startRotation: number
  centerX: number
  centerY: number
  handleLocal: { x: number; y: number }
}

function beginHandleDrag(
  ref: { current: TransformDrag | null },
  mode: 'resize' | 'rotate',
  handleLocal: { x: number; y: number },
) {
  const { scene, selectedId } = useStudioStore.getState()
  const object = selectedId ? selectObject(scene, selectedId) : undefined
  if (!object) return
  const rad = (object.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  ref.current = {
    mode,
    objectId: object.id,
    startScale: object.scale,
    startRotation: object.rotation,
    centerX: object.x + (BOX / 2) * object.scale * (cos - sin),
    centerY: object.y + (BOX / 2) * object.scale * (sin + cos),
    handleLocal,
  }
}

function handleTransformMove(
  drag: TransformDrag,
  wx: number,
  wy: number,
  transformSelected: (t: { x?: number; y?: number; rotation?: number; scale?: number }) => void,
) {
  const object = selectObject(useStudioStore.getState().scene, drag.objectId)
  if (!object) return
  if (drag.mode === 'rotate') {
    const angle = (Math.atan2(wy - drag.centerY, wx - drag.centerX) * 180) / Math.PI
    transformSelected({ rotation: angle + 90 })
    return
  }
  const rad = (drag.startRotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = wx - object.x
  const dy = wy - object.y
  const localX = (dx * cos + dy * sin) / object.scale
  const localY = (-dx * sin + dy * cos) / object.scale
  const dist = Math.hypot(localX - BOX / 2, localY - BOX / 2)
  const rest = Math.hypot(drag.handleLocal.x - BOX / 2, drag.handleLocal.y - BOX / 2)
  const scale = rest > 0 ? drag.startScale * (dist / rest) : drag.startScale
  const half = (BOX / 2) * scale
  transformSelected({
    x: drag.centerX - half * (cos - sin),
    y: drag.centerY - half * (sin + cos),
    scale,
  })
}

function buildSelectionOverlay(
  overlay: Container,
  object: StudioObject,
  onHandleDown: (mode: 'resize' | 'rotate', handleLocal: { x: number; y: number }) => void,
) {
  overlay.removeChildren().forEach((child) => child.destroy({ children: true }))
  overlay.x = object.x
  overlay.y = object.y
  overlay.rotation = (object.rotation * Math.PI) / 180
  overlay.scale.set(object.scale)

  const box = new Graphics()
  box.rect(0, 0, BOX, BOX).stroke({ color: HANDLE_COLOR, width: 3 }).fill({ color: HANDLE_COLOR, alpha: 0.07 })
  overlay.addChild(box)

  const corners: { x: number; y: number }[] = [
    { x: 0, y: 0 },
    { x: BOX, y: 0 },
    { x: BOX, y: BOX },
    { x: 0, y: BOX },
  ]
  for (const corner of corners) {
    const handle = new Graphics()
    handle.circle(corner.x, corner.y, 7).fill(0xffffff).stroke({ color: HANDLE_COLOR, width: 3 })
    handle.cursor = 'nwse-resize'
    handle.eventMode = 'static'
    handle.on('pointerdown', (event) => {
      event.stopPropagation()
      onHandleDown('resize', corner)
    })
    overlay.addChild(handle)
  }

  const rotateLine = new Graphics()
  rotateLine
    .moveTo(BOX / 2, 0)
    .lineTo(BOX / 2, -24)
    .stroke({ color: HANDLE_COLOR, width: 3 })
  overlay.addChild(rotateLine)

  const rotateHandle = new Graphics()
  rotateHandle.circle(BOX / 2, -24, 8).fill(HANDLE_COLOR).stroke({ color: 0xffffff, width: 3 })
  rotateHandle.cursor = 'grab'
  rotateHandle.eventMode = 'static'
  rotateHandle.on('pointerdown', (event) => {
    event.stopPropagation()
    onHandleDown('rotate', { x: BOX / 2, y: -24 })
  })
  overlay.addChild(rotateHandle)

  const label = new Text({
    text: object.name,
    style: { fontSize: 12, fontWeight: '700', fill: 0xffffff, fontFamily: 'Arial, sans-serif' },
  })
  label.anchor.set(0.5)
  const labelBg = new Graphics()
  labelBg
    .roundRect(-label.width / 2 - 6, -label.height / 2 - 2, label.width + 12, label.height + 4, 6)
    .fill(HANDLE_COLOR)
  const labelGroup = new Container()
  labelGroup.position.set(BOX / 2, -52)
  labelGroup.addChild(labelBg, label)
  overlay.addChild(labelGroup)
}

async function hydrateSprite(container: Container, mediaUrl: string | null) {
  const existing = container.children.find((c) => c instanceof Sprite)
  if (mediaUrl) {
    const cached = textureCache.get(mediaUrl)
    const texture = cached ?? (await loadSvgTexture(mediaUrl))
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
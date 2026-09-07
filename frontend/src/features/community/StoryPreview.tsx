import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, ImageSource, Sprite, Texture } from 'pixi.js'

import { applySampled, sampleScene } from '../../lib/animation'
import type { ProjectDocument } from '../studio/types'

const WIDTH = 900
const HEIGHT = 560

interface PreviewObject {
  id: string
  kind: string
  name: string
  x: number
  y: number
  rotation: number
  scale: number
  visible: boolean
  asset_id: string | null
  z_index: number
  media_url?: string | null
}

interface PreviewScene {
  id: string
  name: string
  background_id: string | null
  background_url?: string | null
  objects: PreviewObject[]
}

const textureCache = new Map<string, Texture>()

async function loadSvgTexture(url: string): Promise<Texture | null> {
  if (textureCache.has(url)) return textureCache.get(url) ?? null
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
      const texture = new Texture(new ImageSource({ resource }))
      textureCache.set(url, texture)
      return texture
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  } catch {
    return null
  }
}

function fallbackGraphics(kind: string, size: number): Graphics {
  const g = new Graphics()
  if (kind === 'background') {
    g.rect(0, 0, size, size * 0.6).fill(0x88aacc)
    return g
  }
  g.roundRect(0, 0, size, size, size * 0.25).fill(0x8b9bb4)
  g.circle(size * 0.32, size * 0.38, size * 0.07).fill(0xffffff)
  g.circle(size * 0.68, size * 0.38, size * 0.07).fill(0xffffff)
  g.circle(size * 0.32, size * 0.38, size * 0.03).fill(0x1b1b1b)
  g.circle(size * 0.68, size * 0.38, size * 0.03).fill(0x1b1b1b)
  return g
}

export function StoryPreview({ document }: { document: ProjectDocument }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const readyRef = useRef<Promise<void> | null>(null)
  const destroyedRef = useRef(false)
  const containersRef = useRef<Map<string, Container>>(new Map())

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const app = new Application()
    appRef.current = app
    let initialized = false
    let cancelled = false

    readyRef.current = app
      .init({ width: WIDTH, height: HEIGHT, background: 0x87ceeb, antialias: true })
      .then(() => {
        if (cancelled) {
          void app.destroy(true, { children: true })
          return
        }
        initialized = true
        mount.appendChild(app.canvas)
        app.canvas.style.display = 'block'
        app.canvas.style.maxWidth = '100%'
        app.canvas.style.height = 'auto'
        app.canvas.style.borderRadius = '1rem'
      })
      .catch((error) => {
        console.error('StoryPreview: PixiJS failed to start', error)
      })

    return () => {
      cancelled = true
      destroyedRef.current = true
      if (initialized) {
        void app.destroy(true, { children: true })
      }
      if (appRef.current === app) {
        appRef.current = null
      }
      containersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const scene: PreviewScene | undefined = document.scenes?.[0]
    if (!scene) return

    const containers = new Map<string, Container>()
    const tracks = document.animation_tracks ?? []

    const render = async () => {
      const app = appRef.current
      if (!app) return
      await readyRef.current
      if (destroyedRef.current) return
      const stage = app.stage
      stage.removeChildren()
      stage.sortableChildren = true
      containers.clear()

      // Background
      if (scene.background_url) {
        const bg = new Container()
        bg.eventMode = 'none'
        const sprite = new Sprite(Texture.WHITE)
        sprite.width = WIDTH
        sprite.height = HEIGHT
        sprite.tint = 0x88aacc
        void loadSvgTexture(scene.background_url).then((texture) => {
          if (texture && !destroyedRef.current) {
            sprite.texture = texture
            sprite.width = WIDTH
            sprite.height = HEIGHT
            sprite.tint = 0xffffff
          }
        })
        bg.addChild(sprite)
        stage.addChild(bg)
      }

      // Objects
      const sorted = [...scene.objects].sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0))
      for (const obj of sorted) {
        const container = new Container()
        container.x = obj.x
        container.y = obj.y
        container.rotation = (obj.rotation * Math.PI) / 180
        container.scale.set(obj.scale)
        container.visible = obj.visible
        container.eventMode = 'none'

        if (obj.media_url) {
          const sprite = new Sprite(Texture.WHITE)
          sprite.anchor.set(0.5)
          sprite.width = 90
          sprite.height = 90
          void loadSvgTexture(obj.media_url).then((texture) => {
            if (texture && !destroyedRef.current) {
              sprite.texture = texture
              sprite.width = 90
              sprite.height = 90
            }
          })
          container.addChild(sprite)
        } else {
          const g = fallbackGraphics(obj.kind, 90)
          g.pivot.set(45, 45)
          container.addChild(g)
        }

        containers.set(obj.id, container)
        stage.addChild(container)
      }

      containersRef.current = containers

      // Playback loop: advance time and apply sampled transforms.
      const duration = Math.max(document.duration ?? 0, 1)
      let time = 0
      const startedAt = performance.now()
      const tick = () => {
        if (destroyedRef.current) return
        time = ((performance.now() - startedAt) / 1000) % duration
        const sampled = sampleScene(tracks as never, time)
        for (const [id, container] of containers) {
          const base = scene.objects.find((o) => o.id === id)
          if (!base) continue
          const pose = applySampled(
            {
              id,
              kind: base.kind as 'character',
              name: base.name,
              x: base.x,
              y: base.y,
              rotation: base.rotation,
              scale: base.scale,
              visible: base.visible,
              color: '#9aa3ad',
              assetId: base.asset_id,
              mediaUrl: base.media_url ?? null,
            },
            sampled.get(id),
          )
          container.x = pose.x
          container.y = pose.y
          container.rotation = (pose.rotation * Math.PI) / 180
          container.scale.set(pose.scale)
          container.visible = pose.visible
        }
      }
      app.ticker.add(tick)
      return () => {
        app.ticker.remove(tick)
      }
    }

    let cleanup: (() => void) | null = null
    void render().then((fn) => {
      cleanup = fn ?? null
    })

    return () => {
      cleanup?.()
    }
  }, [document])

  return <div ref={mountRef} className="flex items-center justify-center overflow-hidden" />
}
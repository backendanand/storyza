import { create } from 'zustand'

import type { SceneObjectKind, StudioObject, StudioScene } from './types'

const PALETTE = ['#ff8a65', '#4fc3f7', '#aed581', '#ffd54f', '#ba68c8', '#81d4fa']
const NAMES: Record<SceneObjectKind, string[]> = {
  character: ['Fox', 'Raccoon', 'Owl', 'Bear', 'Rabbit'],
  background: ['Sky', 'Forest', 'Beach'],
  prop: ['Tree', 'Rock', 'Flower', 'House'],
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

let counter = 0

interface StudioState {
  title: string
  projectId: string | null
  scene: StudioScene
  selectedId: string | null
  isPlaying: boolean
  setTitle: (title: string) => void
  setProjectId: (projectId: string | null) => void
  setScene: (scene: StudioScene, projectId?: string | null) => void
  addObject: (kind: SceneObjectKind) => void
  removeSelected: () => void
  select: (id: string | null) => void
  rotateSelected: (degrees: number) => void
  scaleSelected: (factor: number) => void
  moveSelected: (x: number, y: number) => void
  togglePlay: () => void
  setPlaying: (playing: boolean) => void
  reset: () => void
}

const initialScene: StudioScene = {
  id: 'scene-main',
  name: 'Scene 1',
  backgroundId: null,
  objects: [],
}

export const useStudioStore = create<StudioState>((set, get) => ({
  title: 'My Story',
  projectId: null,
  scene: initialScene,
  selectedId: null,
  isPlaying: false,

  setTitle: (title) => set({ title }),

  setProjectId: (projectId) => set({ projectId }),

  setScene: (scene, projectId = null) =>
    set({
      scene,
      projectId,
      selectedId: scene.objects[0]?.id ?? null,
      isPlaying: false,
    }),

  addObject: (kind) => {
    const scene = get().scene
    const object: StudioObject = {
      id: `obj-${Date.now()}-${counter++}`,
      kind,
      name: randomItem(NAMES[kind]),
      x: 120 + Math.random() * 400,
      y: 120 + Math.random() * 250,
      rotation: 0,
      scale: 1,
      visible: true,
      color: randomItem(PALETTE),
    }
    set({
      scene: { ...scene, objects: [...scene.objects, object] },
      selectedId: object.id,
    })
  },

  removeSelected: () => {
    const { scene, selectedId } = get()
    if (!selectedId) return
    set({
      scene: { ...scene, objects: scene.objects.filter((o) => o.id !== selectedId) },
      selectedId: null,
    })
  },

  select: (id) => set({ selectedId: id }),

  rotateSelected: (degrees) => {
    const { scene, selectedId } = get()
    set({
      scene: {
        ...scene,
        objects: scene.objects.map((o) =>
          o.id === selectedId ? { ...o, rotation: o.rotation + degrees } : o,
        ),
      },
    })
  },

  scaleSelected: (factor) => {
    const { scene, selectedId } = get()
    set({
      scene: {
        ...scene,
        objects: scene.objects.map((o) =>
          o.id === selectedId
            ? { ...o, scale: Math.max(0.2, Math.min(3, o.scale * factor)) }
            : o,
        ),
      },
    })
  },

  moveSelected: (x, y) => {
    const { scene, selectedId } = get()
    set({
      scene: {
        ...scene,
        objects: scene.objects.map((o) =>
          o.id === selectedId ? { ...o, x, y } : o,
        ),
      },
    })
  },

  togglePlay: () => set({ isPlaying: !get().isPlaying }),
  setPlaying: (playing) => set({ isPlaying: playing }),

  reset: () =>
    set({
      title: 'My Story',
      projectId: null,
      scene: initialScene,
      selectedId: null,
      isPlaying: false,
    }),
}))

export function selectObject(scene: StudioScene, id: string | null): StudioObject | undefined {
  return scene.objects.find((o) => o.id === id)
}
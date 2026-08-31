import { create } from 'zustand'

import type {
  AnimationTrack,
  AudioClip,
  Keyframe,
  SceneObjectKind,
  StudioObject,
  StudioScene,
  TrackProperty,
} from './types'

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

const initialScene: StudioScene = {
  id: 'scene-main',
  name: 'Scene 1',
  backgroundId: null,
  objects: [],
}

export interface SelectedKeyframe {
  trackId: string
  time: number
}

export interface SceneBackground {
  assetId: string
  mediaUrl: string
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

let saveNowHandler: (() => void) | null = null

export function registerSaveHandler(handler: (() => void) | null) {
  saveNowHandler = handler
}

export function triggerSaveNow() {
  saveNowHandler?.()
}

interface StudioState {
  title: string
  projectId: string | null
  scene: StudioScene
  tracks: AnimationTrack[]
  audio: AudioClip[]
  background: SceneBackground | null
  duration: number
  selectedId: string | null
  selectedKeyframe: SelectedKeyframe | null
  isPlaying: boolean
  playheadTime: number
  recording: boolean
  saveState: SaveState
  saveError: string | null
  projectsModalOpen: boolean
  versionsModalOpen: boolean
  hasVersions: boolean

  setTitle: (title: string) => void
  setProjectId: (projectId: string | null) => void
  setDuration: (duration: number) => void
  setProjectsModalOpen: (open: boolean) => void
  setVersionsModalOpen: (open: boolean) => void
  setHasVersions: (hasVersions: boolean) => void
  setSaveState: (state: SaveState) => void
  setSaveError: (error: string | null) => void
  setScene: (scene: StudioScene, projectId?: string | null) => void
  loadDocument: (input: {
    title: string
    scene: StudioScene
    tracks: AnimationTrack[]
    audio: AudioClip[]
    background: SceneBackground | null
    duration?: number
    projectId?: string | null
  }) => void
  addObject: (
    kind: SceneObjectKind,
    asset?: { assetId: string; mediaUrl: string; name: string },
  ) => void
  setBackground: (background: SceneBackground | null) => void
  removeSelected: () => void
  select: (id: string | null) => void
  rotateSelected: (degrees: number) => void
  scaleSelected: (factor: number) => void
  moveSelected: (x: number, y: number) => void
  transformSelected: (transform: { x?: number; y?: number; rotation?: number; scale?: number }) => void
  endDrag: () => void
  endTransform: (mode: 'resize' | 'rotate') => void
  _recordProperty: (objectId: string, property: TrackProperty) => void

  togglePlay: () => void
  setPlaying: (playing: boolean) => void
  setPlayhead: (time: number) => void
  setRecording: (recording: boolean) => void
  addKeyframeAtPlayhead: (objectId: string, property: TrackProperty) => void
  deleteKeyframe: (trackId: string, time: number) => void
  setKeyframeTime: (trackId: string, oldTime: number, newTime: number) => void
  selectKeyframe: (trackId: string, time: number) => void
  clearSelectedKeyframe: () => void

  addAudio: (clip: AudioClip) => void
  removeAudio: (id: string) => void
  reset: () => void
}

function ensureSorted(keyframes: Keyframe[]): Keyframe[] {
  return [...keyframes].sort((a, b) => a.t - b.t)
}

function upsertKeyframe(keyframes: Keyframe[], keyframe: Keyframe): Keyframe[] {
  const without = keyframes.filter((k) => Math.abs(k.t - keyframe.t) > 0.0001)
  return ensureSorted([...without, keyframe])
}

export const useStudioStore = create<StudioState>((set, get) => ({
  title: 'My Story',
  projectId: null,
  scene: initialScene,
  tracks: [],
  audio: [],
  background: null,
  duration: 5,
  selectedId: null,
  selectedKeyframe: null,
  isPlaying: false,
  playheadTime: 0,
  recording: false,
  saveState: 'idle',
  saveError: null,
  projectsModalOpen: false,
  versionsModalOpen: false,
  hasVersions: false,

  setTitle: (title) => set({ title }),

  setProjectId: (projectId) => set({ projectId }),

  setDuration: (duration) => set({ duration: Math.min(120, Math.max(1, Math.round(duration))) }),

  setProjectsModalOpen: (open) => set({ projectsModalOpen: open }),
  setVersionsModalOpen: (open) => set({ versionsModalOpen: open }),
  setHasVersions: (hasVersions) => set({ hasVersions }),

  setSaveState: (saveState) => set({ saveState }),
  setSaveError: (saveError) => set({ saveError }),

  setScene: (scene, projectId = null) =>
    set({
      scene,
      projectId,
      selectedId: scene.objects[0]?.id ?? null,
      isPlaying: false,
      playheadTime: 0,
    }),

  loadDocument: ({ title, scene, tracks, audio, background, duration, projectId = null }) =>
    set({
      title,
      scene,
      tracks,
      audio,
      background,
      duration: duration ?? 5,
      projectId,
      selectedId: scene.objects[0]?.id ?? null,
      selectedKeyframe: null,
      isPlaying: false,
      playheadTime: 0,
      recording: false,
    }),

  addObject: (kind, asset) => {
    const scene = get().scene
    const object: StudioObject = {
      id: `obj-${Date.now()}-${counter++}`,
      kind,
      name: asset?.name ?? randomItem(NAMES[kind]),
      x: 120 + Math.random() * 400,
      y: 120 + Math.random() * 250,
      rotation: 0,
      scale: 1,
      visible: true,
      color: randomItem(PALETTE),
      assetId: asset?.assetId ?? null,
      mediaUrl: asset?.mediaUrl ?? null,
    }
    set({
      scene: { ...scene, objects: [...scene.objects, object] },
      selectedId: object.id,
    })
  },

  setBackground: (background) => {
    const scene = get().scene
    set({
      background,
      scene: { ...scene, backgroundId: background?.assetId ?? null },
    })
  },

  removeSelected: () => {
    const { scene, selectedId, tracks, selectedKeyframe } = get()
    if (!selectedId) return
    set({
      scene: { ...scene, objects: scene.objects.filter((o) => o.id !== selectedId) },
      tracks: tracks.filter((t) => t.objectId !== selectedId),
      selectedId: null,
      selectedKeyframe:
        selectedKeyframe && selectedKeyframe.trackId === selectedId ? null : selectedKeyframe,
    })
  },

  select: (id) => set({ selectedId: id }),

  _recordProperty: (objectId: string, property: TrackProperty) => {
    const { recording, playheadTime, scene, tracks } = get()
    if (!recording) return
    const object = scene.objects.find((o) => o.id === objectId)
    if (!object) return
    const value = object[property]
    if (typeof value !== 'number' && typeof value !== 'boolean') return
    const existing = tracks.find((t) => t.objectId === objectId && t.property === property)
    if (existing) {
      set({
        tracks: tracks.map((t) =>
          t.id === existing.id
            ? { ...t, keyframes: upsertKeyframe(t.keyframes, { t: playheadTime, value, easing: 'linear' }) }
            : t,
        ),
      })
    } else {
      const track: AnimationTrack = {
        id: `track-${Date.now()}-${counter++}`,
        objectId,
        property,
        keyframes: [{ t: playheadTime, value, easing: 'linear' }],
      }
      set({ tracks: [...tracks, track] })
    }
  },

  rotateSelected: (degrees) => {
    const { scene, selectedId } = get()
    if (!selectedId) return
    const next = scene.objects.map((o) =>
      o.id === selectedId ? { ...o, rotation: o.rotation + degrees } : o,
    )
    set({ scene: { ...scene, objects: next } })
    get()._recordProperty(selectedId, 'rotation')
  },

  scaleSelected: (factor) => {
    const { scene, selectedId } = get()
    if (!selectedId) return
    const next = scene.objects.map((o) =>
      o.id === selectedId
        ? { ...o, scale: Math.max(0.2, Math.min(3, o.scale * factor)) }
        : o,
    )
    set({ scene: { ...scene, objects: next } })
    get()._recordProperty(selectedId, 'scale')
  },

  moveSelected: (x, y) => {
    const { scene, selectedId } = get()
    if (!selectedId) return
    set({
      scene: {
        ...scene,
        objects: scene.objects.map((o) => (o.id === selectedId ? { ...o, x, y } : o)),
      },
    })
  },

  transformSelected: ({ x, y, rotation, scale }) => {
    const { scene, selectedId } = get()
    if (!selectedId) return
    set({
      scene: {
        ...scene,
        objects: scene.objects.map((o) =>
          o.id === selectedId
            ? {
                ...o,
                x: x ?? o.x,
                y: y ?? o.y,
                rotation: rotation ?? o.rotation,
                scale: scale !== undefined ? Math.min(3, Math.max(0.2, scale)) : o.scale,
              }
            : o,
        ),
      },
    })
  },

  endTransform: (mode) => {
    const { recording, selectedId } = get()
    if (!recording || !selectedId) return
    if (mode === 'resize') {
      get()._recordProperty(selectedId, 'x')
      get()._recordProperty(selectedId, 'y')
      get()._recordProperty(selectedId, 'scale')
    } else {
      get()._recordProperty(selectedId, 'rotation')
    }
  },

  endDrag: () => {
    const { recording, selectedId } = get()
    if (!recording || !selectedId) return
    get()._recordProperty(selectedId, 'x')
    get()._recordProperty(selectedId, 'y')
  },

  togglePlay: () => {
    const { isPlaying, playheadTime } = get()
    set({ isPlaying: !isPlaying, playheadTime: isPlaying ? playheadTime : 0 })
  },
  setPlaying: (playing) => set({ isPlaying: playing }),
  setPlayhead: (time) => set({ playheadTime: Math.max(0, time) }),
  setRecording: (recording) => set({ recording }),

  addKeyframeAtPlayhead: (objectId, property) => {
    const object = get().scene.objects.find((o) => o.id === objectId)
    if (!object) return
    const value = object[property]
    if (typeof value !== 'number' && typeof value !== 'boolean') return
    const { tracks, playheadTime } = get()
    const existing = tracks.find((t) => t.objectId === objectId && t.property === property)
    if (existing) {
      set({
        tracks: tracks.map((t) =>
          t.id === existing.id
            ? { ...t, keyframes: upsertKeyframe(t.keyframes, { t: playheadTime, value, easing: 'linear' }) }
            : t,
        ),
      })
    } else {
      set({
        tracks: [
          ...tracks,
          {
            id: `track-${Date.now()}-${counter++}`,
            objectId,
            property,
            keyframes: [{ t: playheadTime, value, easing: 'linear' }],
          },
        ],
      })
    }
    set({ selectedKeyframe: null })
  },

  deleteKeyframe: (trackId, time) => {
    set({
      tracks: get().tracks.map((t) =>
        t.id === trackId
          ? { ...t, keyframes: t.keyframes.filter((k) => Math.abs(k.t - time) > 0.0001) }
          : t,
      ),
    })
    const { selectedKeyframe } = get()
    if (selectedKeyframe && selectedKeyframe.trackId === trackId && Math.abs(selectedKeyframe.time - time) < 0.0001) {
      set({ selectedKeyframe: null })
    }
  },

  setKeyframeTime: (trackId, oldTime, newTime) => {
    const { tracks } = get()
    const track = tracks.find((t) => t.id === trackId)
    if (!track) return
    const keyframe = track.keyframes.find((k) => Math.abs(k.t - oldTime) < 0.0001)
    if (!keyframe) return
    const updated = upsertKeyframe(
      track.keyframes.filter((k) => Math.abs(k.t - oldTime) > 0.0001),
      { ...keyframe, t: Math.max(0, newTime) },
    )
    set({ tracks: tracks.map((t) => (t.id === trackId ? { ...t, keyframes: updated } : t)) })
    set({ selectedKeyframe: { trackId, time: Math.max(0, newTime) } })
  },

  selectKeyframe: (trackId, time) => set({ selectedKeyframe: { trackId, time } }),
  clearSelectedKeyframe: () => set({ selectedKeyframe: null }),

  addAudio: (clip) => set({ audio: [...get().audio, clip] }),
  removeAudio: (id) => set({ audio: get().audio.filter((c) => c.id !== id) }),

  reset: () =>
    set({
      title: 'My Story',
      projectId: null,
      scene: initialScene,
      tracks: [],
      audio: [],
      background: null,
      duration: 5,
      selectedId: null,
      selectedKeyframe: null,
      isPlaying: false,
      playheadTime: 0,
      recording: false,
      saveState: 'idle',
      saveError: null,
      projectsModalOpen: false,
      versionsModalOpen: false,
      hasVersions: false,
    }),
}))

export function selectObject(scene: StudioScene, id: string | null): StudioObject | undefined {
  return scene.objects.find((o) => o.id === id)
}

export function tracksForObject(tracks: AnimationTrack[], objectId: string): AnimationTrack[] {
  return tracks.filter((t) => t.objectId === objectId)
}
import { create } from 'zustand'

import { sampleScene } from '../../lib/animation'
import { presetByName } from './animationPresets'
import { RECORD_WINDOW } from './types'
import type {
  AnimationTrack,
  AudioClip,
  Keyframe,
  ObjectAnimation,
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

export interface PreviewAnimation {
  objectId: string
  animationId: string
}

export interface RecordingAnimation {
  objectId: string
  name: string
  startPose: { x: number; y: number; rotation: number; scale: number }
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
  animations: ObjectAnimation[]
  background: SceneBackground | null
  duration: number
  selectedId: string | null
  selectedKeyframe: SelectedKeyframe | null
  isPlaying: boolean
  playheadTime: number
  recording: boolean
  previewAnimation: PreviewAnimation | null
  recordingAnimation: RecordingAnimation | null
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
    animations?: ObjectAnimation[]
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
  setAnimations: (animations: ObjectAnimation[]) => void
  addAnimation: (animation: ObjectAnimation) => void
  removeAnimation: (animationId: string) => void
  renameAnimation: (animationId: string, name: string) => void
  setPreviewAnimation: (preview: PreviewAnimation | null) => void
  startAnimationRecording: (name?: string) => boolean
  stopAnimationRecording: () => void
  addAnimationToTimeline: (animationId: string) => void
  reset: () => void
}

function ensureSorted(keyframes: Keyframe[]): Keyframe[] {
  return [...keyframes].sort((a, b) => a.t - b.t)
}

function upsertKeyframe(keyframes: Keyframe[], keyframe: Keyframe): Keyframe[] {
  const without = keyframes.filter((k) => Math.abs(k.t - keyframe.t) > 0.0001)
  return ensureSorted([...without, keyframe])
}

function mergeKeyframes(a: Keyframe[], b: Keyframe[]): Keyframe[] {
  const byTime = new Map<number, Keyframe>()
  for (const keyframe of [...a, ...b]) byTime.set(keyframe.t, keyframe)
  return ensureSorted([...byTime.values()])
}

/** Drop middle keyframes that don't change value, so recordings stay tidy. */
function compressKeyframes(keyframes: Keyframe[]): Keyframe[] {
  if (keyframes.length < 3) return keyframes
  const result: Keyframe[] = [keyframes[0]]
  const same = (a: number, b: number) => Math.abs(a - b) < 0.5
  for (let i = 1; i < keyframes.length - 1; i++) {
    const prev = Number(result[result.length - 1].value)
    const curr = Number(keyframes[i].value)
    const next = Number(keyframes[i + 1].value)
    if (!(same(prev, curr) && same(curr, next))) result.push(keyframes[i])
  }
  result.push(keyframes[keyframes.length - 1])
  return result
}

export const useStudioStore = create<StudioState>((set, get) => ({
  title: 'My Story',
  projectId: null,
  scene: initialScene,
  tracks: [],
  audio: [],
  animations: [],
  background: null,
  duration: 5,
  selectedId: null,
  selectedKeyframe: null,
  isPlaying: false,
  playheadTime: 0,
  recording: false,
  previewAnimation: null,
  recordingAnimation: null,
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

  loadDocument: ({ title, scene, tracks, audio, animations = [], background, duration, projectId = null }) =>
    set({
      title,
      scene,
      tracks,
      audio,
      animations,
      background,
      duration: duration ?? 5,
      projectId,
      selectedId: scene.objects[0]?.id ?? null,
      selectedKeyframe: null,
      isPlaying: false,
      playheadTime: 0,
      recording: false,
      previewAnimation: null,
      recordingAnimation: null,
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
    if (get().recordingAnimation) {
      get()._recordProperty(selectedId, 'x')
      get()._recordProperty(selectedId, 'y')
    }
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
    if (get().recordingAnimation) {
      get()._recordProperty(selectedId, 'rotation')
      get()._recordProperty(selectedId, 'scale')
      if (x !== undefined) get()._recordProperty(selectedId, 'x')
      if (y !== undefined) get()._recordProperty(selectedId, 'y')
    }
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

  setAnimations: (animations) => set({ animations }),

  addAnimation: (animation) =>
    set({ animations: [...get().animations, animation] }),

  removeAnimation: (animationId) => {
    set({
      animations: get().animations.filter((a) => a.id !== animationId),
      previewAnimation:
        get().previewAnimation?.animationId === animationId ? null : get().previewAnimation,
    })
  },

  renameAnimation: (animationId, name) =>
    set({
      animations: get().animations.map((a) =>
        a.id === animationId ? { ...a, name: name || a.name } : a,
      ),
    }),

  setPreviewAnimation: (previewAnimation) => set({ previewAnimation }),

  startAnimationRecording: (name) => {
    const { scene, selectedId, animations } = get()
    const object = selectedId ? scene.objects.find((o) => o.id === selectedId) : undefined
    if (!object) return false
    const count = animations.filter((a) => a.objectId === object.id).length
    set({
      recordingAnimation: {
        objectId: object.id,
        name: name?.trim() || `Custom ${count + 1}`,
        startPose: { x: object.x, y: object.y, rotation: object.rotation, scale: object.scale },
      },
      recording: true,
      isPlaying: true,
      playheadTime: 0,
      previewAnimation: null,
    })
    return true
  },

  stopAnimationRecording: () => {
    const { recordingAnimation, tracks } = get()
    if (!recordingAnimation) return
    const { objectId, name, startPose } = recordingAnimation
    const window = RECORD_WINDOW

    const captured: AnimationTrack[] = []
    for (const track of tracks) {
      if (track.objectId !== objectId || track.property === 'visible') continue
      const keyframes = track.keyframes.filter((k) => k.t <= window)
      if (keyframes.length === 0) continue
      captured.push({
        id: `anim-${Date.now()}-${track.property}`,
        objectId,
        property: track.property,
        keyframes: ensureSorted(
          compressKeyframes(
            keyframes.map((k) => ({
              ...k,
              value:
                Number(k.value) -
                Number(startPose[track.property as 'x' | 'y' | 'rotation' | 'scale'] ?? 0),
            })),
          ),
        ),
      })
    }

    const cleaned = tracks
      .map((track) =>
        track.objectId === objectId && track.property !== 'visible'
          ? { ...track, keyframes: track.keyframes.filter((k) => k.t > window) }
          : track,
      )
      .filter((track) => track.keyframes.length > 0)

    const updates: Partial<StudioState> = {
      tracks: cleaned,
      recording: false,
      recordingAnimation: null,
      isPlaying: false,
      playheadTime: 0,
    }
    if (captured.length > 0) {
      const duration = Math.max(
        0.1,
        ...captured.flatMap((track) => track.keyframes.map((k) => k.t)),
      )
      updates.animations = [
        ...get().animations,
        { id: `anim-${Date.now()}`, objectId, name, duration, tracks: captured },
      ]
    }
    set(updates)
  },

  addAnimationToTimeline: (animationId) => {
    const { animations, tracks, scene, playheadTime } = get()
    const animation = animations.find((a) => a.id === animationId)
    if (!animation) return
    const object = scene.objects.find((o) => o.id === animation.objectId)
    if (!object) return

    const sampled = sampleScene(tracks, playheadTime).get(object.id) ?? {}
    const base = {
      x: typeof sampled.x === 'number' ? sampled.x : object.x,
      y: typeof sampled.y === 'number' ? sampled.y : object.y,
      rotation: typeof sampled.rotation === 'number' ? sampled.rotation : object.rotation,
      scale: typeof sampled.scale === 'number' ? sampled.scale : object.scale,
    }

    const result = [...tracks]
    for (const animTrack of animation.tracks) {
      if (animTrack.property === 'visible') continue
      const prop = animTrack.property
      const keyframes = animTrack.keyframes
        .map((k) => ({
          t: playheadTime + k.t,
          value: Number(base[prop]) + Number(k.value),
          easing: k.easing,
        }))
        .sort((a, b) => a.t - b.t)
      const existingIndex = result.findIndex(
        (t) => t.objectId === object.id && t.property === prop,
      )
      if (existingIndex >= 0) {
        const existing = result[existingIndex]
        result[existingIndex] = { ...existing, keyframes: mergeKeyframes(existing.keyframes, keyframes) }
      } else {
        result.push({
          id: `track-${Date.now()}-${prop}`,
          objectId: object.id,
          property: prop,
          keyframes,
        })
      }
    }
    set({ tracks: result })
  },

  reset: () =>
    set({
      title: 'My Story',
      projectId: null,
      scene: initialScene,
      tracks: [],
      audio: [],
      animations: [],
      background: null,
      duration: 5,
      selectedId: null,
      selectedKeyframe: null,
      isPlaying: false,
      playheadTime: 0,
      recording: false,
      previewAnimation: null,
      recordingAnimation: null,
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

// Dev/testing hook: lets browser automation drive the store directly (dev only).
if (import.meta.env.DEV) {
  const w = window as unknown as {
    __storyzaStore?: typeof useStudioStore
    __storyzaPreset?: typeof presetByName
  }
  w.__storyzaStore = useStudioStore
  w.__storyzaPreset = presetByName
}

export function tracksForObject(tracks: AnimationTrack[], objectId: string): AnimationTrack[] {
  return tracks.filter((t) => t.objectId === objectId)
}
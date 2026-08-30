export type SceneObjectKind = 'character' | 'background' | 'prop'
export type TrackProperty = 'x' | 'y' | 'rotation' | 'scale' | 'visible'
export type Easing = 'linear' | 'easeInOut'

export interface StudioObject {
  id: string
  kind: SceneObjectKind
  name: string
  x: number
  y: number
  rotation: number
  scale: number
  visible: boolean
  color: string
  assetId: string | null
  mediaUrl: string | null
}

export interface StudioScene {
  id: string
  name: string
  backgroundId: string | null
  objects: StudioObject[]
}

export interface Keyframe {
  t: number
  value: number | boolean
  easing: Easing
}

export interface AnimationTrack {
  id: string
  objectId: string
  property: TrackProperty
  keyframes: Keyframe[]
}

export type AudioKind = 'sfx' | 'voice'

export interface AudioClip {
  id: string
  kind: AudioKind
  name: string
  startTime: number
  duration: number
  preset?: 'pop' | 'whoosh' | 'chime'
  dataUrl?: string
}

// ---- backend (snake_case) document shape -----------------------------------

export interface BackendObject {
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
}

export interface BackendScene {
  id: string
  name: string
  background_id: string | null
  objects: BackendObject[]
}

export interface BackendKeyframe {
  t: number
  value: number | boolean
  easing: Easing
}

export interface BackendTrack {
  id: string
  object_id: string
  property: TrackProperty
  keyframes: BackendKeyframe[]
}

export interface BackendAudio {
  id: string
  kind: AudioKind
  name: string
  start_time: number
  duration: number
  preset?: 'pop' | 'whoosh' | 'chime'
  data_url?: string
}

export interface ProjectDocument {
  schema_version: number
  renderer_version: string
  title: string
  meta: Record<string, unknown>
  scenes: BackendScene[]
  animation_tracks: BackendTrack[]
  audio: BackendAudio[]
  export_settings: Record<string, unknown>
  duration: number
}

// ---- conversion helpers -----------------------------------------------------

export function sceneToBackend(scene: StudioScene): BackendScene {
  return {
    id: scene.id,
    name: scene.name,
    background_id: scene.backgroundId,
    objects: scene.objects.map((o) => ({
      id: o.id,
      kind: o.kind,
      name: o.name,
      x: o.x,
      y: o.y,
      rotation: o.rotation,
      scale: o.scale,
      visible: o.visible,
      asset_id: o.assetId,
      z_index: 0,
    })),
  }
}

export function sceneFromBackend(scene: BackendScene): StudioScene {
  return {
    id: scene.id,
    name: scene.name,
    backgroundId: scene.background_id,
    objects: scene.objects.map((o) => ({
      id: o.id,
      kind: (o.kind as SceneObjectKind) ?? 'prop',
      name: o.name,
      x: o.x,
      y: o.y,
      rotation: o.rotation,
      scale: o.scale ?? 1,
      visible: o.visible,
      color: '#9aa3ad',
      assetId: o.asset_id,
      mediaUrl: null,
    })),
  }
}

export function trackToBackend(track: AnimationTrack): BackendTrack {
  return {
    id: track.id,
    object_id: track.objectId,
    property: track.property,
    keyframes: track.keyframes.map((k) => ({ t: k.t, value: k.value, easing: k.easing })),
  }
}

export function trackFromBackend(track: BackendTrack): AnimationTrack {
  return {
    id: track.id,
    objectId: track.object_id,
    property: track.property,
    keyframes: track.keyframes.map((k) => ({ t: k.t, value: k.value, easing: k.easing })),
  }
}

export function audioToBackend(clip: AudioClip): BackendAudio {
  return {
    id: clip.id,
    kind: clip.kind,
    name: clip.name,
    start_time: clip.startTime,
    duration: clip.duration,
    ...(clip.preset ? { preset: clip.preset } : {}),
    ...(clip.dataUrl ? { data_url: clip.dataUrl } : {}),
  }
}

export function audioFromBackend(clip: BackendAudio): AudioClip {
  return {
    id: clip.id,
    kind: clip.kind,
    name: clip.name,
    startTime: clip.start_time,
    duration: clip.duration,
    ...(clip.preset ? { preset: clip.preset } : {}),
    ...(clip.data_url ? { dataUrl: clip.data_url } : {}),
  }
}

export function toProjectDocument(input: {
  title: string
  scene: StudioScene
  tracks: AnimationTrack[]
  audio: AudioClip[]
}): ProjectDocument {
  return {
    schema_version: 1,
    renderer_version: 'v1',
    title: input.title,
    meta: {},
    scenes: [sceneToBackend(input.scene)],
    animation_tracks: input.tracks.map(trackToBackend),
    audio: input.audio.map(audioToBackend),
    export_settings: {},
    duration: 0,
  }
}

export function fromProjectDocument(doc: ProjectDocument): {
  title: string
  scene: StudioScene
  tracks: AnimationTrack[]
  audio: AudioClip[]
} {
  const scene = doc.scenes?.[0] ? sceneFromBackend(doc.scenes[0]) : { id: 'scene-main', name: 'Scene 1', backgroundId: null, objects: [] }
  return {
    title: doc.title,
    scene,
    tracks: (doc.animation_tracks ?? []).map(trackFromBackend),
    audio: (doc.audio ?? []).map(audioFromBackend),
  }
}

export function trackDuration(tracks: AnimationTrack[]): number {
  return tracks.reduce((max, track) => {
    return Math.max(max, ...track.keyframes.map((k) => k.t))
  }, 0)
}
export type SceneObjectKind = 'character' | 'background' | 'prop'

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
}

export interface StudioScene {
  id: string
  name: string
  backgroundId: string | null
  objects: StudioObject[]
}

export interface ProjectDocument {
  schema_version: number
  renderer_version: string
  title: string
  meta: Record<string, unknown>
  scenes: StudioScene[]
  animation_tracks: Array<{
    id: string
    object_id: string
    property: string
    keyframes: Array<Record<string, unknown>>
  }>
  audio: Array<Record<string, unknown>>
  export_settings: Record<string, unknown>
}

export function toProjectDocument(scene: StudioScene, title: string): ProjectDocument {
  return {
    schema_version: 1,
    renderer_version: 'v1',
    title,
    meta: {},
    scenes: [scene],
    animation_tracks: [],
    audio: [],
    export_settings: {},
  }
}
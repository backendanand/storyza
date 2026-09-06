import type { AnimationTrack, Keyframe, ObjectAnimation, StudioObject, TrackProperty } from './types'

/**
 * Built-in named animations. Each keyframe value is a DELTA applied on top of
 * the object's current pose, so the same animation works wherever the object is
 * placed and can be dropped at any point on the timeline.
 */

export interface AnimationPreset {
  name: string
  emoji: string
  duration: number
  make: (object: StudioObject) => ObjectAnimation
}

function kf(t: number, value: number, easing: 'linear' | 'easeInOut' = 'linear'): Keyframe {
  return { t, value, easing }
}

let presetCounter = 0
function uid(prefix: string): string {
  presetCounter += 1
  return `${prefix}-${Date.now()}-${presetCounter}`
}

function track(objectId: string, property: TrackProperty, keyframes: Keyframe[]): AnimationTrack {
  return { id: uid(`preset-${property}`), objectId, property, keyframes }
}

function build(
  object: StudioObject,
  name: string,
  duration: number,
  tracks: AnimationTrack[],
): ObjectAnimation {
  return { id: uid('anim'), objectId: object.id, name, duration, tracks }
}

const PRESETS: AnimationPreset[] = [
  {
    name: 'Jump',
    emoji: '🦘',
    duration: 1,
    make: (object) =>
      build(object, 'Jump', 1, [
        track(object.id, 'y', [kf(0, 0), kf(0.3, -90, 'easeInOut'), kf(0.7, 0, 'easeInOut')]),
        track(object.id, 'scale', [
          kf(0, 0),
          kf(0.12, 0.18, 'easeInOut'),
          kf(0.3, 0),
          kf(0.7, 0),
          kf(0.82, 0.18, 'easeInOut'),
          kf(0.92, 0),
        ]),
      ]),
  },
  {
    name: 'Spin',
    emoji: '🌀',
    duration: 1,
    make: (object) =>
      build(object, 'Spin', 1, [
        track(object.id, 'rotation', [kf(0, 0), kf(1, 360, 'easeInOut')]),
      ]),
  },
  {
    name: 'Wiggle',
    emoji: '🐛',
    duration: 1,
    make: (object) =>
      build(object, 'Wiggle', 1, [
        track(object.id, 'x', [
          kf(0, 0),
          kf(0.25, -30, 'easeInOut'),
          kf(0.5, 30, 'easeInOut'),
          kf(0.75, -30, 'easeInOut'),
          kf(1, 0, 'easeInOut'),
        ]),
      ]),
  },
  {
    name: 'Run',
    emoji: '🏃',
    duration: 1.5,
    make: (object) =>
      build(object, 'Run', 1.5, [
        track(object.id, 'x', [kf(0, 0), kf(1.5, 120, 'linear')]),
        track(object.id, 'y', [
          kf(0, 0),
          kf(0.25, -14, 'easeInOut'),
          kf(0.5, 0),
          kf(0.75, -14, 'easeInOut'),
          kf(1, 0),
          kf(1.25, -14, 'easeInOut'),
          kf(1.5, 0),
        ]),
      ]),
  },
  {
    name: 'Idle',
    emoji: '😌',
    duration: 1.5,
    make: (object) =>
      build(object, 'Idle', 1.5, [
        track(object.id, 'y', [kf(0, 0), kf(0.75, -8, 'easeInOut'), kf(1.5, 0, 'easeInOut')]),
        track(object.id, 'scale', [
          kf(0, 0),
          kf(0.4, 0.05, 'easeInOut'),
          kf(0.8, 0),
          kf(1.2, 0.05, 'easeInOut'),
          kf(1.5, 0),
        ]),
      ]),
  },
  {
    name: 'Eat',
    emoji: '😋',
    duration: 1.2,
    make: (object) =>
      build(object, 'Eat', 1.2, [
        track(object.id, 'rotation', [
          kf(0, 0),
          kf(0.15, 7, 'easeInOut'),
          kf(0.3, -5, 'easeInOut'),
          kf(0.45, 7, 'easeInOut'),
          kf(0.6, -5, 'easeInOut'),
          kf(0.75, 0),
          kf(0.9, 7, 'easeInOut'),
          kf(1.05, -5, 'easeInOut'),
          kf(1.2, 0),
        ]),
        track(object.id, 'scale', [
          kf(0, 0),
          kf(0.15, 0.08, 'easeInOut'),
          kf(0.3, 0),
          kf(0.45, 0.08, 'easeInOut'),
          kf(0.6, 0),
          kf(0.75, 0.08, 'easeInOut'),
          kf(0.9, 0),
          kf(1.05, 0.08, 'easeInOut'),
          kf(1.2, 0),
        ]),
      ]),
  },
]

export function presetAnimations(object: StudioObject): ObjectAnimation[] {
  return PRESETS.map((preset) => preset.make(object))
}

export function presetByName(name: string): AnimationPreset | undefined {
  return PRESETS.find((preset) => preset.name === name)
}
import type { AnimationTrack, Easing, StudioObject, TrackProperty } from '../features/studio/types'

export function ease(progress: number, easing: Easing): number {
  if (easing === 'linear') return progress
  const t = Math.max(0, Math.min(1, progress))
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** Sample a track at a given time. Returns the interpolated value (or boolean for `visible`). */
export function sampleTrack(track: AnimationTrack, time: number): number | boolean | undefined {
  const keyframes = track.keyframes
  if (keyframes.length === 0) return undefined
  const first = keyframes[0]
  const last = keyframes[keyframes.length - 1]
  if (time <= first.t) return first.value
  if (time >= last.t) return last.value

  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i]
    const b = keyframes[i + 1]
    if (time >= a.t && time <= b.t) {
      if (track.property === 'visible') {
        // visibility holds its value until the next keyframe
        return a.value
      }
      const span = b.t - a.t
      const raw = span === 0 ? 1 : (time - a.t) / span
      const p = ease(raw, b.easing)
      const from = Number(a.value)
      const to = Number(b.value)
      return from + (to - from) * p
    }
  }
  return last.value
}

export type SampledValue = Partial<Record<TrackProperty, number | boolean>>

/**
 * Sample all tracks for a scene at `time`. Returns a map of objectId -> overrides.
 * Properties without a track are left undefined so the caller keeps the base value.
 */
export function sampleScene(
  tracks: AnimationTrack[],
  time: number,
): Map<string, SampledValue> {
  const sampled = new Map<string, SampledValue>()
  for (const track of tracks) {
    const value = sampleTrack(track, time)
    if (value === undefined) continue
    const entry = sampled.get(track.objectId) ?? {}
    entry[track.property] = value
    sampled.set(track.objectId, entry)
  }
  return sampled
}

/** Apply sampled overrides onto a base object, returning a new object. */
export function applySampled(
  base: StudioObject,
  sampled: SampledValue | undefined,
): StudioObject {
  if (!sampled) return base
  return {
    ...base,
    x: typeof sampled.x === 'number' ? sampled.x : base.x,
    y: typeof sampled.y === 'number' ? sampled.y : base.y,
    rotation: typeof sampled.rotation === 'number' ? sampled.rotation : base.rotation,
    scale: typeof sampled.scale === 'number' ? sampled.scale : base.scale,
    visible: typeof sampled.visible === 'boolean' ? sampled.visible : base.visible,
  }
}

/**
 * Apply DELTA overrides (from a named animation's tracks) on top of a base
 * object's pose. Used to preview reusable animations like "Jump" or "Run".
 */
export function applyAnimationDeltas(
  base: StudioObject,
  deltas: SampledValue | undefined,
): StudioObject {
  if (!deltas) return base
  return {
    ...base,
    x: typeof deltas.x === 'number' ? base.x + deltas.x : base.x,
    y: typeof deltas.y === 'number' ? base.y + deltas.y : base.y,
    rotation: typeof deltas.rotation === 'number' ? base.rotation + deltas.rotation : base.rotation,
    scale: typeof deltas.scale === 'number' ? base.scale + deltas.scale : base.scale,
  }
}
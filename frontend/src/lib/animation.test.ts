import { describe, expect, it } from 'vitest'

import { applySampled, ease, sampleScene, sampleTrack } from './animation'
import type { AnimationTrack, StudioObject } from '../features/studio/types'

const track = (property: AnimationTrack['property'], keyframes: AnimationTrack['keyframes']): AnimationTrack => ({
  id: 't1',
  objectId: 'o1',
  property,
  keyframes,
})

describe('ease', () => {
  it('linear returns progress unchanged', () => {
    expect(ease(0.3, 'linear')).toBe(0.3)
  })

  it('easeInOut starts and ends smoothly', () => {
    expect(ease(0, 'easeInOut')).toBe(0)
    expect(ease(1, 'easeInOut')).toBe(1)
    expect(ease(0.5, 'easeInOut')).toBe(0.5)
    expect(ease(0.25, 'easeInOut')).toBeLessThan(0.25)
    expect(ease(0.75, 'easeInOut')).toBeGreaterThan(0.75)
  })
})

describe('sampleTrack', () => {
  it('returns first keyframe before start and last after end', () => {
    const t = track('x', [
      { t: 0, value: 10, easing: 'linear' },
      { t: 2, value: 30, easing: 'linear' },
    ])
    expect(sampleTrack(t, -1)).toBe(10)
    expect(sampleTrack(t, 3)).toBe(30)
  })

  it('interpolates linearly', () => {
    const t = track('x', [
      { t: 0, value: 0, easing: 'linear' },
      { t: 4, value: 100, easing: 'linear' },
    ])
    expect(sampleTrack(t, 1)).toBe(25)
    expect(sampleTrack(t, 2)).toBe(50)
  })

  it('holds value before visible keyframe change', () => {
    const t = track('visible', [
      { t: 0, value: true, easing: 'linear' },
      { t: 1.5, value: false, easing: 'linear' },
    ])
    expect(sampleTrack(t, 1)).toBe(true)
    expect(sampleTrack(t, 1.6)).toBe(false)
  })

  it('returns undefined for empty track', () => {
    expect(sampleTrack(track('x', []), 1)).toBeUndefined()
  })
})

describe('sampleScene', () => {
  it('collects per-object overrides', () => {
    const xTrack = track('x', [
      { t: 0, value: 0, easing: 'linear' },
      { t: 2, value: 40, easing: 'linear' },
    ])
    const rotTrack: AnimationTrack = { ...track('rotation', []), objectId: 'o2' }
    rotTrack.keyframes = [
      { t: 0, value: 0, easing: 'linear' },
      { t: 2, value: 90, easing: 'linear' },
    ]
    const sampled = sampleScene([xTrack, rotTrack], 1)
    expect(sampled.get('o1')).toEqual({ x: 20 })
    expect(sampled.get('o2')).toEqual({ rotation: 45 })
  })
})

describe('applySampled', () => {
  const base: StudioObject = {
    id: 'o1',
    kind: 'character',
    name: 'Fox',
    x: 10,
    y: 20,
    rotation: 0,
    scale: 1,
    visible: true,
    color: '#fff',
    assetId: null,
    mediaUrl: null,
  }

  it('keeps base values for unsampled properties', () => {
    const result = applySampled(base, { x: 99 })
    expect(result.x).toBe(99)
    expect(result.y).toBe(20)
    expect(result.visible).toBe(true)
  })

  it('returns base when no overrides', () => {
    expect(applySampled(base, undefined)).toBe(base)
  })
})
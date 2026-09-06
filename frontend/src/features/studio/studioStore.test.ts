import { describe, expect, it } from 'vitest'

import { presetByName } from './animationPresets'
import { useStudioStore } from './studioStore'
import { toProjectDocument } from './types'

describe('studio store', () => {
  it('adds objects and selects them', () => {
    const store = useStudioStore.getState()
    store.reset()
    store.addObject('character')
    store.addObject('prop')
    const scene = useStudioStore.getState().scene
    expect(scene.objects).toHaveLength(2)
    expect(useStudioStore.getState().selectedId).toBe(scene.objects[1].id)
  })

  it('rotates and scales the selected object', () => {
    const store = useStudioStore.getState()
    store.reset()
    store.addObject('character')
    store.rotateSelected(90)
    store.scaleSelected(2)
    const object = useStudioStore.getState().scene.objects[0]
    expect(object.rotation).toBe(90)
    expect(object.scale).toBe(2)
  })

  it('removes the selected object', () => {
    const store = useStudioStore.getState()
    store.reset()
    store.addObject('character')
    store.removeSelected()
    expect(useStudioStore.getState().scene.objects).toHaveLength(0)
  })

  it('removing an object drops its tracks', () => {
    const store = useStudioStore.getState()
    store.reset()
    store.addObject('character')
    store.setRecording(true)
    store.setPlayhead(0)
    store.rotateSelected(30)
    store.setRecording(false)
    expect(useStudioStore.getState().tracks).toHaveLength(1)
    store.removeSelected()
    expect(useStudioStore.getState().tracks).toHaveLength(0)
  })
})

describe('keyframes', () => {
  it('records a keyframe for a property when recording', () => {
    const store = useStudioStore.getState()
    store.reset()
    store.addObject('character')
    store.setPlayhead(1)
    store.setRecording(true)
    store.rotateSelected(30)
    store.setRecording(false)
    const track = useStudioStore.getState().tracks.find((t) => t.property === 'rotation')
    expect(track?.keyframes).toEqual([{ t: 1, value: 30, easing: 'linear' }])
  })

  it('addKeyframeAtPlayhead upserts and sorts by time', () => {
    const store = useStudioStore.getState()
    store.reset()
    store.addObject('character')
    const id = useStudioStore.getState().selectedId!
    store.setPlayhead(2)
    store.addKeyframeAtPlayhead(id, 'scale')
    store.setPlayhead(0)
    store.addKeyframeAtPlayhead(id, 'scale')
    const track = useStudioStore.getState().tracks.find((t) => t.property === 'scale')
    expect(track?.keyframes.map((k) => k.t)).toEqual([0, 2])
  })

  it('deleteKeyframe removes only the matching keyframe', () => {
    const store = useStudioStore.getState()
    store.reset()
    store.addObject('character')
    const id = useStudioStore.getState().selectedId!
    store.setPlayhead(0)
    store.addKeyframeAtPlayhead(id, 'x')
    store.setPlayhead(3)
    store.addKeyframeAtPlayhead(id, 'x')
    const trackId = useStudioStore.getState().tracks.find((t) => t.property === 'x')!.id
    store.deleteKeyframe(trackId, 0)
    expect(useStudioStore.getState().tracks[0].keyframes.map((k) => k.t)).toEqual([3])
  })

  it('endDrag records x and y keyframes when recording', () => {
    const store = useStudioStore.getState()
    store.reset()
    store.addObject('character')
    store.setPlayhead(0.5)
    store.setRecording(true)
    store.moveSelected(200, 300)
    store.endDrag()
    store.setRecording(false)
    const props = useStudioStore.getState().tracks.map((t) => t.property)
    expect(props).toEqual(['x', 'y'])
  })
})

describe('project document', () => {
  it('serializes a scene and tracks into a versioned project document', () => {
    const store = useStudioStore.getState()
    store.reset()
    store.addObject('character')
    const scene = useStudioStore.getState().scene
    const doc = toProjectDocument({ title: 'My Story', scene, tracks: [], audio: [] })
    expect(doc.schema_version).toBe(1)
    expect(doc.renderer_version).toBe('v1')
    expect(doc.scenes[0].objects).toHaveLength(1)
    expect(doc.title).toBe('My Story')
  })
})

describe('animator', () => {
  it('adds and removes a named animation for an object', () => {
    const store = useStudioStore.getState()
    store.reset()
    store.addObject('character')
    const object = useStudioStore.getState().scene.objects[0]
    const animation = presetByName('Jump')!.make(object)
    store.addAnimation(animation)
    expect(useStudioStore.getState().animations).toHaveLength(1)
    store.removeAnimation(animation.id)
    expect(useStudioStore.getState().animations).toHaveLength(0)
  })

  it('bakes a named animation into the timeline anchored to the object pose', () => {
    const store = useStudioStore.getState()
    store.reset()
    store.addObject('character')
    const object = useStudioStore.getState().scene.objects[0]
    const animation = presetByName('Spin')!.make(object)
    store.addAnimation(animation)
    store.setPlayhead(1)
    store.addAnimationToTimeline(animation.id)
    const track = useStudioStore.getState().tracks.find((t) => t.property === 'rotation')
    expect(track).toBeDefined()
    const first = track!.keyframes[0]
    const last = track!.keyframes[track!.keyframes.length - 1]
    expect(first.t).toBe(1)
    expect(last.t).toBe(2)
    expect(last.value).toBeCloseTo(object.rotation + 360)
  })

  it('records a custom animation and clears the capture window from the timeline', () => {
    const store = useStudioStore.getState()
    store.reset()
    store.addObject('character')
    const object = useStudioStore.getState().scene.objects[0]
    const started = store.startAnimationRecording('Hop')
    expect(started).toBe(true)
    store.setPlayhead(0.2)
    store.moveSelected(object.x, object.y - 50)
    store.setPlayhead(0.8)
    store.moveSelected(object.x, object.y)
    store.stopAnimationRecording()
    const state = useStudioStore.getState()
    const animation = state.animations.find((a) => a.name === 'Hop')
    expect(animation).toBeDefined()
    const yDelta = animation!.tracks.find((t) => t.property === 'y')
    expect(yDelta).toBeDefined()
    expect(yDelta!.keyframes[0].value).toBe(-50)
    expect(state.recording).toBe(false)
    expect(state.recordingAnimation).toBeNull()
    expect(state.tracks.filter((t) => t.property === 'y')).toHaveLength(0)
  })
})
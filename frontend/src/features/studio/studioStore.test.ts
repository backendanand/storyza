import { describe, expect, it } from 'vitest'

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
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
})

describe('project document', () => {
  it('serializes a scene into a versioned project document', () => {
    const store = useStudioStore.getState()
    store.reset()
    store.addObject('character')
    const scene = useStudioStore.getState().scene
    const doc = toProjectDocument(scene, 'My Story')
    expect(doc.schema_version).toBe(1)
    expect(doc.renderer_version).toBe('v1')
    expect(doc.scenes[0].objects).toHaveLength(1)
    expect(doc.title).toBe('My Story')
  })
})
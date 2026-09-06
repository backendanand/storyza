import { describe, expect, it } from 'vitest'

import { useStudioStore } from './studioStore'
import { applyVoiceCommand, type VoiceCommand } from './voiceCommands'

const ASSETS = [
  {
    id: 'fox-1',
    slug: 'fox',
    kind: 'character' as const,
    name: 'Fox',
    description: null,
    tags: ['animal'],
    media_url: '/media/assets/fox.svg',
    thumbnail_url: null,
  },
  {
    id: 'tree-1',
    slug: 'tree',
    kind: 'prop' as const,
    name: 'Tree',
    description: null,
    tags: ['nature'],
    media_url: '/media/assets/tree.svg',
    thumbnail_url: null,
  },
  {
    id: 'forest-1',
    slug: 'bg-forest',
    kind: 'background' as const,
    name: 'Forest',
    description: null,
    tags: ['nature'],
    media_url: '/media/assets/bg-forest.svg',
    thumbnail_url: null,
  },
]

function command(action: VoiceCommand['action'], extra: Partial<VoiceCommand> = {}): VoiceCommand {
  return { action, ...extra }
}

describe('voice commands', () => {
  it('adds a character asset to the scene', () => {
    useStudioStore.getState().reset()
    const message = applyVoiceCommand(command('add_object', { asset: { id: 'fox-1', kind: 'character', name: 'Fox' } }), ASSETS)
    const scene = useStudioStore.getState().scene
    expect(message).toContain('Fox')
    expect(scene.objects).toHaveLength(1)
    expect(scene.objects[0].assetId).toBe('fox-1')
  })

  it('sets the background for a background asset', () => {
    useStudioStore.getState().reset()
    const message = applyVoiceCommand(command('set_background', { asset: { id: 'forest-1', kind: 'background', name: 'Forest' } }), ASSETS)
    expect(message).toContain('Forest')
    expect(useStudioStore.getState().background?.assetId).toBe('forest-1')
  })

  it('moves the selected object by direction', () => {
    useStudioStore.getState().reset()
    useStudioStore.getState().addObject('character', { assetId: 'fox-1', mediaUrl: '/media/assets/fox.svg', name: 'Fox' })
    const before = useStudioStore.getState().scene.objects[0]
    const message = applyVoiceCommand(command('move', { direction: 'right' }), ASSETS)
    const after = useStudioStore.getState().scene.objects[0]
    expect(message).toContain('right')
    expect(after.x).toBe(before.x + 40)
    expect(after.y).toBe(before.y)
  })

  it('returns a fallback message for an unknown command', () => {
    const message = applyVoiceCommand(command('none'), ASSETS)
    expect(message).toContain('didn')
  })
})
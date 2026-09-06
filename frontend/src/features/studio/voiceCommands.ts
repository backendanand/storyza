import type { AssetItem } from './AssetPalette'
import { selectObject, triggerSaveNow, useStudioStore } from './studioStore'

export type VoiceAction =
  | 'add_object'
  | 'set_background'
  | 'play'
  | 'stop'
  | 'delete'
  | 'bigger'
  | 'smaller'
  | 'turn'
  | 'reset'
  | 'move'
  | 'save'
  | 'none'

export interface VoiceCommand {
  action: VoiceAction
  asset?: { id: string; kind: string; name: string } | null
  direction?: 'left' | 'right' | 'up' | 'down' | null
  provider?: string
}

const MOVE_STEP = 40

export function applyVoiceCommand(command: VoiceCommand, assets: AssetItem[]): string {
  const store = useStudioStore.getState()
  const asset = command.asset ? assets.find((a) => a.id === command.asset?.id) : undefined

  switch (command.action) {
    case 'add_object': {
      if (!asset) return "I couldn't find that sticker — try again 🙈"
      if (asset.kind === 'background') {
        store.setBackground({ assetId: asset.id, mediaUrl: asset.media_url })
        return `Changed the background to ${asset.name} 🎨`
      }
      store.addObject(asset.kind, {
        assetId: asset.id,
        mediaUrl: asset.media_url,
        name: asset.name,
      })
      return `Added ${asset.name} to your scene ✨`
    }
    case 'set_background': {
      if (!asset) return "I couldn't find that background 🙈"
      store.setBackground({ assetId: asset.id, mediaUrl: asset.media_url })
      return `Changed the background to ${asset.name} 🎨`
    }
    case 'play':
      store.setPlaying(true)
      return 'Playing your animation ▶️'
    case 'stop':
      store.setPlaying(false)
      return 'Stopped ⏹'
    case 'delete': {
      if (!store.selectedId) return 'Nothing selected to delete 🙈'
      store.removeSelected()
      return 'Deleted it 🗑️'
    }
    case 'bigger':
      store.scaleSelected(1.15)
      return 'Made it bigger 🔍'
    case 'smaller':
      store.scaleSelected(0.87)
      return 'Made it smaller 🔎'
    case 'turn':
      store.rotateSelected(15)
      return 'Turned it ↻'
    case 'reset':
      store.reset()
      return 'Started a fresh scene ✨'
    case 'move': {
      const selected = selectObject(store.scene, store.selectedId)
      if (!selected) return 'Nothing selected to move 🙈'
      const dir = command.direction ?? 'right'
      const dx = dir === 'left' ? -MOVE_STEP : dir === 'right' ? MOVE_STEP : 0
      const dy = dir === 'up' ? -MOVE_STEP : dir === 'down' ? MOVE_STEP : 0
      store.moveSelected(selected.x + dx, selected.y + dy)
      return `Moved it ${dir} 🎈`
    }
    case 'save':
      triggerSaveNow()
      return 'Saving… 💾'
    case 'none':
    default:
      return "I didn't catch that — try 'add a fox' or 'forest background' 🎤"
  }
}
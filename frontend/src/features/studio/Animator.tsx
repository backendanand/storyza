import { useState } from 'react'
import { Play, Plus, Square, X } from 'lucide-react'

import { cn } from '../../lib/utils'
import { presetAnimations, presetByName } from './animationPresets'
import { selectObject, useStudioStore } from './studioStore'

export function Animator() {
  const [menuOpen, setMenuOpen] = useState(false)

  const scene = useStudioStore((s) => s.scene)
  const animations = useStudioStore((s) => s.animations)
  const selectedId = useStudioStore((s) => s.selectedId)
  const isPlaying = useStudioStore((s) => s.isPlaying)
  const previewAnimation = useStudioStore((s) => s.previewAnimation)
  const recordingAnimation = useStudioStore((s) => s.recordingAnimation)
  const setPreviewAnimation = useStudioStore((s) => s.setPreviewAnimation)
  const addAnimation = useStudioStore((s) => s.addAnimation)
  const removeAnimation = useStudioStore((s) => s.removeAnimation)
  const addAnimationToTimeline = useStudioStore((s) => s.addAnimationToTimeline)
  const startAnimationRecording = useStudioStore((s) => s.startAnimationRecording)
  const stopAnimationRecording = useStudioStore((s) => s.stopAnimationRecording)

  const selected = selectObject(scene, selectedId)
  const objectAnimations = selected
    ? animations.filter((a) => a.objectId === selected.id)
    : []
  const recordingFor = recordingAnimation
    ? selectObject(scene, recordingAnimation.objectId)
    : undefined

  const createPresetAnimation = (presetName: string) => {
    if (!selected) return
    const preset = presetByName(presetName)
    if (!preset) return
    const animation = preset.make(selected)
    addAnimation(animation)
    setPreviewAnimation({ objectId: selected.id, animationId: animation.id })
    setMenuOpen(false)
  }

  const startCustomRecording = () => {
    if (!selected) return
    const started = startAnimationRecording()
    if (started) setMenuOpen(false)
  }

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">
          🎬 Animations
        </span>
        {recordingAnimation ? (
          <button
            onClick={stopAnimationRecording}
            className="flex h-7 items-center gap-1.5 rounded-full bg-coral-500 px-3 text-[11px] font-bold text-white shadow-candy transition-colors hover:bg-coral-600"
          >
            <Square className="h-3 w-3 fill-current" /> Save “{recordingAnimation.name}”
          </button>
        ) : (
          selected && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-7 items-center gap-1 rounded-full bg-brand-600 px-3 text-[11px] font-bold text-white shadow-lift transition-colors hover:bg-brand-700"
              >
                <Plus className="h-3.5 w-3.5" /> New
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-40 mt-1 w-44 rounded-2xl border-2 border-slate-100 bg-white p-1.5 shadow-lift">
                  {presetAnimations(selected).map((animation) => (
                    <button
                      key={animation.name}
                      onClick={() => createPresetAnimation(animation.name)}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-bold text-slate-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                    >
                      <span aria-hidden>
                        {animation.name === 'Jump' ? '🦘' : animation.name === 'Spin' ? '🌀' : animation.name === 'Wiggle' ? '🐛' : animation.name === 'Run' ? '🏃' : animation.name === 'Idle' ? '😌' : '😋'}
                      </span>
                      {animation.name}
                    </button>
                  ))}
                  <div className="my-1 h-px bg-slate-100" />
                  <button
                    onClick={startCustomRecording}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-bold text-slate-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                  >
                    🎤 Record custom
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {recordingAnimation ? (
        <p className="text-[11px] font-semibold text-coral-700">
          Move, turn or resize {recordingFor?.name ?? 'the object'} to capture its motion
          (time loops every 2s). Press save when you're happy! ✨
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {objectAnimations.length === 0 && (
            <p className="text-[11px] font-semibold text-slate-400">
              {selected ? 'No animations yet — make one with New! ✨' : 'Pick an object to add animations.'}
            </p>
          )}
          {objectAnimations.map((animation) => {
            const isPreviewing = previewAnimation?.animationId === animation.id
            return (
              <div
                key={animation.id}
                className="flex items-center gap-0.5 rounded-full border-2 border-slate-100 bg-white py-0.5 pr-1 pl-2.5"
              >
                <span className="text-[11px] font-bold text-slate-600">{animation.name}</span>
                <button
                  onClick={() => setPreviewAnimation({ objectId: animation.objectId, animationId: animation.id })}
                  disabled={isPlaying}
                  title="Preview this animation"
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full transition-colors',
                    isPreviewing ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-brand-50 hover:text-brand-600',
                  )}
                >
                  {isPreviewing ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                </button>
                <button
                  onClick={() => addAnimationToTimeline(animation.id)}
                  disabled={isPlaying}
                  title="Add to the timeline at the playhead"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-mint-50 hover:text-mint-600"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  onClick={() => removeAnimation(animation.id)}
                  disabled={isPlaying}
                  title="Delete this animation"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-coral-50 hover:text-coral-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

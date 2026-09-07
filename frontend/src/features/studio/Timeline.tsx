import { useRef, useState } from 'react'
import {
  ArrowRightLeft,
  ArrowUpDown,
  ChevronDown,
  Expand,
  Eye,
  Mic,
  Minus,
  Play,
  Plus,
  RotateCw,
  Square,
  Trash2,
  Volume2,
  X,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '../../lib/utils'
import { playClip, recordVoice, type SfxPreset } from './audio/sfx'
import { presetByName, presetAnimations } from './animationPresets'
import { selectObject, useStudioStore, tracksForObject } from './studioStore'
import { contentDuration, type AudioClip, type TrackProperty } from './types'

const PX_PER_SEC = 80
const ROW_HEIGHT = 32
const PROPERTIES: { key: TrackProperty; label: string; color: string; icon: LucideIcon }[] = [
  { key: 'x', label: 'Slide', color: '#f59e0b', icon: ArrowRightLeft },
  { key: 'y', label: 'Lift', color: '#22c55e', icon: ArrowUpDown },
  { key: 'rotation', label: 'Turn', color: '#8b5cf6', icon: RotateCw },
  { key: 'scale', label: 'Size', color: '#3b82f6', icon: Expand },
  { key: 'visible', label: 'Show / Hide', color: '#f43f5e', icon: Eye },
]

export function Timeline() {
  const rulerRef = useRef<HTMLDivElement>(null)
  const dragSeekRef = useRef(false)
  const keyframeDragRef = useRef<{ trackId: string; currentTime: number } | null>(null)
  const [recordingNotice, setRecordingNotice] = useState<string | null>(null)
  const [animMenuOpen, setAnimMenuOpen] = useState(false)
  const [timelineTab, setTimelineTab] = useState<'animations' | 'timeline'>('animations')

  const scene = useStudioStore((s) => s.scene)
  const tracks = useStudioStore((s) => s.tracks)
  const audio = useStudioStore((s) => s.audio)
  const animations = useStudioStore((s) => s.animations)
  const selectedId = useStudioStore((s) => s.selectedId)
  const selectedKeyframe = useStudioStore((s) => s.selectedKeyframe)
  const playheadTime = useStudioStore((s) => s.playheadTime)
  const isPlaying = useStudioStore((s) => s.isPlaying)
  const recording = useStudioStore((s) => s.recording)
  const previewAnimation = useStudioStore((s) => s.previewAnimation)
  const recordingAnimation = useStudioStore((s) => s.recordingAnimation)
  const durationSetting = useStudioStore((s) => s.duration)
  const setDuration = useStudioStore((s) => s.setDuration)
  const setPlayhead = useStudioStore((s) => s.setPlayhead)
  const setRecording = useStudioStore((s) => s.setRecording)
  const addKeyframeAtPlayhead = useStudioStore((s) => s.addKeyframeAtPlayhead)
  const deleteKeyframe = useStudioStore((s) => s.deleteKeyframe)
  const setKeyframeTime = useStudioStore((s) => s.setKeyframeTime)
  const selectKeyframe = useStudioStore((s) => s.selectKeyframe)
  const addAudio = useStudioStore((s) => s.addAudio)
  const removeAudio = useStudioStore((s) => s.removeAudio)
  const addAnimation = useStudioStore((s) => s.addAnimation)
  const removeAnimation = useStudioStore((s) => s.removeAnimation)
  const setPreviewAnimation = useStudioStore((s) => s.setPreviewAnimation)
  const startAnimationRecording = useStudioStore((s) => s.startAnimationRecording)
  const stopAnimationRecording = useStudioStore((s) => s.stopAnimationRecording)
  const addAnimationToTimeline = useStudioStore((s) => s.addAnimationToTimeline)

  const selected = selectObject(scene, selectedId)
  const selectedTracks = selected ? tracksForObject(tracks, selected.id) : []
  const objectAnimations = selected
    ? animations.filter((a) => a.objectId === selected.id)
    : []
  const recordingFor = recordingAnimation
    ? selectObject(scene, recordingAnimation.objectId)
    : undefined

  const duration = Math.max(durationSetting, contentDuration(tracks, audio), 1)
  const timelineWidth = duration * PX_PER_SEC

  const timeFromEvent = (clientX: number): number => {
    const rect = rulerRef.current?.getBoundingClientRect()
    if (!rect) return 0
    const time = (clientX - rect.left) / PX_PER_SEC
    return Math.max(0, Math.min(duration, time))
  }

  const seek = (clientX: number) => {
    setPlayhead(timeFromEvent(clientX))
  }

  const startSeek = (e: React.PointerEvent) => {
    dragSeekRef.current = true
    seek(e.clientX)
  }

  const onSeekMove = (e: React.PointerEvent) => {
    if (dragSeekRef.current) seek(e.clientX)
  }

  const stopSeek = () => {
    dragSeekRef.current = false
  }

  const startKeyframeDrag = (e: React.PointerEvent, trackId: string, time: number) => {
    if (isPlaying) return
    e.stopPropagation()
    keyframeDragRef.current = { trackId, currentTime: time }
    selectKeyframe(trackId, time)
    const move = (ev: PointerEvent) => {
      const rect = rulerRef.current?.getBoundingClientRect()
      if (!rect || !keyframeDragRef.current) return
      const nextTime = Math.max(0, Math.min(duration, (ev.clientX - rect.left) / PX_PER_SEC))
      setKeyframeTime(keyframeDragRef.current.trackId, keyframeDragRef.current.currentTime, nextTime)
      keyframeDragRef.current.currentTime = nextTime
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      keyframeDragRef.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const addSfx = () => {
    const preset: SfxPreset = 'pop'
    const clip: AudioClip = {
      id: `sfx-${Date.now()}`,
      kind: 'sfx',
      name: 'Pop',
      startTime: playheadTime,
      duration: 0.4,
      preset,
    }
    addAudio(clip)
  }

  const addVoice = async () => {
    setRecordingNotice('Recording…')
    try {
      const { dataUrl, duration } = await recordVoice()
      addAudio({
        id: `voice-${Date.now()}`,
        kind: 'voice',
        name: 'Voice',
        startTime: playheadTime,
        duration,
        dataUrl,
      })
      setRecordingNotice(null)
    } catch (error) {
      setRecordingNotice(error instanceof Error ? error.message : 'Recording failed')
    }
  }

  const seconds = Array.from({ length: Math.ceil(duration) }, (_, i) => i + 1)

  const createPresetAnimation = (presetName: string) => {
    if (!selected) return
    const preset = presetByName(presetName)
    if (!preset) return
    const animation = preset.make(selected)
    addAnimation(animation)
    setPreviewAnimation({ objectId: selected.id, animationId: animation.id })
    setAnimMenuOpen(false)
  }

  const startCustomRecording = () => {
    if (!selected) return
    const started = startAnimationRecording()
    if (started) setAnimMenuOpen(false)
  }

  return (
    <div className="flex h-full w-full max-h-[400px] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-white p-2 shadow-soft">
      {/* Top toolbar - recording and duration controls */}
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
        <button
          onClick={() => setRecording(!recording)}
          className={cn(
            'flex h-9 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors',
            recording ? 'bg-coral-500 text-white shadow-candy' : 'bg-surface text-ink-muted hover:bg-surface-strong',
          )}
        >
          <span className={cn('h-2.5 w-2.5 rounded-full', recording ? 'animate-pulse bg-white' : 'bg-coral-500')} />
          {recording ? 'Recording…' : 'Record 🎬'}
        </button>
        {selected && (
          <span className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800">
            Animating: <span className="text-brand-700">{selected.name}</span>
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex h-9 items-center gap-0.5 rounded-full bg-surface px-1.5">
            <button
              onClick={() => setDuration(duration - 1)}
              disabled={duration <= 1}
              aria-label="Decrease timeline length"
              title="Shorter timeline"
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-white disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="px-1 text-xs font-bold text-ink-muted tabular-nums">{duration}s</span>
            <button
              onClick={() => setDuration(duration + 1)}
              disabled={duration >= 120}
              aria-label="Increase timeline length"
              title="Longer timeline"
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-white disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab switcher for Animations and Timeline */}
      <div className="mb-2 flex shrink-0 gap-1 rounded-2xl bg-surface p-1">
        <button
          onClick={() => setTimelineTab('animations')}
          aria-pressed={timelineTab === 'animations'}
          className={cn(
            'flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors',
            timelineTab === 'animations'
              ? 'bg-white text-brand-700 shadow-soft'
              : 'text-ink-muted hover:text-ink',
          )}
        >
          🎬 Animations
        </button>
        <button
          onClick={() => setTimelineTab('timeline')}
          aria-pressed={timelineTab === 'timeline'}
          className={cn(
            'flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors',
            timelineTab === 'timeline'
              ? 'bg-white text-brand-700 shadow-soft'
              : 'text-ink-muted hover:text-ink',
          )}
        >
          ⏱️ Timeline
        </button>
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-auto">
        {timelineTab === 'animations' ? (
          /* Animator: named reusable animations for the selected object */
          <div className="rounded-2xl border border-border-subtle bg-surface/60 px-2 py-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-ink-muted">🎬 Animations</span>
          {recordingAnimation ? (
            <button
              onClick={stopAnimationRecording}
              className="flex h-7 items-center gap-1.5 rounded-full bg-coral-500 px-3 text-[11px] font-bold text-white shadow-candy transition-colors hover:bg-coral-600"
            >
              <Square className="h-3 w-3 fill-current" /> Stop & save “{recordingAnimation.name}”
            </button>
          ) : (
            selected && (
              <div className="relative">
                <button
                  onClick={() => setAnimMenuOpen((open) => !open)}
                  className="flex h-7 items-center gap-1 rounded-full bg-brand-600 px-3 text-[11px] font-bold text-white shadow-lift transition-colors hover:bg-brand-700"
                >
                  <Plus className="h-3.5 w-3.5" /> New
                </button>
                {animMenuOpen && (
                  <div className="absolute right-0 z-40 mt-1 w-40 rounded-2xl border-2 border-slate-100 bg-white p-1.5 shadow-lift">
                    {presetAnimations(selected).map((animation) => (
                      <button
                        key={animation.name}
                        onClick={() => createPresetAnimation(animation.name)}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-bold text-slate-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                      >
                        <span aria-hidden>{animation.name === 'Jump' ? '🦘' : animation.name === 'Spin' ? '🌀' : animation.name === 'Wiggle' ? '🐛' : animation.name === 'Run' ? '🏃' : animation.name === 'Idle' ? '😌' : '😋'}</span>
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
          <p className="mt-1.5 text-[11px] font-semibold text-coral-700">
            Move, turn or resize {recordingFor?.name ?? 'the object'} to capture its motion
            (time loops every 2s). Press stop when you're happy! ✨
          </p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
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
          </div>
        ) : (
        /* Timeline content */
          <div className="scroll-thin flex min-h-0 flex-1 flex-col">
            {/* Audio controls */}
            <div className="mb-2 flex shrink-0 gap-2">
              <button
                onClick={addSfx}
                className="flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-xs font-bold text-ink-muted transition-colors hover:bg-surface-strong"
              >
                <Volume2 className="h-3.5 w-3.5" /> SFX
              </button>
              <button
                onClick={() => void addVoice()}
                className="flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-xs font-bold text-ink-muted transition-colors hover:bg-surface-strong"
              >
                <Mic className="h-3.5 w-3.5" /> Voice
              </button>
              <button
                onClick={() => {
                  if (selectedKeyframe) {
                    deleteKeyframe(selectedKeyframe.trackId, selectedKeyframe.time)
                  }
                }}
                disabled={!selectedKeyframe}
                className="flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-xs font-bold text-ink-muted transition-colors hover:bg-surface-strong disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>

            <div
          className="relative select-none"
          style={{ width: timelineWidth }}
          onPointerDown={startSeek}
          onPointerMove={onSeekMove}
          onPointerUp={stopSeek}
          onPointerLeave={stopSeek}
        >
          {/* ruler */}
          <div ref={rulerRef} className="relative h-6 rounded-t-xl border-b border-border-subtle bg-brand-50/60">
            {seconds.map((s) => (
              <span
                key={s}
                className="absolute top-1.5 text-[10px] font-bold text-ink-faint"
                style={{ left: s * PX_PER_SEC }}
              >
                {s}s
              </span>
            ))}
          </div>

          {/* audio strip */}
          <div className="relative h-8 border-b border-border-subtle bg-grape-50/60">
            {audio.map((clip) => (
              <div
                key={clip.id}
                className="group absolute top-1 flex h-6 items-center gap-1 rounded-full bg-grape-500 px-2 text-[10px] font-bold text-white"
                style={{
                  left: clip.startTime * PX_PER_SEC,
                  width: Math.max(40, clip.duration * PX_PER_SEC),
                }}
              >
                <button onClick={() => playClip(clip)} className="hover:text-grape-200" title="Preview">
                  <Play className="h-2.5 w-2.5 fill-current" />
                </button>
                <span className="truncate">{clip.kind === 'voice' ? '🎤 Voice' : '🔊 SFX'}</span>
                <button
                  onClick={() => removeAudio(clip.id)}
                  className="ml-auto hidden hover:text-grape-200 group-hover:block"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* property lanes for the selected object */}
          <div className="flex flex-col">
            {PROPERTIES.map((prop) => {
              const track = selectedTracks.find((t) => t.property === prop.key)
              const Icon = prop.icon
              return (
                <div
                  key={prop.key}
                  className="relative border-b border-border-subtle"
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Fixed label gutter so full names are never clipped */}
                  <span className="absolute top-0 bottom-0 left-0 z-10 flex w-24 shrink-0 items-center gap-1.5 border-r border-border-subtle bg-white pr-2 pl-1.5 text-[11px] font-bold text-ink-muted">
                    <Icon className="h-4 w-4 shrink-0" style={{ color: prop.color }} />
                    <span className="truncate">{prop.label}</span>
                  </span>
                  <button
                    onClick={() => selected && addKeyframeAtPlayhead(selected.id, prop.key)}
                    className="absolute top-1/2 right-2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-brand-50 hover:text-brand-600"
                    title="Add a key moment at the playhead"
                    disabled={!selected}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <div className="absolute inset-y-0 right-0 left-24">
                    {track?.keyframes.map((kf) => {
                      const isSelected =
                        selectedKeyframe?.trackId === track.id &&
                        Math.abs(selectedKeyframe.time - kf.t) < 0.0001
                      return (
                        <button
                          key={kf.t}
                          onPointerDown={(e) => startKeyframeDrag(e, track.id, kf.t)}
                          onClick={() => selectKeyframe(track.id, kf.t)}
                          className={cn(
                            'absolute top-1/2 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-soft transition-transform',
                            isSelected ? 'scale-125 ring-2 ring-slate-700' : 'hover:scale-125',
                          )}
                          style={{ left: kf.t * PX_PER_SEC, background: prop.color }}
                          title={`${prop.label} @ ${kf.t.toFixed(1)}s = ${String(kf.value)}`}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* playhead */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-30 w-0.5 bg-coral-500"
            style={{ left: playheadTime * PX_PER_SEC }}
          >
            <div className="absolute -top-0.5 -left-1 h-3 w-2.5 rounded-t bg-coral-500" />
          </div>
            </div>

            {recordingNotice && <p className="mt-2 text-xs font-semibold text-sunny-800">{recordingNotice}</p>}
            {recording && (
              <p className="mt-2 text-xs font-semibold text-ink-muted">
                Recording is on — move, turn or resize objects to add key moments.
              </p>
            )}
            {!selected && (
              <p className="mt-2 text-xs font-semibold text-ink-faint">
                Pick an object on the stage to animate it. ✨
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
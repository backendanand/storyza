import { useRef, useState } from 'react'
import {
  ArrowRightLeft,
  ArrowUpDown,
  Expand,
  Eye,
  Mic,
  Minus,
  Play,
  Plus,
  RotateCw,
  Trash2,
  Volume2,
  X,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '../../lib/utils'
import { playClip, recordVoice, type SfxPreset } from './audio/sfx'
import { selectObject, useStudioStore, tracksForObject } from './studioStore'
import { contentDuration, type AudioClip, type TrackProperty } from './types'

const PX_PER_SEC = 80
const ROW_HEIGHT = 22
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

  const scene = useStudioStore((s) => s.scene)
  const tracks = useStudioStore((s) => s.tracks)
  const audio = useStudioStore((s) => s.audio)
  const selectedId = useStudioStore((s) => s.selectedId)
  const selectedKeyframe = useStudioStore((s) => s.selectedKeyframe)
  const playheadTime = useStudioStore((s) => s.playheadTime)
  const isPlaying = useStudioStore((s) => s.isPlaying)
  const recording = useStudioStore((s) => s.recording)
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

  const selected = selectObject(scene, selectedId)
  const selectedTracks = selected ? tracksForObject(tracks, selected.id) : []

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

  return (
    <div className="flex shrink-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-soft">
      {/* Toolbar: transport/record on the left, audio + duration grouped on the right */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border-subtle px-2.5 py-1">
        <button
          onClick={() => setRecording(!recording)}
          className={cn(
            'flex h-7 items-center gap-2 rounded-full px-3 text-xs font-bold transition-colors',
            recording ? 'bg-coral-500 text-white shadow-candy' : 'bg-surface text-ink-muted hover:bg-surface-strong',
          )}
        >
          <span className={cn('h-2.5 w-2.5 rounded-full', recording ? 'animate-pulse bg-white' : 'bg-coral-500')} />
          {recording ? 'Recording…' : 'Record 🎬'}
        </button>

        {selected && (
          <span className="hidden items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800 md:flex">
            Animating: <span className="truncate text-brand-700">{selected.name}</span>
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {/* Duration group */}
          <div className="flex h-7 items-center gap-0.5 rounded-full bg-surface px-1">
            <button
              onClick={() => setDuration(duration - 1)}
              disabled={duration <= 1}
              aria-label="Decrease timeline length"
              title="Shorter timeline"
              className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-white disabled:opacity-40"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-1 text-xs font-bold text-ink-muted tabular-nums">{duration}s</span>
            <button
              onClick={() => setDuration(duration + 1)}
              disabled={duration >= 120}
              aria-label="Increase timeline length"
              title="Longer timeline"
              className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-white disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-5 w-px bg-border-subtle" />

          {/* Audio group */}
          <button
            onClick={addSfx}
            className="flex h-7 items-center gap-1 rounded-full bg-surface px-2.5 text-xs font-bold text-ink-muted transition-colors hover:bg-surface-strong"
            title="Add a pop sound effect"
          >
            <Volume2 className="h-3.5 w-3.5" /> SFX
          </button>
          <button
            onClick={() => void addVoice()}
            className="flex h-7 items-center gap-1 rounded-full bg-surface px-2.5 text-xs font-bold text-ink-muted transition-colors hover:bg-surface-strong"
            title="Record your voice"
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
            className="flex h-7 items-center gap-1 rounded-full bg-surface px-2.5 text-xs font-bold text-ink-muted transition-colors hover:bg-surface-strong disabled:opacity-40"
            title="Remove the selected key moment"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </div>

      {/* Timeline body: fixed label gutter + scrollable timeline */}
      <div className="flex min-h-0 items-stretch">
        {/* Fixed left gutter — labels never scroll */}
        <div className="flex shrink-0 flex-col border-r border-border-subtle bg-white">
          <div className="flex h-5 items-end justify-end border-b border-border-subtle bg-brand-50/60 pb-0.5 pr-2 text-[10px] font-bold text-ink-faint">
            0s
          </div>
          <div className="flex h-6 items-center gap-1.5 border-b border-border-subtle bg-grape-50/60 pr-2 pl-1.5 text-[11px] font-bold text-ink-muted">
            <Volume2 className="h-3.5 w-3.5 shrink-0 text-grape-500" />
            <span className="whitespace-nowrap">Audio</span>
          </div>
          {PROPERTIES.map((prop) => {
            const Icon = prop.icon
            return (
              <div
                key={prop.key}
                className="flex items-center gap-1.5 border-b border-border-subtle pr-2 pl-1.5"
                style={{ height: ROW_HEIGHT }}
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color: prop.color }} />
                <span className="whitespace-nowrap text-[11px] font-bold text-ink-muted">{prop.label}</span>
              </div>
            )
          })}
        </div>

        {/* Scrollable timeline — only this scrolls horizontally */}
        <div
          className="relative min-h-0 min-w-0 flex-1 select-none overflow-x-auto"
          onPointerDown={startSeek}
          onPointerMove={onSeekMove}
          onPointerUp={stopSeek}
          onPointerLeave={stopSeek}
        >
          <div className="relative shrink-0" style={{ width: timelineWidth }}>
            {/* ruler */}
            <div ref={rulerRef} className="relative h-5 border-b border-border-subtle bg-brand-50/60">
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
            <div className="relative h-6 border-b border-border-subtle bg-grape-50/60">
              {audio.map((clip) => (
                <div
                  key={clip.id}
                  className="group absolute top-0.5 flex h-5 items-center gap-1 rounded-full bg-grape-500 px-2 text-[10px] font-bold text-white"
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
                return (
                  <div
                    key={prop.key}
                    className="relative border-b border-border-subtle"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <button
                      onClick={() => selected && addKeyframeAtPlayhead(selected.id, prop.key)}
                      className="absolute top-1/2 right-2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-brand-50 hover:text-brand-600"
                      title="Add a key moment at the playhead"
                      disabled={!selected}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
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
        </div>
      </div>

      {/* Collapse empty lanes / notices */}
      {recordingNotice && (
        <p className="shrink-0 border-t border-border-subtle px-3 py-1 text-[11px] font-semibold text-sunny-800">
          {recordingNotice}
        </p>
      )}
      {recording && (
        <p className="shrink-0 border-t border-border-subtle px-3 py-1 text-[11px] font-semibold text-ink-muted">
          Recording is on — move, turn or resize objects to add key moments.
        </p>
      )}
      {!selected && (
        <p className="shrink-0 border-t border-border-subtle px-3 py-1 text-[11px] font-semibold text-ink-faint">
          Pick an object on the stage to animate it. ✨
        </p>
      )}
    </div>
  )
}

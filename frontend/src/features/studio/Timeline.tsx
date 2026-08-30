import { useRef, useState } from 'react'
import { Mic, Plus, Trash2, Volume2, X } from 'lucide-react'

import { cn } from '../../lib/utils'
import { playClip, recordVoice, type SfxPreset } from './audio/sfx'
import { selectObject, useStudioStore, tracksForObject } from './studioStore'
import { trackDuration, type AudioClip, type TrackProperty } from './types'

const PX_PER_SEC = 80
const ROW_HEIGHT = 26
const PROPERTIES: { key: TrackProperty; label: string; color: string }[] = [
  { key: 'x', label: 'Move X', color: '#f59e0b' },
  { key: 'y', label: 'Move Y', color: '#22c55e' },
  { key: 'rotation', label: 'Turn', color: '#8b5cf6' },
  { key: 'scale', label: 'Size', color: '#3b82f6' },
  { key: 'visible', label: 'Show / Hide', color: '#ef4444' },
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

  const audioEnd = audio.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0)
  const duration = Math.max(trackDuration(tracks), audioEnd, 5)
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
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setRecording(!recording)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
            recording ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          )}
        >
          <span className={cn('h-2 w-2 rounded-full', recording ? 'animate-pulse bg-white' : 'bg-slate-400')} />
          {recording ? 'Recording…' : 'Record'}
        </button>
        {selected && (
          <span className="text-xs text-slate-500">
            Animating: <span className="font-semibold text-slate-700">{selected.name}</span>
          </span>
        )}
        <button
          onClick={() => {
            if (selectedKeyframe) {
              deleteKeyframe(selectedKeyframe.trackId, selectedKeyframe.time)
            }
          }}
          disabled={!selectedKeyframe}
          className="ml-auto flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete keyframe
        </button>
        <button
          onClick={addSfx}
          className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
        >
          <Volume2 className="h-3.5 w-3.5" /> + SFX
        </button>
        <button
          onClick={() => void addVoice()}
          className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
        >
          <Mic className="h-3.5 w-3.5" /> + Voice
        </button>
      </div>

      <div className="overflow-x-auto">
        <div
          className="relative select-none"
          style={{ width: timelineWidth }}
          onPointerDown={startSeek}
          onPointerMove={onSeekMove}
          onPointerUp={stopSeek}
          onPointerLeave={stopSeek}
        >
          {/* ruler */}
          <div ref={rulerRef} className="relative h-6 border-b border-slate-200 bg-slate-50">
            {seconds.map((s) => (
              <span
                key={s}
                className="absolute top-1.5 text-[10px] text-slate-400"
                style={{ left: s * PX_PER_SEC }}
              >
                {s}s
              </span>
            ))}
          </div>

          {/* audio strip */}
          <div className="relative h-8 border-b border-slate-100 bg-indigo-50/40">
            {audio.map((clip) => (
              <div
                key={clip.id}
                className="group absolute top-1 flex h-6 items-center gap-1 rounded bg-indigo-500 px-1.5 text-[10px] font-semibold text-white"
                style={{
                  left: clip.startTime * PX_PER_SEC,
                  width: Math.max(40, clip.duration * PX_PER_SEC),
                }}
              >
                <button
                  onClick={() => playClip(clip)}
                  className="hover:text-indigo-100"
                  title="Preview"
                >
                  ▶
                </button>
                <span className="truncate">{clip.kind === 'voice' ? '🎤 Voice' : '🔊 SFX'}</span>
                <button
                  onClick={() => removeAudio(clip.id)}
                  className="ml-auto hidden hover:text-indigo-100 group-hover:block"
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
                  className="relative border-b border-slate-100"
                  style={{ height: ROW_HEIGHT }}
                >
                  <span className="absolute left-0 top-1/2 z-10 -translate-y-1/2 bg-white pr-2 text-[10px] font-medium text-slate-400">
                    {prop.label}
                  </span>
                  <button
                    onClick={() => selected && addKeyframeAtPlayhead(selected.id, prop.key)}
                    className="absolute right-0 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Add keyframe at playhead"
                    disabled={!selected}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 top-0 mx-8">
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
                            'absolute top-1/2 z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow',
                            isSelected ? 'ring-2 ring-slate-700' : 'hover:scale-125',
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
            className="pointer-events-none absolute top-0 bottom-0 z-30 w-0.5 bg-slate-700"
            style={{ left: playheadTime * PX_PER_SEC }}
          >
            <div className="absolute -left-1 -top-0.5 h-3 w-2.5 rounded-t bg-slate-700" />
          </div>
        </div>
      </div>

      {recordingNotice && <p className="mt-2 text-xs text-amber-700">{recordingNotice}</p>}
      {recording && (
        <p className="mt-2 text-xs text-slate-500">
          Recording is on — move, turn or resize objects to place keyframes at the playhead.
        </p>
      )}
      {!selected && (
        <p className="mt-2 text-xs text-slate-400">Select an object on the canvas to animate it.</p>
      )}
    </div>
  )
}
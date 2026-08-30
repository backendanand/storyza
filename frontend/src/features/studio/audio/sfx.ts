export type SfxPreset = 'pop' | 'whoosh' | 'chime'

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  gain: number,
  delay = 0,
) {
  const ctx = getCtx()
  const start = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  g.gain.setValueAtTime(gain, start)
  g.gain.exponentialRampToValueAtTime(0.001, start + duration)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

function noise(duration: number, delay = 0) {
  const ctx = getCtx()
  const start = ctx.currentTime + delay
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.35
  }
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(800, start)
  filter.frequency.exponentialRampToValueAtTime(300, start + duration)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.4, start)
  g.gain.exponentialRampToValueAtTime(0.001, start + duration)
  src.connect(filter)
  filter.connect(g)
  g.connect(ctx.destination)
  src.start(start)
}

export function playPreset(preset: SfxPreset) {
  if (preset === 'pop') {
    tone(650, 0.1, 'triangle', 0.25)
    tone(320, 0.14, 'sine', 0.2, 0.03)
  } else if (preset === 'whoosh') {
    noise(0.45)
  } else {
    tone(880, 0.35, 'sine', 0.16)
    tone(1320, 0.5, 'sine', 0.1, 0.03)
    tone(1760, 0.55, 'sine', 0.06, 0.06)
  }
}

export interface VoiceRecording {
  dataUrl: string
  duration: number
}

export async function recordVoice(maxSeconds = 5): Promise<VoiceRecording> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Voice recording is not supported in this browser')
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  return new Promise<VoiceRecording>((resolve, reject) => {
    try {
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.onerror = () => {
        stream.getTracks().forEach((t) => t.stop())
        reject(new Error('Recording failed'))
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        const dataUrl = URL.createObjectURL(blob)
        const audio = new Audio(dataUrl)
        audio.onloadedmetadata = () => resolve({ dataUrl, duration: audio.duration || 1 })
        setTimeout(() => resolve({ dataUrl, duration: 1 }), 1500)
      }
      recorder.start()
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, maxSeconds * 1000)
    } catch (error) {
      stream.getTracks().forEach((t) => t.stop())
      reject(error instanceof Error ? error : new Error('Recording failed'))
    }
  })
}

export function playClip(clip: { kind: 'sfx' | 'voice'; preset?: SfxPreset; dataUrl?: string }) {
  if (clip.kind === 'voice' && clip.dataUrl) {
    const audio = new Audio(clip.dataUrl)
    void audio.play().catch(() => undefined)
  } else if (clip.kind === 'sfx' && clip.preset) {
    playPreset(clip.preset)
  }
}
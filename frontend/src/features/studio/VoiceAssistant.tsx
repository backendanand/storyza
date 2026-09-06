import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Mic, MicOff } from 'lucide-react'

import { apiClient } from '../../lib/api'
import { cn } from '../../lib/utils'
import type { AssetItem } from './AssetPalette'
import { applyVoiceCommand, type VoiceCommand } from './voiceCommands'

interface SpeechRecognitionAlternative {
  transcript: string
}
interface SpeechRecognitionResult {
  readonly [index: number]: SpeechRecognitionAlternative
}
interface SpeechRecognitionEvent {
  resultIndex: number
  results: {
    length: number
    [index: number]: SpeechRecognitionResult
  }
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function VoiceAssistant() {
  const [supported] = useState<boolean>(() => getRecognitionCtor() !== null)
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const activeRef = useRef(false)

  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: () => apiClient.get<{ items: AssetItem[] }>('/assets?page_size=100'),
    staleTime: 5 * 60_000,
  })
  const assets = useMemo(() => assetsData?.items ?? [], [assetsData])

  const runCommand = useCallback(
    async (transcript: string) => {
      setProcessing(true)
      try {
        const command = await apiClient.post<VoiceCommand>('/ai/voice-command', {
          transcript,
          assets: assets.map((a) => ({ id: a.id, kind: a.kind, name: a.name })),
        })
        setFeedback(applyVoiceCommand(command, assets))
      } catch {
        setFeedback('Voice service is unavailable right now 🙈')
      } finally {
        setProcessing(false)
      }
    },
    [assets],
  )

  const stopListening = useCallback(() => {
    activeRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setListening(false)
  }, [])

  const startListening = useCallback(() => {
    const ctor = getRecognitionCtor()
    if (!ctor) return
    const recognition = new ctor()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const parts: string[] = []
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const first = event.results[i][0]
        if (first) parts.push(first.transcript)
      }
      const transcript = parts.join(' ').trim()
      if (transcript) {
        setFeedback(`🎤 "…${transcript}"`)
        void runCommand(transcript)
      }
    }
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setFeedback('Microphone permission denied 🙈')
        stopListening()
      }
    }
    recognition.onend = () => {
      if (activeRef.current) {
        try {
          recognition.start()
        } catch {
          stopListening()
        }
      }
    }
    recognitionRef.current = recognition
    activeRef.current = true
    setListening(true)
    try {
      recognition.start()
    } catch {
      stopListening()
    }
  }, [runCommand, stopListening])

  useEffect(() => {
    return () => {
      activeRef.current = false
      recognitionRef.current?.abort()
    }
  }, [])

  const toggle = () => {
    if (listening) {
      stopListening()
    } else {
      setFeedback(null)
      startListening()
    }
  }

  return (
    <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-2">
      {feedback && (
        <div
          className={cn(
            'max-w-56 rounded-2xl border-2 px-3 py-2 text-xs font-bold shadow-soft',
            listening ? 'border-coral-200 bg-white text-slate-700' : 'border-slate-100 bg-white text-slate-600',
          )}
        >
          {feedback}
        </div>
      )}
      <button
        onClick={toggle}
        title={listening ? 'Stop listening' : 'Talk to build your scene'}
        aria-label={listening ? 'Stop voice assistant' : 'Start voice assistant'}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lift transition-all hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          listening ? 'animate-pulse bg-coral-500' : 'bg-brand-600 hover:bg-brand-700',
        )}
      >
        {processing ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : listening ? (
          <MicOff className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </button>
      {!supported && (
        <p className="w-40 rounded-2xl border-2 border-slate-100 bg-white px-3 py-2 text-[10px] font-semibold text-slate-500 shadow-soft">
          Voice needs Chrome or Edge 🎤
        </p>
      )}
    </div>
  )
}
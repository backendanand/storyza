import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Loader2, Mic, MicOff, Send, Sparkles } from 'lucide-react'

import { apiClient } from '../../lib/api'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth'
import type { AssetItem } from './AssetPalette'
import { useStudioStore } from './studioStore'
import { toProjectDocument } from './types'
import { applyVoiceCommand, type VoiceCommand } from './voiceCommands'
import { useSpeechRecognition } from './useSpeechRecognition'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatResponse {
  reply: string
  command: VoiceCommand | null
  provider: string
  messages: { role: 'user' | 'assistant'; content: string }[]
}

const WELCOME =
  "Hi, I'm Story Buddy! 🦊 Tell me what to add to your scene, or ask me for a story idea."

const SUGGESTIONS = ['Add a fox', 'Forest background', 'Play my animation', 'Tell me a story idea']

export function ChatAssistant() {
  const user = useAuthStore((s) => s.user)
  const projectId = useStudioStore((s) => s.projectId)
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: WELCOME }])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadingHistoryRef = useRef(false)

  const { data: assetsData } = useQuery({
    queryKey: ['assets'],
    queryFn: () => apiClient.get<{ items: AssetItem[] }>('/assets?page_size=100'),
    staleTime: 5 * 60_000,
  })
  const assets = useMemo(() => assetsData?.items ?? [], [assetsData])

  // Load the saved conversation for the current project so the child resumes where they left.
  useEffect(() => {
    if (!user || !projectId || loadingHistoryRef.current) return
    loadingHistoryRef.current = true
    apiClient
      .get<{ role: 'user' | 'assistant'; content: string }[]>(`/ai/chat?project_id=${projectId}`)
      .then((saved) => {
        if (saved.length > 0) {
          setMessages(saved.map((m) => ({ role: m.role, content: m.content })))
        }
      })
      .catch(() => {
        // Keep the welcome message if history can't be loaded.
      })
      .finally(() => {
        loadingHistoryRef.current = false
      })
  }, [user, projectId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, sending])

  const hasUserMessages = messages.some((m) => m.role === 'user')

  const ensureProject = async (): Promise<string> => {
    let pid = useStudioStore.getState().projectId
    if (!pid) {
      const s = useStudioStore.getState()
      const document = toProjectDocument({
        title: s.title,
        scene: s.scene,
        tracks: s.tracks,
        audio: s.audio,
        duration: s.duration,
      })
      const created = await apiClient.post<{ id: string }>('/projects', {
        title: s.title,
        document,
      })
      useStudioStore.setState({ projectId: created.id })
      pid = created.id
    }
    return pid
  }

  const send = async (raw: string) => {
    const text = raw.trim()
    if (!text || sending) return
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setSending(true)
    try {
      const pid = await ensureProject()
      const response = await apiClient.post<ChatResponse>('/ai/chat', {
        message: text,
        project_id: pid,
        assets: assets.map((a) => ({ id: a.id, kind: a.kind, name: a.name })),
      })
      const saved: ChatMessage[] = response.messages.map((m) => ({ role: m.role, content: m.content }))
      const notes: ChatMessage[] = []
      if (response.command && response.command.action !== 'none') {
        notes.push({ role: 'system', content: applyVoiceCommand(response.command, assets) })
      }
      setMessages([...saved, ...notes])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Oops, I couldn't reach my brain right now 🙈 Try again in a moment!" },
      ])
    } finally {
      setSending(false)
    }
  }

  const speech = useSpeechRecognition((transcript) => void send(transcript))

  if (!user) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
        <span className="text-4xl" aria-hidden>
          🦊
        </span>
        <p className="text-sm font-semibold text-slate-600">
          Sign in to chat with Story Buddy and keep your chats saved!
        </p>
        <Link
          to="/login"
          className="rounded-full bg-brand-600 px-5 py-2 text-xs font-bold text-white shadow-lift transition-colors hover:bg-brand-700"
        >
          Sign in 💬
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sunny-100 text-base" aria-hidden>
          🦊
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base leading-tight text-slate-900">Story Buddy</h2>
          <p className="text-[10px] font-semibold text-mint-600">● chats are saved to your project</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
        {messages.map((message, index) =>
          message.role === 'system' ? (
            <p
              key={index}
              className="rounded-xl bg-slate-50 px-2.5 py-1.5 text-center text-[10px] font-semibold text-slate-400"
            >
              {message.content}
            </p>
          ) : (
            <div
              key={index}
              className={cn(
                'flex flex-col gap-1.5',
                message.role === 'user' ? 'items-end' : 'items-start',
              )}
            >
              {message.role === 'assistant' && (
                <span className="text-sm" aria-hidden>
                  🦊
                </span>
              )}
              <p
                className={cn(
                  'max-w-[90%] rounded-2xl px-3 py-2 text-xs font-semibold leading-relaxed shadow-soft',
                  message.role === 'user'
                    ? 'rounded-br-sm bg-brand-600 text-white'
                    : 'rounded-bl-sm border-2 border-slate-100 bg-white text-slate-700',
                )}
              >
                {message.content}
              </p>
            </div>
          ),
        )}

        {sending && (
          <div className="flex items-start gap-1.5">
            <span className="text-sm" aria-hidden>
              🦊
            </span>
            <p className="rounded-2xl rounded-bl-sm border-2 border-slate-100 bg-white px-3 py-2 text-xs font-semibold text-slate-400 shadow-soft">
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
              Thinking…
            </p>
          </div>
        )}
      </div>

      {!hasUserMessages && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => void send(suggestion)}
              disabled={sending}
              className="rounded-full border-2 border-slate-100 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void send(input)
        }}
        className="flex shrink-0 items-center gap-1.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={speech.listening ? 'Listening…' : 'Type a message…'}
          aria-label="Chat message"
          className="h-9 min-w-0 flex-1 rounded-full border-2 border-slate-100 bg-slate-50 px-3 text-xs transition-colors focus:border-brand-300 focus:ring-2 focus:ring-brand-100 focus:outline-none"
        />
        <button
          type="button"
          onClick={speech.toggle}
          disabled={!speech.supported}
          title={speech.listening ? 'Stop listening' : 'Talk instead of typing'}
          aria-label={speech.listening ? 'Stop voice assistant' : 'Start voice assistant'}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-lift transition-colors disabled:opacity-40',
            speech.listening ? 'animate-pulse bg-coral-500 text-white' : 'bg-sunny-400 text-white hover:bg-sunny-500',
          )}
        >
          {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <button
          type="submit"
          disabled={sending || input.trim() === ''}
          title="Send message"
          aria-label="Send message"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-lift transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {(speech.listening || speech.error || !speech.supported) && (
        <p className="text-center text-[9px] font-semibold text-slate-400">
          {speech.listening
            ? '🎤 Listening… speak now'
            : speech.error ?? (speech.supported ? '' : 'Voice needs Chrome or Edge 🎤')}
        </p>
      )}

      <p className="flex items-center justify-center gap-1 text-[9px] font-semibold text-slate-400">
        <Sparkles className="h-3 w-3" /> Age-appropriate answers, checked by the app
      </p>
    </div>
  )
}
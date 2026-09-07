import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Play, Save, SlidersHorizontal, Sparkles, Square } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Modal } from '../../components/ui/modal'
import { apiClient } from '../../lib/api'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth'
import { Animator } from './Animator'
import { AssetPalette, type AssetItem } from './AssetPalette'
import { CanvasArea } from './CanvasArea'
import { ChatAssistant } from './ChatAssistant'
import { Timeline } from './Timeline'
import { registerSaveHandler, selectObject, useStudioStore } from './studioStore'
import { fromProjectDocument, toProjectDocument, type ProjectDocument, type StudioObject } from './types'

interface ProjectRead {
  id: string
  title: string
  status: string
  updated_at: string | null
}

interface ProjectDetail extends ProjectRead {
  document: ProjectDocument | null
}

export function StudioPage() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const projectId = useStudioStore((s) => s.projectId)
  const isPlaying = useStudioStore((s) => s.isPlaying)
  const togglePlay = useStudioStore((s) => s.togglePlay)
  const loadDocument = useStudioStore((s) => s.loadDocument)
  const setSaveState = useStudioStore((s) => s.setSaveState)
  const setSaveError = useStudioStore((s) => s.setSaveError)
  const saveState = useStudioStore((s) => s.saveState)
  const saveError = useStudioStore((s) => s.saveError)
  const title = useStudioStore((s) => s.title)
  const setTitle = useStudioStore((s) => s.setTitle)
  const scene = useStudioStore((s) => s.scene)
  const selectedId = useStudioStore((s) => s.selectedId)
  const playheadTime = useStudioStore((s) => s.playheadTime)
  const projectsModalOpen = useStudioStore((s) => s.projectsModalOpen)
  const setProjectsModalOpen = useStudioStore((s) => s.setProjectsModalOpen)

  const [timelineOpen, setTimelineOpen] = useState(true)
  const [paletteOpen, setPaletteOpen] = useState(true)
  const [rightTab, setRightTab] = useState<'tools' | 'chat'>('tools')
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
  const pendingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLoadRef = useRef(0)
  const requestedRef = useRef<string | null>(null)
  const autoResumedRef = useRef(false)

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<{ items: ProjectRead[] }>('/projects'),
    enabled: !!user,
  })

  const { data: assets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => apiClient.get<{ items: AssetItem[] }>('/assets?page_size=100'),
    staleTime: 5 * 60_000,
  })

  const performSave = useCallback(async () => {
    if (savingRef.current) {
      pendingRef.current = true
      return
    }
    const s = useStudioStore.getState()
    if (!useAuthStore.getState().user) return
    const document = toProjectDocument({
      title: s.title,
      scene: s.scene,
      tracks: s.tracks,
      audio: s.audio,
      animations: s.animations,
      duration: s.duration,
    })
    savingRef.current = true
    setSaveState('saving')
    setSaveError(null)
    try {
      if (!s.projectId) {
        const created = await apiClient.post<ProjectRead>('/projects', {
          title: s.title,
          document,
        })
        useStudioStore.setState({ projectId: created.id })
      } else {
        await apiClient.post<ProjectRead>(`/projects/${s.projectId}/save`, document)
      }
      dirtyRef.current = false
      setSaveState('saved')
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    } catch (error) {
      dirtyRef.current = true
      setSaveState('error')
      setSaveError(error instanceof Error ? error.message : 'Save failed')
    } finally {
      savingRef.current = false
      if (pendingRef.current) {
        pendingRef.current = false
        scheduleSave()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void performSave()
    }, 2000)
  }, [performSave])

  // Debounced autosave on content changes
  useEffect(() => {
    const unsubscribe = useStudioStore.subscribe((state, prev) => {
      const contentChanged =
        state.title !== prev.title ||
        state.scene !== prev.scene ||
        state.tracks !== prev.tracks ||
        state.audio !== prev.audio ||
        state.animations !== prev.animations ||
        state.duration !== prev.duration
      if (!contentChanged) return
      if (Date.now() - lastLoadRef.current < 800) return
      if (!useAuthStore.getState().user) return
      dirtyRef.current = true
      scheduleSave()
    })
    return unsubscribe
  }, [scheduleSave])

  // Stop any pending save on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const saveNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    void performSave()
  }, [performSave])

  // Let the navbar Save button trigger a save
  useEffect(() => {
    registerSaveHandler(saveNow)
    return () => registerSaveHandler(null)
  }, [saveNow])

  const reloadProject = async (id: string) => {
    const detail = await apiClient.get<ProjectDetail>(`/projects/${id}`)
    if (!detail.document) return
    const loaded = fromProjectDocument(detail.document)
    const assetList = assets?.items ?? []
    const hydrateMedia = (object: StudioObject): StudioObject => {
      if (object.mediaUrl) return object
      const asset = object.assetId ? assetList.find((a) => a.id === object.assetId) : undefined
      return asset ? { ...object, mediaUrl: asset.media_url } : object
    }
    const scene = { ...loaded.scene, objects: loaded.scene.objects.map(hydrateMedia) }
    const bgAsset = detail.document.scenes?.[0]?.background_id
    const bg = bgAsset ? (assetList.find((a) => a.id === bgAsset) ?? null) : null
    lastLoadRef.current = Date.now()
    loadDocument({
      title: loaded.title,
      scene,
      tracks: loaded.tracks,
      audio: loaded.audio,
      animations: loaded.animations,
      background: bg ? { assetId: bg.id, mediaUrl: bg.media_url } : null,
      duration: loaded.duration,
      projectId: detail.id,
    })
  }

  const loadProject = async (project: ProjectRead) => {
    await reloadProject(project.id)
  }

  // Open a project requested via ?project=<id> (from the Home gallery)
  useEffect(() => {
    const requested = searchParams.get('project')
    if (!requested || requestedRef.current === requested) return
    if (!projects || !assets) return
    requestedRef.current = requested
    const found = projects.items.find((p) => p.id === requested)
    if (found) void reloadProject(found.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, projects, assets])

  // Auto-resume: reopen the most recently edited project so a child starts right
  // where they left off (unless a specific project was requested or reset).
  useEffect(() => {
    if (!user || !projects || !assets) return
    if (searchParams.get('project')) return
    if (autoResumedRef.current) return
    autoResumedRef.current = true
    const existing = useStudioStore.getState().projectId
    if (existing) return
    const latest = projects.items[0]
    if (latest) void reloadProject(latest.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, projects, assets, searchParams])

  const selected = selectObject(scene, selectedId)

  return (
    <div className="flex h-full max-h-full min-h-0 flex-1 flex-col overflow-hidden">
      {!user && (
        <p className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-sunny-100 px-4 py-2 text-xs font-semibold text-sunny-800">
          <span aria-hidden>👀</span> You're in preview mode.{' '}
          <Link to="/login" className="underline underline-offset-2">
            Sign in
          </Link>{' '}
          to save and share your projects.
        </p>
      )}

      {/* Three-column editor grid: left library | center canvas+timeline | right panel */}
      <div className="flex min-h-0 flex-1 gap-2 overflow-hidden">
        {paletteOpen && <AssetPalette />}

        <div className="flex h-full min-w-0 flex-1 flex-col justify-between gap-2 overflow-hidden">
          <CanvasArea />
          {timelineOpen && <Timeline />}
        </div>

        {/* Right sidebar: seamless Tools | Chat switcher + primary actions */}
        <aside className="flex w-75 shrink-0 flex-col rounded-3xl border border-border-subtle bg-white p-2.5 shadow-soft">
          {/* Tab switcher */}
          <div className="relative grid shrink-0 grid-cols-2 rounded-2xl bg-surface p-1">
            <span
              aria-hidden
              className={cn(
                'absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-xl bg-white shadow-soft transition-transform duration-200',
                rightTab === 'tools' ? 'translate-x-1' : 'translate-x-full',
              )}
            />
            <button
              onClick={() => setRightTab('tools')}
              aria-pressed={rightTab === 'tools'}
              className={cn(
                'relative z-10 flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-colors',
                rightTab === 'tools' ? 'text-brand-700' : 'text-ink-muted',
              )}
            >
              <SlidersHorizontal className="h-4 w-4" /> Tools
            </button>
            <button
              onClick={() => setRightTab('chat')}
              aria-pressed={rightTab === 'chat'}
              className={cn(
                'relative z-10 flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-colors',
                rightTab === 'chat' ? 'text-brand-700' : 'text-ink-muted',
              )}
            >
              <Sparkles className="h-4 w-4" /> Chat
            </button>
          </div>

          {/* Panel body */}
          <div className="scroll-thin mt-2 flex min-h-0 flex-1 flex-col">
            {rightTab === 'chat' ? (
              <ChatAssistant />
            ) : (
              <div className="flex h-full flex-col gap-3">
                {/* Playback button - always visible */}
                <Button
                  variant={isPlaying ? 'secondary' : 'default'}
                  onClick={togglePlay}
                  className="h-11 w-full"
                >
                  {isPlaying ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                  {isPlaying ? 'Stop' : 'Play'}
                </Button>

                {/* Quick toggles */}
                <div className="flex gap-1.5">
                  <Button
                    variant={paletteOpen ? 'secondary' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setPaletteOpen((open) => !open)}
                    title="Show or hide the stickers"
                  >
                    🧸 Stickers
                  </Button>
                  <Button
                    variant={timelineOpen ? 'secondary' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setTimelineOpen((open) => !open)}
                    title="Toggle timeline view"
                  >
                    ⏱️ Timeline
                  </Button>
                </div>

                {/* Project naming */}
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Project name</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Name your project"
                    className="h-10 w-full rounded-2xl border border-border-subtle bg-surface px-3 text-sm text-ink transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                  />
                </label>

                {/* Selected object info */}
                {selected ? (
                  <div className="rounded-2xl bg-brand-50 px-3 py-2 text-[11px] font-semibold text-ink-muted">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-brand-600">Selected</p>
                    <p className="truncate font-display text-sm font-semibold text-ink">{selected.name}</p>
                    <p className="mt-1">
                      x {selected.x.toFixed(0)} · y {selected.y.toFixed(0)} · {selected.rotation}° · size{' '}
                      {selected.scale.toFixed(2)} · {playheadTime.toFixed(1)}s
                    </p>
                  </div>
                ) : (
                  <p className="rounded-2xl bg-surface px-3 py-2 text-xs font-semibold text-ink-faint">
                    Select an object to edit it. ✨
                  </p>
                )}

                <Animator />
              </div>
            )}
          </div>

          {/* Primary actions pinned to the bottom */}
          <div className="mt-2 flex shrink-0 flex-col gap-1.5 border-t border-border-subtle pt-2">
            <Button onClick={saveNow} disabled={saveState === 'saving'} className="w-full">
              {saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saveState === 'saving' ? 'Saving…' : 'Save'}
            </Button>
            {saveState === 'saved' && (
              <p className="text-center text-[11px] font-bold text-mint-600">Saved ✓</p>
            )}
            {saveState === 'error' && saveError && (
              <p className="text-center text-[11px] font-semibold text-coral-700">{saveError}</p>
            )}
          </div>
        </aside>
      </div>

      {/* My projects modal */}
      <Modal open={projectsModalOpen} onClose={() => setProjectsModalOpen(false)} title="My projects 🗂️">
        {projects && projects.items.length > 0 ? (
          <div className="flex flex-col gap-2">
            {projects.items.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  void loadProject(project)
                  setProjectsModalOpen(false)
                }}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft',
                  project.id === projectId ? 'border-brand-300 bg-brand-50' : 'border-slate-100 bg-white',
                )}
              >
                <span className="truncate font-display text-sm text-slate-800">
                  {project.title || 'Untitled animation'}
                </span>
                <Badge variant={project.status === 'published' ? 'success' : 'neutral'}>
                  {project.status === 'published' ? 'Shared 🎉' : 'Draft ✏️'}
                </Badge>
              </button>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm font-semibold text-slate-400">
            No projects yet — hit Save to make your first one! ✨
          </p>
        )}
      </Modal>
    </div>
  )
}
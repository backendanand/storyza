import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  History,
  Play,
  RefreshCcw,
  RotateCw,
  Square,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Modal } from '../../components/ui/modal'
import { apiClient } from '../../lib/api'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth'
import { AssetPalette, type AssetItem } from './AssetPalette'
import { StudioCanvas } from './StudioCanvas'
import { Timeline } from './Timeline'
import { registerSaveHandler, useStudioStore } from './studioStore'
import { fromProjectDocument, toProjectDocument, type ProjectDocument } from './types'

interface ProjectRead {
  id: string
  title: string
  status: string
  updated_at: string | null
}

interface ProjectDetail extends ProjectRead {
  document: ProjectDocument | null
}

interface ProjectVersion {
  id: string
  version: number
  renderer_version: string
  created_at: string | null
}

export function StudioPage() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const projectId = useStudioStore((s) => s.projectId)
  const isPlaying = useStudioStore((s) => s.isPlaying)
  const togglePlay = useStudioStore((s) => s.togglePlay)
  const rotateSelected = useStudioStore((s) => s.rotateSelected)
  const scaleSelected = useStudioStore((s) => s.scaleSelected)
  const removeSelected = useStudioStore((s) => s.removeSelected)
  const reset = useStudioStore((s) => s.reset)
  const loadDocument = useStudioStore((s) => s.loadDocument)
  const setSaveState = useStudioStore((s) => s.setSaveState)
  const setSaveError = useStudioStore((s) => s.setSaveError)

  const [showProjects, setShowProjects] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [timelineOpen, setTimelineOpen] = useState(true)
  const [paletteOpen, setPaletteOpen] = useState(true)
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
  const pendingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLoadRef = useRef(0)
  const requestedRef = useRef<string | null>(null)

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

  const { data: versions, refetch: refetchVersions } = useQuery({
    queryKey: ['projects', projectId, 'versions'],
    queryFn: () => apiClient.get<ProjectVersion[]>(`/projects/${projectId}/versions`),
    enabled: !!user && !!projectId,
  })

  const performSave = useCallback(async () => {
    if (savingRef.current) {
      pendingRef.current = true
      return
    }
    const s = useStudioStore.getState()
    if (!useAuthStore.getState().user) return
    const document = toProjectDocument({ title: s.title, scene: s.scene, tracks: s.tracks, audio: s.audio })
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
      void queryClient.invalidateQueries({ queryKey: ['projects', s.projectId, 'versions'] })
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
        state.audio !== prev.audio
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

  const restoreMutation = useMutation({
    mutationFn: async (version: number) => {
      if (!projectId) return
      await apiClient.post<ProjectRead>(`/projects/${projectId}/restore`, { version })
    },
    onSuccess: () => {
      if (projectId) void reloadProject(projectId)
      void refetchVersions()
    },
  })

  const reloadProject = async (id: string) => {
    const detail = await apiClient.get<ProjectDetail>(`/projects/${id}`)
    if (!detail.document) return
    const loaded = fromProjectDocument(detail.document)
    const bgAsset = detail.document.scenes?.[0]?.background_id
    const bg = bgAsset ? (assets?.items.find((a) => a.id === bgAsset) ?? null) : null
    lastLoadRef.current = Date.now()
    loadDocument({
      title: loaded.title,
      scene: loaded.scene,
      tracks: loaded.tracks,
      audio: loaded.audio,
      background: bg ? { assetId: bg.id, mediaUrl: bg.media_url } : null,
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

  const hasVersions = !!projectId && !!versions && versions.length > 1

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {!user && (
        <p className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-sunny-100 px-4 py-2 text-xs font-semibold text-sunny-800">
          <span aria-hidden>👀</span> You're in preview mode.{' '}
          <Link to="/login" className="underline underline-offset-2">
            Sign in
          </Link>{' '}
          to save and share your projects.
        </p>
      )}

      {/* editor: stickers left, canvas + timeline center, toolbar docked right */}
      <div className="flex min-h-0 flex-1 gap-3">
        {paletteOpen && <AssetPalette />}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="min-h-0 flex-1">
            <StudioCanvas />
          </div>
          {timelineOpen && (
            <div className="flex justify-center">
              <Timeline onClose={() => setTimelineOpen(false)} />
            </div>
          )}
        </div>

        {/* toolbar dock */}
        <div className="flex w-44 shrink-0 min-h-0 flex-col gap-1.5 overflow-y-auto rounded-3xl border-2 border-white bg-white p-2.5 shadow-soft">
          <Button
            variant={isPlaying ? 'secondary' : 'sunny'}
            onClick={togglePlay}
            className="h-12 w-full"
          >
            {isPlaying ? <Square className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
            {isPlaying ? 'Stop' : 'Play'}
          </Button>

          <div className="my-0.5 h-px shrink-0 bg-slate-100" />

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => rotateSelected(15)}
              title="Turn selected object"
              className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-slate-100 text-[11px] font-bold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <RotateCw className="h-4 w-4 text-brand-600" /> Turn
            </button>
            <button
              onClick={() => scaleSelected(1.15)}
              title="Make selected object bigger"
              className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-slate-100 text-[11px] font-bold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <ZoomIn className="h-4 w-4 text-brand-600" /> Bigger
            </button>
            <button
              onClick={() => scaleSelected(0.87)}
              title="Make selected object smaller"
              className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-slate-100 text-[11px] font-bold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <ZoomOut className="h-4 w-4 text-brand-600" /> Smaller
            </button>
            <button
              onClick={removeSelected}
              title="Delete selected object"
              className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-slate-100 text-[11px] font-bold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <Trash2 className="h-4 w-4 text-brand-600" /> Delete
            </button>
            <button
              onClick={reset}
              title="Start over on this scene"
              className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-slate-100 text-[11px] font-bold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <RefreshCcw className="h-4 w-4 text-brand-600" /> Reset
            </button>
          </div>

          <div className="my-0.5 h-px shrink-0 bg-slate-100" />

          <Button
            variant={timelineOpen ? 'sunny' : 'outline'}
            size="sm"
            className="h-9 w-full"
            onClick={() => setTimelineOpen((open) => !open)}
            title="Show or hide the movie strip"
          >
            🎞️ Movie strip
          </Button>
          <Button
            variant={paletteOpen ? 'sunny' : 'outline'}
            size="sm"
            className="h-9 w-full"
            onClick={() => setPaletteOpen((open) => !open)}
            title="Show or hide the stickers"
          >
            🧸 Stickers
          </Button>

          <div className="my-0.5 h-px shrink-0 bg-slate-100" />

          {user && (
            <Button variant="outline" size="sm" className="h-9 w-full" onClick={() => setShowProjects(true)}>
              🗂️ My projects
            </Button>
          )}
          {user && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full"
              onClick={() => setShowVersions(true)}
              disabled={!hasVersions}
            >
              <History className="h-4 w-4" /> Versions
            </Button>
          )}
        </div>
      </div>

      {/* My projects modal */}
      <Modal open={showProjects} onClose={() => setShowProjects(false)} title="My projects 🗂️">
        {projects && projects.items.length > 0 ? (
          <div className="flex flex-col gap-2">
            {projects.items.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  void loadProject(project)
                  setShowProjects(false)
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

      {/* Version history modal */}
      <Modal open={showVersions} onClose={() => setShowVersions(false)} title="Version history 🕘">
        {versions && versions.length > 0 && (
          <div className="flex flex-col gap-2">
            {versions.map((version) => (
              <div
                key={version.id}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3',
                  version.version === versions[0].version ? 'border-mint-200 bg-mint-50' : 'border-slate-100 bg-white',
                )}
              >
                <span className="font-display text-sm text-slate-800">
                  Version {version.version}
                  {version.version === versions[0].version && (
                    <Badge variant="success" className="ml-2">
                      Current ✓
                    </Badge>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{version.created_at ?? ''}</span>
                  {version.version !== versions[0].version && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        restoreMutation.mutate(version.version)
                        setShowVersions(false)
                      }}
                      disabled={restoreMutation.isPending}
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
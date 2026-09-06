import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  Play,
  RefreshCcw,
  RotateCw,
  Save,
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
import { VoiceAssistant } from './VoiceAssistant'
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
  const saveState = useStudioStore((s) => s.saveState)
  const saveError = useStudioStore((s) => s.saveError)
  const title = useStudioStore((s) => s.title)
  const setTitle = useStudioStore((s) => s.setTitle)
  const scene = useStudioStore((s) => s.scene)
  const selectedId = useStudioStore((s) => s.selectedId)
  const playheadTime = useStudioStore((s) => s.playheadTime)
  const setHasVersions = useStudioStore((s) => s.setHasVersions)
  const projectsModalOpen = useStudioStore((s) => s.projectsModalOpen)
  const setProjectsModalOpen = useStudioStore((s) => s.setProjectsModalOpen)
  const versionsModalOpen = useStudioStore((s) => s.versionsModalOpen)
  const setVersionsModalOpen = useStudioStore((s) => s.setVersionsModalOpen)

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
    const document = toProjectDocument({ title: s.title, scene: s.scene, tracks: s.tracks, audio: s.audio, duration: s.duration })
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
        state.audio !== prev.audio ||
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

  useEffect(() => {
    setHasVersions(!!projectId && !!versions && versions.length > 1)
  }, [projectId, versions, setHasVersions])

  const selected = selectObject(scene, selectedId)

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
          <div className="relative min-h-0 flex-1">
            <StudioCanvas />
            <VoiceAssistant />
          </div>
          {timelineOpen && (
            <Timeline onClose={() => setTimelineOpen(false)} />
          )}
        </div>

        {/* toolbar dock */}
        <div className="flex w-56 shrink-0 min-h-0 flex-col gap-1.5 overflow-y-auto rounded-3xl border-2 border-white bg-white p-2.5 shadow-soft">
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

          {selected && (
            <div className="rounded-2xl bg-brand-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
              <p className="text-[10px] font-bold uppercase tracking-wide text-brand-600">Selected</p>
              <p className="truncate font-display text-sm font-semibold text-slate-800">{selected.name}</p>
              <p className="mt-1">
                x {selected.x.toFixed(0)} · y {selected.y.toFixed(0)} · {selected.rotation}° · size{' '}
                {selected.scale.toFixed(2)} · {playheadTime.toFixed(1)}s
              </p>
            </div>
          )}

          <div className="my-0.5 h-px shrink-0 bg-slate-100" />

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Name your project ✏️"
            className="h-10 w-full rounded-2xl border-2 border-slate-100 bg-white px-3 font-display text-sm text-slate-900 transition-colors focus:border-brand-300 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
          <Button size="sm" onClick={saveNow} disabled={saveState === 'saving'} className="w-full">
            {saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
          {saveState === 'saved' && (
            <p className="text-center text-[11px] font-bold text-mint-600">Saved ✓</p>
          )}
          {saveState === 'error' && saveError && (
            <p className="text-center text-[11px] font-semibold text-coral-700">{saveError}</p>
          )}

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
        </div>
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

      {/* Version history modal */}
      <Modal open={versionsModalOpen} onClose={() => setVersionsModalOpen(false)} title="Version history 🕘">
        {versions && versions.length > 0 ? (
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
                        setVersionsModalOpen(false)
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
        ) : (
          <p className="py-6 text-center text-sm font-semibold text-slate-400">
            No versions yet — save your project to create a history. ✨
          </p>
        )}
      </Modal>
    </div>
  )
}
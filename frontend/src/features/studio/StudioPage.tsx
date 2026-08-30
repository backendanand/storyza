import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FlipHorizontal2,
  History,
  Loader2,
  Play,
  Save,
  Square,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { apiClient } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { AssetPalette, type AssetItem } from './AssetPalette'
import { StudioCanvas } from './StudioCanvas'
import { Timeline } from './Timeline'
import { useStudioStore } from './studioStore'
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

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function StudioPage() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const title = useStudioStore((s) => s.title)
  const setTitle = useStudioStore((s) => s.setTitle)
  const projectId = useStudioStore((s) => s.projectId)
  const isPlaying = useStudioStore((s) => s.isPlaying)
  const togglePlay = useStudioStore((s) => s.togglePlay)
  const rotateSelected = useStudioStore((s) => s.rotateSelected)
  const scaleSelected = useStudioStore((s) => s.scaleSelected)
  const removeSelected = useStudioStore((s) => s.removeSelected)
  const reset = useStudioStore((s) => s.reset)
  const loadDocument = useStudioStore((s) => s.loadDocument)

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
  const pendingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLoadRef = useRef(0)

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

  const saveNow = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    void performSave()
  }

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

  const statusLabel =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'saved'
        ? 'Saved'
        : saveState === 'error'
          ? 'Save failed'
          : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-11 flex-1 min-w-52 rounded-lg border border-slate-200 bg-white px-3 text-lg font-semibold text-slate-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          placeholder="Name your project"
        />
        <Button variant="outline" onClick={() => rotateSelected(15)} title="Rotate 15°">
          <FlipHorizontal2 className="h-4 w-4" /> Rotate
        </Button>
        <Button variant="outline" onClick={() => scaleSelected(1.15)} title="Bigger">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => scaleSelected(0.87)} title="Smaller">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={removeSelected} title="Delete selected">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button variant={isPlaying ? 'secondary' : 'default'} onClick={togglePlay}>
          {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isPlaying ? 'Stop' : 'Play'}
        </Button>
        <Button variant="outline" onClick={reset}>
          Reset
        </Button>
        <Button onClick={saveNow} disabled={saveState === 'saving'}>
          {saveState === 'saving' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save
        </Button>
      </div>

      {!user && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You're in preview mode. <Link to="/login" className="font-semibold underline">Sign in</Link> to
          save and submit your projects.
        </p>
      )}
      <div className="flex items-center gap-3 text-sm text-slate-500">
        {statusLabel && <span className={saveState === 'error' ? 'text-red-600' : undefined}>{statusLabel}</span>}
        {saveState === 'error' && saveError && <span className="text-red-600">{saveError}</span>}
      </div>

      <div className="flex gap-4">
        <AssetPalette />
        <div className="min-w-0 flex-1">
          <StudioCanvas />
        </div>
      </div>

      <Timeline />

      {user && projectId && versions && versions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-brand-600" /> Version history
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {versions.map((version) => (
              <div key={version.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50">
                <span className="text-sm font-medium text-slate-700">
                  Version {version.version}
                  {version.version === versions[0].version && (
                    <span className="ml-2 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                      CURRENT
                    </span>
                  )}
                </span>
                <span className="text-xs text-slate-400">{version.created_at ?? ''}</span>
                {version.version !== versions[0].version && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreMutation.mutate(version.version)}
                    disabled={restoreMutation.isPending}
                  >
                    Restore
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {user && projects && projects.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>My projects</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {projects.items.map((project) => (
              <button
                key={project.id}
                onClick={() => void loadProject(project)}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-100"
              >
                <span className="font-medium text-slate-800">{project.title}</span>
                <span className="text-xs text-slate-400">
                  {project.status} · {project.updated_at ?? ''}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
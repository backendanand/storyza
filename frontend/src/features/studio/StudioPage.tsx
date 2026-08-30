import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Clapperboard,
  FlipHorizontal2,
  Loader2,
  Play,
  Save,
  Square,
  Trash2,
  UserRound,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { apiClient } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { StudioCanvas } from './StudioCanvas'
import { useStudioStore } from './studioStore'
import type { ProjectDocument } from './types'

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

  const title = useStudioStore((s) => s.title)
  const setTitle = useStudioStore((s) => s.setTitle)
  const projectId = useStudioStore((s) => s.projectId)
  const setProjectId = useStudioStore((s) => s.setProjectId)
  const scene = useStudioStore((s) => s.scene)
  const addObject = useStudioStore((s) => s.addObject)
  const rotateSelected = useStudioStore((s) => s.rotateSelected)
  const scaleSelected = useStudioStore((s) => s.scaleSelected)
  const removeSelected = useStudioStore((s) => s.removeSelected)
  const isPlaying = useStudioStore((s) => s.isPlaying)
  const togglePlay = useStudioStore((s) => s.togglePlay)
  const reset = useStudioStore((s) => s.reset)
  const setScene = useStudioStore((s) => s.setScene)
  const setTitleStore = useStudioStore((s) => s.setTitle)

  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<{ items: ProjectRead[] }>('/projects'),
    enabled: !!user,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const document: ProjectDocument = {
        schema_version: 1,
        renderer_version: 'v1',
        title,
        meta: {},
        scenes: [scene],
        animation_tracks: [],
        audio: [],
        export_settings: {},
      }
      if (projectId) {
        await apiClient.post<ProjectRead>(`/projects/${projectId}/save`, document)
        return { id: projectId, title }
      }
      const created = await apiClient.post<ProjectRead>('/projects', {
        title,
        document,
      })
      setProjectId(created.id)
      await apiClient.post<ProjectRead>(`/projects/${created.id}/save`, document)
      return created
    },
    onSuccess: () => {
      setSaveMessage('Saved!')
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => {
      setSaveMessage(error instanceof Error ? error.message : 'Save failed')
    },
  })

  const loadProject = async (project: ProjectRead) => {
    const detail = await apiClient.get<ProjectDetail>(`/projects/${project.id}`)
    if (!detail.document?.scenes?.[0]) return
    setTitleStore(detail.title)
    setScene(detail.document.scenes[0], detail.id)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-11 flex-1 min-w-52 rounded-lg border border-slate-200 bg-white px-3 text-lg font-semibold text-slate-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          placeholder="Name your project"
        />
        <Button onClick={() => addObject('character')}>
          <UserRound className="h-4 w-4" /> Character
        </Button>
        <Button variant="secondary" onClick={() => addObject('prop')}>
          <Clapperboard className="h-4 w-4" /> Prop
        </Button>
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
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
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
      {saveMessage && <p className="text-sm text-slate-600">{saveMessage}</p>}

      <StudioCanvas />

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
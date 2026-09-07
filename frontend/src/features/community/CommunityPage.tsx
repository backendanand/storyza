import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { apiClient } from '../../lib/api'
import { cn } from '../../lib/utils'
import type { ProjectDocument } from '../studio/types'
import {
  STORY_CATEGORIES,
  STORY_THEMES,
  categoryEmoji,
  categoryLabel,
  pickPalette,
  themeEmoji,
  themeLabel,
} from './constants'
import { StoryPreview } from './StoryPreview'

interface CommunityStory {
  id: string
  title: string
  description: string | null
  category: string | null
  theme: string | null
  status: string
  scene_count: number
  author_name: string | null
  author_role: string | null
  created_at: string | null
  updated_at: string | null
}

interface StoryDetail {
  id: string
  title: string
  description: string | null
  category: string | null
  theme: string | null
  author_name?: string | null
  document: ProjectDocument | null
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function CommunityPage() {
  const [category, setCategory] = useState<string | null>(null)
  const [theme, setTheme] = useState<string>('')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [previewId, setPreviewId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['community', 'stories', { category, theme, sort }],
    queryFn: () =>
      apiClient.get<{ items: CommunityStory[]; total: number }>(
        `/community/stories?sort=${sort}${category ? `&category=${category}` : ''}${theme ? `&theme=${theme}` : ''}&page_size=100`,
      ),
  })

  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: ['community', 'story', previewId],
    queryFn: () => apiClient.get<StoryDetail>(`/community/stories/${previewId}`),
    enabled: !!previewId,
  })

  const stories = data?.items ?? []

  const groups = useMemo(() => {
    const map = new Map<string, CommunityStory[]>()
    for (const story of stories) {
      const key = categoryLabel(story.category)
      const list = map.get(key) ?? []
      list.push(story)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [stories])

  const hasFilters = category !== null || theme !== '' || sort !== 'newest'

  const resetFilters = () => {
    setCategory(null)
    setTheme('')
    setSort('newest')
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-grape-600 via-brand-700 to-brand-800 p-8 text-white shadow-soft md:p-10">
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-sunny-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-mint-400/20 blur-2xl" />
        <div className="relative">
          <h1 className="font-display text-4xl leading-tight md:text-5xl">Storyza Community 🌍</h1>
          <p className="mt-3 max-w-2xl text-lg text-brand-100">
            Amazing stories made by kids everywhere. Explore, get inspired and see what your
            friends have created — pick any story to preview it in full.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="flex flex-col gap-3 rounded-3xl border border-border-subtle bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">
            Category
          </span>
          <button
            onClick={() => setCategory(null)}
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-colors',
              category === null
                ? 'bg-brand-600 text-white shadow-lift'
                : 'bg-surface text-ink-muted hover:bg-surface-strong',
            )}
          >
            ✨ All
          </button>
          {STORY_CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(category === c.value ? null : c.value)}
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-colors',
                category === c.value
                  ? 'bg-brand-600 text-white shadow-lift'
                  : 'bg-surface text-ink-muted hover:bg-surface-strong',
              )}
            >
              <span aria-hidden>{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">Theme</span>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="h-9 rounded-full border-2 border-slate-100 bg-surface px-3 text-xs font-bold text-ink-muted focus:border-brand-300 focus:outline-none"
          >
            <option value="">🎨 All themes</option>
            {STORY_THEMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>

          <span className="ml-2 text-xs font-bold uppercase tracking-wide text-ink-faint">
            Sort
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}
            className="h-9 rounded-full border-2 border-slate-100 bg-surface px-3 text-xs font-bold text-ink-muted focus:border-brand-300 focus:outline-none"
          >
            <option value="newest">🕘 Newest first</option>
            <option value="oldest">📜 Oldest first</option>
          </select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto">
              Clear filters
            </Button>
          )}
        </div>
      </section>

      {/* Stories */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center" accent="grape">
          <span className="text-5xl" aria-hidden>
            🕵️
          </span>
          <h3 className="font-display text-xl text-slate-900">No published stories yet</h3>
          <p className="max-w-sm text-sm text-slate-500">
            Nothing matches these filters right now. Publish a story from the studio and it'll
            show up here for everyone!
          </p>
          <Button variant="ghost" onClick={resetFilters} className="text-brand-700">
            Clear filters
          </Button>
        </Card>
      ) : (
        groups.map(([groupName, groupStories]) => (
          <section key={groupName}>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl" aria-hidden>
                {categoryEmoji(groupStories[0]?.category)}
              </span>
              <h2 className="font-display text-2xl text-slate-900">{groupName}</h2>
              <Badge variant="neutral" className="ml-1">
                {groupStories.length}
              </Badge>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {groupStories.map((story) => (
                <button
                  key={story.id}
                  onClick={() => setPreviewId(story.id)}
                  className="group text-left"
                >
                  <Card className="h-full overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
                    <div
                      className={cn(
                        'relative flex h-36 items-center justify-center bg-gradient-to-br',
                        pickPalette(story.id),
                      )}
                    >
                      <span className="text-5xl drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)] transition-transform group-hover:scale-110">
                        {categoryEmoji(story.category)}
                      </span>
                      {story.scene_count > 0 && (
                        <span className="absolute top-2 right-2 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                          🖼️ {story.scene_count} scene{story.scene_count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <CardContent className="flex flex-col gap-1.5 p-4">
                      <h3 className="truncate font-display text-base text-slate-900">
                        {story.title || 'Untitled story'}
                      </h3>
                      {story.description && (
                        <p className="line-clamp-2 text-xs text-slate-500">{story.description}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="info">{themeEmoji(story.theme)} {themeLabel(story.theme)}</Badge>
                        <span className="ml-auto flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <span
                            aria-hidden
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-sunny-200 text-[10px] text-sunny-900"
                          >
                            {initials(story.author_name)}
                          </span>
                          <span className="truncate">{story.author_name ?? 'Anonymous'}</span>
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      {/* Preview modal */}
      {previewId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setPreviewId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl border-2 border-white bg-white p-5 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-xl text-slate-900">
                  {preview?.title ?? 'Loading story…'}
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  by {preview?.author_name ?? '…'} · {preview?.category ? categoryLabel(preview.category) : ''}
                  {' '}{preview?.theme ? themeLabel(preview.theme) : ''}
                </p>
              </div>
              <button
                onClick={() => setPreviewId(null)}
                aria-label="Close preview"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {previewLoading && (
                <div className="flex h-64 items-center justify-center text-sm font-bold text-slate-400">
                  Loading preview…
                </div>
              )}
              {preview?.document && <StoryPreview document={preview.document} />}
              {preview?.description && (
                <p className="mt-3 rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-slate-600">
                  {preview.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'

import { apiClient } from '../../lib/api'
import { cn } from '../../lib/utils'
import { useStudioStore } from './studioStore'
import type { SceneObjectKind } from './types'

export interface AssetItem {
  id: string
  slug: string | null
  kind: 'character' | 'prop' | 'background'
  name: string
  description: string | null
  tags: string[] | null
  media_url: string
  thumbnail_url: string | null
}

const TABS: { key: SceneObjectKind; label: string; emoji: string }[] = [
  { key: 'character', label: 'Characters', emoji: '🧑‍🎤' },
  { key: 'prop', label: 'Props', emoji: '⭐' },
  { key: 'background', label: 'Backdrops', emoji: '🖼️' },
]

/**
 * Left asset library. Fixed 280px column with category tabs, a rounded search
 * input, and a responsive grid of sticker cards. Clicking adds the asset to the
 * stage (or sets the background for backdrops).
 */
export function AssetPalette() {
  const [tab, setTab] = useState<SceneObjectKind>('character')
  const [query, setQuery] = useState('')
  const addObject = useStudioStore((s) => s.addObject)
  const setBackground = useStudioStore((s) => s.setBackground)

  const { data, isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => apiClient.get<{ items: AssetItem[] }>('/assets?page_size=100'),
    staleTime: 5 * 60_000,
  })

  const assets = (data?.items ?? []).filter(
    (a) => a.kind === tab && (query.trim() === '' || a.name.toLowerCase().includes(query.trim().toLowerCase())),
  )

  return (
    <aside className="flex h-full w-70 shrink-0 flex-col gap-3 rounded-3xl border border-border-subtle bg-white p-3 shadow-soft">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <h2 className="font-display text-lg text-ink">Stickers</h2>
        <span className="ml-auto text-lg" aria-hidden>
          🧸
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stickers"
          aria-label="Search stickers"
          className="h-10 w-full rounded-full border border-border-subtle bg-surface pr-3 pl-9 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
        />
      </div>

      {/* Category tabs */}
      <div className="grid grid-cols-3 gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[11px] font-bold transition-all',
              tab === t.key
                ? 'bg-brand-600 text-white shadow-lift'
                : 'text-ink-muted hover:bg-brand-50 hover:text-brand-700',
            )}
          >
            <span className="text-base" aria-hidden>
              {t.emoji}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Asset grid */}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto pr-0.5">
        {isLoading && (
          <p className="p-4 text-center text-xs font-semibold text-ink-faint">Loading stickers…</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {assets.map((asset) => (
            <button
              key={asset.id}
              title={asset.description ?? asset.name}
              onClick={() => {
                if (asset.kind === 'background') {
                  setBackground({ assetId: asset.id, mediaUrl: asset.media_url })
                } else {
                  addObject(asset.kind, {
                    assetId: asset.id,
                    mediaUrl: asset.media_url,
                    name: asset.name,
                  })
                }
              }}
              className="group flex flex-col items-center gap-1.5 rounded-2xl border border-border-subtle bg-surface p-2.5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:shadow-soft"
            >
              <img
                src={asset.media_url}
                alt={asset.name}
                className={cn(
                  'transition-transform group-hover:scale-105',
                  asset.kind === 'background'
                    ? 'aspect-video w-full rounded-xl object-cover'
                    : 'h-14 w-14 object-contain',
                )}
              />
              <span className="w-full truncate text-center text-[11px] font-bold text-ink-muted">
                {asset.name}
              </span>
            </button>
          ))}
          {!isLoading && assets.length === 0 && (
            <p className="col-span-2 p-4 text-center text-xs font-semibold text-ink-faint">
              No stickers here yet!
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}

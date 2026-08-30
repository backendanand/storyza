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

const TABS: { key: SceneObjectKind; label: string }[] = [
  { key: 'character', label: 'Characters' },
  { key: 'prop', label: 'Props' },
  { key: 'background', label: 'Backgrounds' },
]

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
    <div className="flex w-56 shrink-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors',
              tab === t.key ? 'bg-brand-100 text-brand-800' : 'text-slate-500 hover:bg-slate-100',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && <p className="p-3 text-xs text-slate-400">Loading…</p>}
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
              className="flex flex-col items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 p-2 transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <img
                src={asset.media_url}
                alt={asset.name}
                className={asset.kind === 'background' ? 'aspect-video w-full rounded object-cover' : 'h-12 w-12 object-contain'}
              />
              <span className="w-full truncate text-center text-[11px] font-medium text-slate-600">
                {asset.name}
              </span>
            </button>
          ))}
          {!isLoading && assets.length === 0 && (
            <p className="col-span-2 p-3 text-center text-xs text-slate-400">No {tab}s found</p>
          )}
        </div>
      </div>
    </div>
  )
}
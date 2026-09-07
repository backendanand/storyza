export interface StoryCategory {
  value: string
  label: string
  emoji: string
}

export interface StoryTheme {
  value: string
  label: string
  emoji: string
}

export const STORY_CATEGORIES: StoryCategory[] = [
  { value: 'adventure', label: 'Adventure', emoji: '🗺️' },
  { value: 'animals', label: 'Animals', emoji: '🦊' },
  { value: 'nature', label: 'Nature', emoji: '🌿' },
  { value: 'space', label: 'Space', emoji: '🚀' },
  { value: 'fantasy', label: 'Fantasy', emoji: '🧚' },
  { value: 'friendship', label: 'Friendship', emoji: '💛' },
  { value: 'school', label: 'School', emoji: '🏫' },
  { value: 'family', label: 'Family', emoji: '👨‍👩‍👧' },
]

export const STORY_THEMES: StoryTheme[] = [
  { value: 'jungle', label: 'Jungle', emoji: '🌴' },
  { value: 'ocean', label: 'Ocean', emoji: '🌊' },
  { value: 'farm', label: 'Farm', emoji: '🚜' },
  { value: 'city', label: 'City', emoji: '🏙️' },
  { value: 'space', label: 'Outer space', emoji: '✨' },
  { value: 'magic', label: 'Magic', emoji: '🪄' },
  { value: 'sports', label: 'Sports', emoji: '⚽' },
  { value: 'party', label: 'Party', emoji: '🎉' },
  { value: 'forest', label: 'Forest', emoji: '🌲' },
  { value: 'desert', label: 'Desert', emoji: '🏜️' },
]

export function categoryLabel(value: string | null | undefined): string {
  return STORY_CATEGORIES.find((c) => c.value === value)?.label ?? value ?? 'Other'
}

export function categoryEmoji(value: string | null | undefined): string {
  return STORY_CATEGORIES.find((c) => c.value === value)?.emoji ?? '📚'
}

export function themeLabel(value: string | null | undefined): string {
  return STORY_THEMES.find((t) => t.value === value)?.label ?? value ?? 'General'
}

export function themeEmoji(value: string | null | undefined): string {
  return STORY_THEMES.find((t) => t.value === value)?.emoji ?? '🎨'
}

const coverPalettes = [
  'from-brand-400 to-grape-500',
  'from-sunny-400 to-coral-400',
  'from-mint-400 to-brand-500',
  'from-coral-400 to-grape-500',
  'from-grape-400 to-brand-600',
]

export function pickPalette(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return coverPalettes[hash % coverPalettes.length]
}
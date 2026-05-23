export const STAT_KEYS = ['top_speed', 'acceleration', 'handling', 'nitro'] as const
export type StatKey = typeof STAT_KEYS[number]

export const STAT_LABELS: Record<StatKey, string> = {
  top_speed: 'Top Speed',
  acceleration: 'Acceleration',
  handling: 'Handling',
  nitro: 'Nitro',
}

export const STAT_COLORS: Record<StatKey, { bar: string; text: string; ring: string }> = {
  top_speed:    { bar: 'bg-blue-500',    text: 'text-blue-400',    ring: 'ring-blue-500/30' },
  acceleration: { bar: 'bg-amber-500',   text: 'text-amber-400',   ring: 'ring-amber-500/30' },
  handling:     { bar: 'bg-emerald-500', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
  nitro:        { bar: 'bg-purple-500',  text: 'text-purple-400',  ring: 'ring-purple-500/30' },
}

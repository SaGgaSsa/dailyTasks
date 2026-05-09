export const WORK_ITEM_TYPE_COLOR_OPTIONS = [
  {
    value: 'red',
    label: 'Rojo',
    indicatorClassName: 'bg-red-400',
    badgeClassName: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  {
    value: 'blue',
    label: 'Azul',
    indicatorClassName: 'bg-blue-400',
    badgeClassName: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  {
    value: 'green',
    label: 'Verde',
    indicatorClassName: 'bg-emerald-400',
    badgeClassName: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  {
    value: 'orange',
    label: 'Naranja',
    indicatorClassName: 'bg-orange-400',
    badgeClassName: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  {
    value: 'purple',
    label: 'Púrpura',
    indicatorClassName: 'bg-purple-400',
    badgeClassName: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  {
    value: 'yellow',
    label: 'Amarillo',
    indicatorClassName: 'bg-yellow-400',
    badgeClassName: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  },
  {
    value: 'cyan',
    label: 'Cian',
    indicatorClassName: 'bg-cyan-400',
    badgeClassName: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  {
    value: 'pink',
    label: 'Rosa',
    indicatorClassName: 'bg-pink-400',
    badgeClassName: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  },
  {
    value: 'teal',
    label: 'Verde azulado',
    indicatorClassName: 'bg-teal-400',
    badgeClassName: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  },
  {
    value: 'indigo',
    label: 'Índigo',
    indicatorClassName: 'bg-indigo-400',
    badgeClassName: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
  {
    value: 'rose',
    label: 'Rosado',
    indicatorClassName: 'bg-rose-400',
    badgeClassName: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
  {
    value: 'slate',
    label: 'Gris',
    indicatorClassName: 'bg-slate-400',
    badgeClassName: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  },
] as const

export type WorkItemTypeColor = (typeof WORK_ITEM_TYPE_COLOR_OPTIONS)[number]['value']

export const WORK_ITEM_TYPE_COLOR_LIMIT = WORK_ITEM_TYPE_COLOR_OPTIONS.length

export const workItemTypeColorMap = Object.fromEntries(
  WORK_ITEM_TYPE_COLOR_OPTIONS.map((option) => [option.value, option])
) as Record<WorkItemTypeColor, (typeof WORK_ITEM_TYPE_COLOR_OPTIONS)[number]>

export function getWorkItemTypeColorOption(color?: string | null) {
  return workItemTypeColorMap[color as WorkItemTypeColor] ?? null
}

export const NO_WORK_ITEM_TYPE_COLOR_VALUE = 'none'

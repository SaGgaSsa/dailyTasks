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

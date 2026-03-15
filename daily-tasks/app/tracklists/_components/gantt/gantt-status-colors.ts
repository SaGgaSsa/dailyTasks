import { TaskStatus } from '@/types/enums'

interface StatusColorClasses {
  bar: string
  badge: string
  label: string
}

export const STATUS_STYLES: Record<string, StatusColorClasses> = {
  [TaskStatus.TODO]: {
    bar: 'border-l-4 border-l-zinc-400 bg-zinc-100 dark:bg-zinc-800',
    badge: 'border-l-4 border-l-zinc-400 bg-zinc-100 dark:bg-zinc-800',
    label: 'Pendiente',
  },
  [TaskStatus.IN_PROGRESS]: {
    bar: 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950',
    badge: 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950',
    label: 'En Progreso',
  },
  [TaskStatus.REVIEW]: {
    bar: 'border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950',
    badge: 'border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950',
    label: 'En Revisión',
  },
  [TaskStatus.DONE]: {
    bar: 'border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950',
    badge: 'border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950',
    label: 'Completado',
  },
}

const FALLBACK_STYLE = STATUS_STYLES[TaskStatus.TODO]

export const DELAYED_CLASSES = 'ring-2 ring-red-500/40'
export const DELAYED_LABEL = 'Demorado'

export function getBarColorClasses(status: string, delayed: boolean): string {
  const style = STATUS_STYLES[status] ?? FALLBACK_STYLE
  return delayed ? `${style.bar} ${DELAYED_CLASSES}` : style.bar
}

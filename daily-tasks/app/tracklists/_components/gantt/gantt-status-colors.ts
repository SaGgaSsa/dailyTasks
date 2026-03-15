import { TaskStatus } from '@/types/enums'

const STATUS_COLORS: Record<string, string> = {
  [TaskStatus.TODO]: 'bg-zinc-400/50',
  [TaskStatus.IN_PROGRESS]: 'bg-blue-500/60',
  [TaskStatus.REVIEW]: 'bg-amber-500/60',
  [TaskStatus.DONE]: 'bg-green-500/50',
}

export function getBarColorClasses(status: string, delayed: boolean): string {
  const base = STATUS_COLORS[status] ?? 'bg-zinc-400/50'
  return delayed ? `${base} ring-2 ring-red-500/40` : base
}

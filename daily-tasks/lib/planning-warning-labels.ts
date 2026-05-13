import type { PlanningWarningCode } from '@/lib/planning-diagnostics'

export const PLANNING_WARNING_LABELS: Record<PlanningWarningCode, string> = {
  MISSING_ESTIMATE: 'Sin estimación',
  MISSING_ASSIGNED_HOURS: 'Horas asignadas faltantes',
  UNDER_ASSIGNED: 'Subasignada',
  TODO_WITH_ACTIVITY: 'TODO con actividad',
}

export function formatPlanningWarnings(warnings: PlanningWarningCode[]) {
  return warnings.map((warning) => PLANNING_WARNING_LABELS[warning]).join(', ')
}

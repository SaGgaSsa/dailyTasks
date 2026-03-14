'use client'

import { Row } from '@tanstack/react-table'
import { IncidenceWithDetails } from '@/types'
import { IncidenceActionsMenu } from '@/components/incidences/incidence-actions-menu'

interface DataTableRowActionsProps {
  row: Row<IncidenceWithDetails>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  return (
    <IncidenceActionsMenu
      task={row.original}
      triggerClassName="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
      triggerIconClassName="h-4 w-4"
    />
  )
}

'use client'

import { Row } from '@tanstack/react-table'
import { MoreHorizontal, CheckCircle, BarChart3, FileText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IncidenceWithDetails } from '@/types'
import { TaskStatus } from '@/types/enums'
import { completeIncidence } from '@/app/actions/incidence-actions'
import { toast } from 'sonner'

interface DataTableRowActionsProps {
  row: Row<IncidenceWithDetails>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const task = row.original
  const canComplete = task.status === TaskStatus.REVIEW || task.status === TaskStatus.IN_PROGRESS

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const result = await completeIncidence(task.id)
    if (result.success) {
      toast.success('Incidencia completada correctamente')
    } else {
      toast.error(result.error || 'Error al completar la incidencia')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]" onClick={(e) => e.stopPropagation()}>
        {canComplete && (
          <DropdownMenuItem onClick={handleComplete}>
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            Completar Incidencia
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem disabled onClick={(e) => e.stopPropagation()}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Ver Métricas
        </DropdownMenuItem>
        
        <DropdownMenuItem disabled onClick={(e) => e.stopPropagation()}>
          <FileText className="mr-2 h-4 w-4" />
          Ver Páginas
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          disabled
          className="text-red-600 focus:text-red-600"
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Descartar Incidencia
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Row } from '@tanstack/react-table'
import { EllipsisVertical, CheckCircle, BarChart3, FileText, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IncidenceWithDetails } from '@/types'
import { TaskStatus } from '@/types/enums'
import { completeIncidence, deleteIncidence } from '@/app/actions/incidence-actions'
import { toast } from 'sonner'

interface DataTableRowActionsProps {
  row: Row<IncidenceWithDetails>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const router = useRouter()
  const task = row.original
  const canComplete = task.status === TaskStatus.REVIEW || task.status === TaskStatus.IN_PROGRESS
  const canDiscard = task.status !== TaskStatus.DONE && task.status !== TaskStatus.REVIEW
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenDialog = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
  }

  const handleConfirmComplete = async () => {
    setIsLoading(true)
    const result = await completeIncidence(task.id)
    setIsLoading(false)
    setIsDialogOpen(false)

    if (result.success) {
      toast.success('Incidencia completada correctamente')
    } else {
      toast.error(result.error || 'Error al completar la incidencia')
    }
  }

  const handleConfirmDiscard = async () => {
    setIsLoading(true)
    const result = await deleteIncidence(task.id)
    setIsLoading(false)
    setIsDiscardDialogOpen(false)

    if (result.success) {
      toast.success('Incidencia descartada')
    } else {
      toast.error(result.error || 'Error al descartar la incidencia')
    }
  }

  const getCollaboratorsList = () => {
    return task.assignments
      .filter(a => a.isAssigned)
      .map(assignment => {
        const totalTasks = assignment.tasks.length
        const completedTasks = assignment.tasks.filter(t => t.isCompleted).length
        const pendingTasks = totalTasks - completedTasks
        
        return {
          name: assignment.user.username,
          totalTasks,
          completedTasks,
          pendingTasks
        }
      })
      .sort((a, b) => {
        if (b.pendingTasks !== a.pendingTasks) {
          return b.pendingTasks - a.pendingTasks
        }
        return b.name.localeCompare(a.name)
      })
  }

  const collaborators = getCollaboratorsList()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
            onClick={(e) => e.stopPropagation()}
          >
            <EllipsisVertical className="h-4 w-4" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]" onClick={(e) => e.stopPropagation()}>
          {canComplete && (
            <DropdownMenuItem onClick={handleOpenDialog}>
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              Completar Incidencia
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation()
            router.push(`/dashboard/incidences/${task.id}`)
          }}>
            <Eye className="mr-2 h-4 w-4" />
            Ver Incidencia
          </DropdownMenuItem>
          
          <DropdownMenuItem disabled onClick={(e) => e.stopPropagation()}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Ver Métricas
          </DropdownMenuItem>
          
          <DropdownMenuItem disabled onClick={(e) => e.stopPropagation()}>
            <FileText className="mr-2 h-4 w-4" />
            Ver Páginas
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {canDiscard && (
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={(e) => {
                e.stopPropagation()
                setIsDiscardDialogOpen(true)
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Descartar Incidencia
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>
              Completar Incidencia {task.externalWorkItem?.type ?? ''} {task.externalWorkItem?.externalId ?? ''}
            </DialogTitle>
            <DialogDescription>
              {task.title}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <h4 className="text-sm font-medium mb-3">Colaboradores:</h4>
            <div className="space-y-2">
              {collaborators.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay colaboradores asignados</p>
              ) : (
                collaborators.map((collab, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{collab.name}</span>
                    <span className="text-muted-foreground">
                      {collab.totalTasks === 0
                        ? 'Sin tareas'
                        : `${collab.pendingTasks}/${collab.totalTasks} pendientes`
                      }
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmComplete} disabled={isLoading}>
              {isLoading ? 'Completando...' : 'Confirmar Completado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>¿Estás seguro de descartar esta incidencia?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se borrarán todas las tareas y asignaciones asociadas.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDiscardDialogOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDiscard} disabled={isLoading}>
              {isLoading ? 'Eliminando...' : 'Confirmar Eliminación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
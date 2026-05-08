'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EllipsisVertical, CheckCircle, BarChart3, FileText, Trash2, Eye, PauseCircle, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
import { completeIncidence, deferIncidence, deleteIncidence, resumeDeferredIncidence } from '@/app/actions/incidence-actions'
import { toast } from 'sonner'

interface IncidenceActionsMenuProps {
  task: IncidenceWithDetails
  isDev?: boolean
  triggerClassName?: string
  triggerIconClassName?: string
}

export function IncidenceActionsMenu({
  task,
  isDev = false,
  triggerClassName,
  triggerIconClassName,
}: IncidenceActionsMenuProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false)
  const [isDeferDialogOpen, setIsDeferDialogOpen] = useState(false)
  const [deferReason, setDeferReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const canComplete = (task.status === TaskStatus.REVIEW || task.status === TaskStatus.IN_PROGRESS) && (task.qaTickets?.length ?? 0) === 0
  const canDiscard = task.status !== TaskStatus.DONE && task.status !== TaskStatus.REVIEW && task.status !== TaskStatus.DISMISSED && task.status !== TaskStatus.DEFERRED
  const canDefer = task.status === TaskStatus.TODO || task.status === TaskStatus.IN_PROGRESS
  const canResume = task.status === TaskStatus.DEFERRED

  const handleOpenDialog = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDialogOpen(true)
  }

  const handleConfirmComplete = async () => {
    setIsLoading(true)
    const result = await completeIncidence(task.id)
    setIsLoading(false)
    setIsDialogOpen(false)

    if (result.success) {
      toast.success('Incidencia completada correctamente')
      router.refresh()
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
      router.refresh()
    } else {
      toast.error(result.error || 'Error al descartar la incidencia')
    }
  }

  const handleConfirmDefer = async () => {
    if (!deferReason.trim()) {
      toast.error('El motivo del diferimiento es obligatorio')
      return
    }

    setIsLoading(true)
    const result = await deferIncidence(task.id, deferReason)
    setIsLoading(false)

    if (result.success) {
      toast.success('Incidencia diferida')
      setIsDeferDialogOpen(false)
      setDeferReason('')
      router.refresh()
    } else {
      toast.error(result.error || 'Error al diferir la incidencia')
    }
  }

  const handleResume = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsLoading(true)
    const result = await resumeDeferredIncidence(task.id)
    setIsLoading(false)

    if (result.success) {
      toast.success('Incidencia reanudada')
      router.refresh()
    } else {
      toast.error(result.error || 'Error al reanudar la incidencia')
    }
  }

  const collaborators = task.assignments
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

  const showComplete = !isDev && canComplete
  const showDiscard = !isDev && canDiscard
  const showDefer = !isDev && canDefer
  const showResume = !isDev && canResume

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={triggerClassName}
            onClick={(e) => e.stopPropagation()}
          >
            <EllipsisVertical className={triggerIconClassName} />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]" onClick={(e) => e.stopPropagation()}>
          {showComplete && (
            <DropdownMenuItem onClick={handleOpenDialog}>
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              Completar Incidencia
            </DropdownMenuItem>
          )}

          {showDefer && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setIsDeferDialogOpen(true)
              }}
            >
              <PauseCircle className="mr-2 h-4 w-4 text-zinc-500" />
              Diferir Incidencia
            </DropdownMenuItem>
          )}

          {showResume && (
            <DropdownMenuItem onClick={handleResume} disabled={isLoading}>
              <PlayCircle className="mr-2 h-4 w-4 text-blue-500" />
              Reanudar Incidencia
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation()
            router.push(`/incidences/${task.id}`)
          }}>
            <Eye className="mr-2 h-4 w-4" />
            Ver Incidencia
          </DropdownMenuItem>

          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation()
            router.push(`/incidences/${task.id}#pages`)
          }}>
            <FileText className="mr-2 h-4 w-4" />
            Ver Páginas
          </DropdownMenuItem>

          <DropdownMenuItem disabled onClick={(e) => e.stopPropagation()}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Ver Métricas
          </DropdownMenuItem>

          {showDiscard && <DropdownMenuSeparator />}

          {showDiscard && (
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
              {task.description}
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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmComplete} disabled={isLoading}>
              {isLoading ? 'Completando...' : 'Confirmar Completado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeferDialogOpen} onOpenChange={setIsDeferDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>
              Diferir Incidencia {task.externalWorkItem?.type ?? ''} {task.externalWorkItem?.externalId ?? ''}
            </DialogTitle>
            <DialogDescription>
              {task.description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <label className="text-sm font-medium" htmlFor={`defer-reason-${task.id}`}>
              Motivo
            </label>
            <Textarea
              id={`defer-reason-${task.id}`}
              value={deferReason}
              onChange={(event) => setDeferReason(event.target.value)}
              placeholder="Indica por qué se difiere esta incidencia"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeferDialogOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmDefer} disabled={isLoading || !deferReason.trim()}>
              {isLoading ? 'Difiriendo...' : 'Confirmar Diferimiento'}
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

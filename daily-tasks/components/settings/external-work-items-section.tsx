'use client'

import { useState } from 'react'
import { createExternalWorkItem, updateExternalWorkItemStatus } from '@/app/actions/external-work-items'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ExternalWorkItemSummary, WorkItemTypeOption, ExternalWorkItemStatus } from '@/types'
import { getWorkItemTypeColorOption } from '@/lib/work-item-color-options'

interface NewRow {
  workItemTypeId: string
  externalId: string
  title: string
}

interface ReactivateCandidate {
  id: number
  label: string
}

const EMPTY_ROW: NewRow = { workItemTypeId: '', externalId: '', title: '' }
const EXTERNAL_WORK_ITEM_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

interface ExternalWorkItemsSectionProps {
  items: ExternalWorkItemSummary[]
  workItemTypes: WorkItemTypeOption[]
  onRefresh: () => Promise<void>
  canManage: boolean
}

function buildWorkItemLabel(item: Pick<ExternalWorkItemSummary, 'type' | 'externalId'>) {
  return `${item.type} ${item.externalId}`
}

export function ExternalWorkItemsSection({ items, workItemTypes, onRefresh, canManage }: ExternalWorkItemsSectionProps) {
  const [newRow, setNewRow] = useState<NewRow>({ ...EMPTY_ROW })
  const [draftStatuses, setDraftStatuses] = useState<Record<number, ExternalWorkItemStatus>>({})
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reactivateCandidate, setReactivateCandidate] = useState<ReactivateCandidate | null>(null)

  const setDraftStatus = (id: number, nextStatus: ExternalWorkItemStatus, currentStatus: ExternalWorkItemStatus) => {
    setDraftStatuses((prev) => {
      if (nextStatus === currentStatus) {
        const nextDraftStatuses = { ...prev }
        delete nextDraftStatuses[id]
        return nextDraftStatuses
      }

      return {
        ...prev,
        [id]: nextStatus,
      }
    })
  }

  const refreshAndReset = async () => {
    await onRefresh()
    setDraftStatuses({})
  }

  const handleCreate = async () => {
    setError(null)
    if (!newRow.workItemTypeId || !newRow.externalId || !newRow.title.trim()) {
      setError('Todos los campos son requeridos')
      return
    }

    setIsPending(true)
    const result = await createExternalWorkItem({
      workItemTypeId: parseInt(newRow.workItemTypeId, 10),
      externalId: parseInt(newRow.externalId, 10),
      title: newRow.title.trim(),
    })
    setIsPending(false)

    if (result.success) {
      toast.success('Trámite creado correctamente')
      setNewRow({ ...EMPTY_ROW })
      setError(null)
      await refreshAndReset()
      return
    }

    if (result.data && 'duplicateInactive' in result.data && result.data.duplicateInactive) {
      setReactivateCandidate({
        id: result.data.item.id,
        label: buildWorkItemLabel(result.data.item),
      })
      return
    }

    setError(result.error || 'Error al crear')
  }

  const handleSaveStatus = async (item: ExternalWorkItemSummary) => {
    const nextStatus = draftStatuses[item.id]
    if (!nextStatus || nextStatus === item.status) {
      return
    }

    setIsPending(true)
    const result = await updateExternalWorkItemStatus({
      id: item.id,
      status: nextStatus,
    })
    setIsPending(false)

    if (result.success) {
      toast.success(nextStatus === EXTERNAL_WORK_ITEM_STATUS.INACTIVE ? 'Trámite inactivado correctamente' : 'Trámite guardado correctamente')
      await refreshAndReset()
    } else {
      toast.error(result.error || 'Error al guardar')
    }
  }

  const handleReactivate = async () => {
    if (!reactivateCandidate) {
      return
    }

    setIsPending(true)
    const result = await updateExternalWorkItemStatus({
      id: reactivateCandidate.id,
      status: EXTERNAL_WORK_ITEM_STATUS.ACTIVE,
      title: newRow.title.trim(),
    })
    setIsPending(false)

    if (result.success) {
      toast.success('Trámite reactivado correctamente')
      setReactivateCandidate(null)
      setNewRow({ ...EMPTY_ROW })
      setError(null)
      await refreshAndReset()
    } else {
      toast.error(result.error || 'Error al reactivar')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Trámites Externos</h2>
        <p className="text-sm text-muted-foreground">
          {canManage ? 'Gestionar trámites activos del sistema externo' : 'Trámites activos registrados del sistema externo'}
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px] h-9 px-2">Tipo</TableHead>
              <TableHead className="w-[120px] h-9 px-2">ID Externo</TableHead>
              <TableHead className="h-9 px-2">Título</TableHead>
              <TableHead className="w-[140px] h-9 px-2">Estado</TableHead>
              {canManage && <TableHead className="w-[60px] h-9 px-2">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const draftStatus = draftStatuses[item.id] ?? item.status
              const hasStatusChanges = draftStatus !== item.status

              return (
                <TableRow key={item.id}>
                  <TableCell className="py-1.5 px-2">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      {getWorkItemTypeColorOption(item.color) ? (
                        <span className={`h-2.5 w-2.5 rounded-full ${getWorkItemTypeColorOption(item.color)!.indicatorClassName}`} />
                      ) : null}
                      <span>{item.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 px-2">{item.externalId}</TableCell>
                  <TableCell className="py-1.5 px-2">{item.title || '—'}</TableCell>
                  <TableCell className="py-1.5 px-2">
                    <Select
                      value={draftStatus}
                      onValueChange={(value) => setDraftStatus(item.id, value as ExternalWorkItemStatus, item.status)}
                      disabled={!canManage || isPending}
                    >
                      <SelectTrigger className="h-8 w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EXTERNAL_WORK_ITEM_STATUS.ACTIVE}>ACTIVE</SelectItem>
                        <SelectItem value={EXTERNAL_WORK_ITEM_STATUS.INACTIVE}>INACTIVE</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {canManage && (
                    <TableCell className="py-1.5 px-2">
                      {hasStatusChanges ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleSaveStatus(item)}
                          disabled={isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDraftStatus(item.id, EXTERNAL_WORK_ITEM_STATUS.INACTIVE, item.status)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              )
            })}

            {canManage && (
              <TableRow>
                <TableCell className="py-1.5 px-2">
                  <Select
                    value={newRow.workItemTypeId}
                    onValueChange={(value) => setNewRow({ ...newRow, workItemTypeId: value })}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {workItemTypes.map((itemType) => (
                        <SelectItem key={itemType.id} value={String(itemType.id)}>
                          <span className="flex items-center gap-2">
                            {getWorkItemTypeColorOption(itemType.color) ? (
                              <span className={`h-2.5 w-2.5 rounded-full ${getWorkItemTypeColorOption(itemType.color)!.indicatorClassName}`} />
                            ) : null}
                            <span>{itemType.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <Input
                    type="number"
                    placeholder="ID"
                    className="h-8 text-xs"
                    value={newRow.externalId}
                    onChange={(e) => setNewRow({ ...newRow, externalId: e.target.value })}
                  />
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <Input
                    type="text"
                    placeholder="Título del trámite"
                    className="h-8 text-xs"
                    value={newRow.title}
                    onChange={(e) => setNewRow({ ...newRow, title: e.target.value })}
                  />
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <Select value={EXTERNAL_WORK_ITEM_STATUS.ACTIVE} disabled>
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EXTERNAL_WORK_ITEM_STATUS.ACTIVE}>ACTIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={handleCreate}
                    disabled={isPending}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <AlertDialog open={reactivateCandidate !== null} onOpenChange={(open) => { if (!open) setReactivateCandidate(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reactivar trámite?</AlertDialogTitle>
            <AlertDialogDescription>
              El trámite {reactivateCandidate?.label ? `"${reactivateCandidate.label}"` : ''} ya existe y está inactivo. Si confirmás, se volverá a activar y se actualizará su título con el valor ingresado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate} disabled={isPending}>
              Reactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

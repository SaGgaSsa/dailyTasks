'use client'

import { useState } from 'react'
import { createExternalWorkItem, deleteExternalWorkItem } from '@/app/actions/external-work-items'
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
import { Trash2, Save } from 'lucide-react'
import { toast } from 'sonner'
import type { ExternalWorkItemSummary, WorkItemTypeOption } from '@/types'

interface NewRow {
  workItemTypeId: string
  externalId: string
  title: string
}

const EMPTY_ROW: NewRow = { workItemTypeId: '', externalId: '', title: '' }

interface ExternalWorkItemsSectionProps {
  items: ExternalWorkItemSummary[]
  workItemTypes: WorkItemTypeOption[]
  onRefresh: () => Promise<void>
  canManage: boolean
}

export function ExternalWorkItemsSection({ items, workItemTypes, onRefresh, canManage }: ExternalWorkItemsSectionProps) {
  const [newRow, setNewRow] = useState<NewRow>({ ...EMPTY_ROW })
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

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
      await onRefresh()
    } else {
      setError(result.error || 'Error al crear')
    }
  }

  const handleDelete = async (id: number) => {
    setIsPending(true)
    const result = await deleteExternalWorkItem(id)
    setIsPending(false)
    setDeleteConfirmId(null)

    if (result.success) {
      toast.success('Trámite eliminado correctamente')
      await onRefresh()
    } else {
      toast.error(result.error || 'Error al eliminar')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Trámites Externos</h2>
        <p className="text-sm text-muted-foreground">
          {canManage ? 'Gestionar trámites del sistema externo' : 'Trámites registrados del sistema externo'}
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px] h-9 px-2">Tipo</TableHead>
              <TableHead className="w-[120px] h-9 px-2">ID Externo</TableHead>
              <TableHead className="h-9 px-2">Título</TableHead>
              {canManage && <TableHead className="w-[60px] h-9 px-2">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="py-1.5 px-2 font-mono text-xs">{item.type}</TableCell>
                <TableCell className="py-1.5 px-2">{item.externalId}</TableCell>
                <TableCell className="py-1.5 px-2">{item.title || '—'}</TableCell>
                {canManage && (
                  <TableCell className="py-1.5 px-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteConfirmId(item.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}

            {/* New row */}
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
                          {itemType.name}
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

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar trámite?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El trámite será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteConfirmId !== null && handleDelete(deleteConfirmId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

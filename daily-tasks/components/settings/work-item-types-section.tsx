'use client'

import { useState } from 'react'
import { createWorkItemType, deleteWorkItemType } from '@/app/actions/external-work-items'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { WorkItemTypeOption } from '@/types'
import { Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface WorkItemTypesSectionProps {
  items: WorkItemTypeOption[]
  onRefresh: () => Promise<void>
  canManage: boolean
}

export function WorkItemTypesSection({ items, onRefresh, canManage }: WorkItemTypesSectionProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const handleCreate = async () => {
    setError(null)
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }

    setIsPending(true)
    const result = await createWorkItemType(name)
    setIsPending(false)

    if (result.success) {
      setName('')
      toast.success('Tipo de trámite creado correctamente')
      await onRefresh()
      return
    }

    setError(result.error || 'Error al crear el tipo de trámite')
  }

  const handleDelete = async (id: number) => {
    setIsPending(true)
    const result = await deleteWorkItemType(id)
    setIsPending(false)
    setDeleteConfirmId(null)

    if (result.success) {
      toast.success('Tipo de trámite eliminado correctamente')
      await onRefresh()
      return
    }

    toast.error(result.error || 'Error al eliminar el tipo de trámite')
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Tipos de Trámite</h2>
        <p className="text-sm text-muted-foreground">
          {canManage ? 'Gestionar tipos válidos para trámites externos' : 'Tipos válidos para trámites externos'}
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-2">Nombre</TableHead>
              {canManage && <TableHead className="w-[60px] h-9 px-2">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="py-1.5 px-2 font-mono text-xs">{item.name}</TableCell>
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

            {canManage && (
              <TableRow>
                <TableCell className="py-1.5 px-2">
                  <Input
                    type="text"
                    placeholder="Nombre del tipo"
                    className="h-8 text-xs"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tipo de trámite?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Si el tipo tiene trámites asociados, no podrá eliminarse.
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

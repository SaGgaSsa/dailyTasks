'use client'

import { useState } from 'react'
import { createWorkItemType, deleteWorkItemType } from '@/app/actions/external-work-items'
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
import type { WorkItemTypeOption } from '@/types'
import { Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { NO_WORK_ITEM_TYPE_COLOR_VALUE, WORK_ITEM_TYPE_COLOR_LIMIT, WORK_ITEM_TYPE_COLOR_OPTIONS, type WorkItemTypeColor, getWorkItemTypeColorOption } from '@/lib/work-item-color-options'

interface WorkItemTypesSectionProps {
  items: WorkItemTypeOption[]
  onRefresh: () => Promise<void>
  canManage: boolean
}

export function WorkItemTypesSection({ items, onRefresh, canManage }: WorkItemTypesSectionProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<WorkItemTypeColor | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const usedColors = new Set(items.map((item) => item.color))
  const availableColors = WORK_ITEM_TYPE_COLOR_OPTIONS.filter((option) => !usedColors.has(option.value))
  const limitReached = items.length >= WORK_ITEM_TYPE_COLOR_LIMIT

  const handleCreate = async () => {
    setError(null)
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }

    if (limitReached) {
      setError('Solo se permiten 5 tipos de trámite')
      return
    }

    setIsPending(true)
    const result = await createWorkItemType({ name, color: color || null })
    setIsPending(false)

    if (result.success) {
      setName('')
      setColor('')
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
        <p className="text-xs text-muted-foreground">
          {items.length}/{WORK_ITEM_TYPE_COLOR_LIMIT} tipos configurados
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-2">Nombre</TableHead>
              <TableHead className="h-9 px-2">Color</TableHead>
              {canManage && <TableHead className="w-[60px] h-9 px-2">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="py-1.5 px-2 font-mono text-xs">{item.name}</TableCell>
                <TableCell className="py-1.5 px-2">
                  <div className="flex items-center gap-2 text-xs">
                    {getWorkItemTypeColorOption(item.color) ? (
                      <>
                        <span className={`h-2.5 w-2.5 rounded-full ${getWorkItemTypeColorOption(item.color)!.indicatorClassName}`} />
                        <span>{getWorkItemTypeColorOption(item.color)!.label}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Sin color</span>
                    )}
                  </div>
                </TableCell>
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
                    disabled={isPending || limitReached}
                  />
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <Select
                    value={color || NO_WORK_ITEM_TYPE_COLOR_VALUE}
                    onValueChange={(value) => setColor(value === NO_WORK_ITEM_TYPE_COLOR_VALUE ? '' : value as WorkItemTypeColor)}
                    disabled={isPending || limitReached}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue placeholder="Color opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_WORK_ITEM_TYPE_COLOR_VALUE}>
                        <span className="text-muted-foreground">Sin color</span>
                      </SelectItem>
                      {availableColors.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${option.indicatorClassName}`} />
                            <span>{option.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={handleCreate}
                    disabled={isPending || limitReached}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {limitReached && (
        <p className="text-sm text-muted-foreground">Ya se alcanzó el máximo de 5 tipos de trámite.</p>
      )}

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

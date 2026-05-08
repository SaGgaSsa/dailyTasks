'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { ExternalWorkItemStatus } from '@prisma/client'
import { ChevronLeft, ChevronRight, Plus, PowerOff, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createExternalWorkItem,
  deleteExternalWorkItem,
  getExternalWorkItemsManagementData,
  updateExternalWorkItemStatus,
  type ExternalWorkItemsManagementData,
} from '@/app/actions/external-work-items'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchBar } from '@/components/ui/search-bar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getWorkItemTypeColorOption } from '@/lib/work-item-color-options'
import type { ExternalWorkItemSummary } from '@/types'

const ALL_TYPES_VALUE = 'all'

interface NewWorkItemForm {
  workItemTypeId: string
  externalId: string
  title: string
}

interface TramitesClientProps {
  initialData: ExternalWorkItemsManagementData
}

const EMPTY_FORM: NewWorkItemForm = {
  workItemTypeId: '',
  externalId: '',
  title: '',
}

export function TramitesClient({ initialData }: TramitesClientProps) {
  const [data, setData] = useState(initialData)
  const [query, setQuery] = useState('')
  const [selectedType, setSelectedType] = useState(ALL_TYPES_VALUE)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [page, setPage] = useState(1)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [form, setForm] = useState<NewWorkItemForm>({ ...EMPTY_FORM })
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedTypeId = selectedType === ALL_TYPES_VALUE ? null : Number(selectedType)
  const pageStart = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1
  const pageEnd = Math.min(data.page * data.pageSize, data.total)
  const canGoPrevious = data.page > 1
  const canGoNext = data.page < data.totalPages

  const typeOptions = useMemo(() => data.workItemTypes, [data.workItemTypes])

  useEffect(() => {
    let ignore = false

    startTransition(async () => {
      const result = await getExternalWorkItemsManagementData({
        page,
        workItemTypeId: selectedTypeId,
        query,
        includeInactive,
      })

      if (ignore) {
        return
      }

      if (result.success) {
        setData(result.data)
      } else {
        toast.error(result.error || 'Error al obtener trámites')
      }
    })

    return () => {
      ignore = true
    }
  }, [includeInactive, page, query, selectedTypeId])

  function reload(nextPage = page) {
    startTransition(async () => {
      const result = await getExternalWorkItemsManagementData({
        page: nextPage,
        workItemTypeId: selectedTypeId,
        query,
        includeInactive,
      })

      if (result.success) {
        setData(result.data)
        setPage(result.data.page)
      } else {
        toast.error(result.error || 'Error al obtener trámites')
      }
    })
  }

  function handleTypeChange(value: string) {
    setSelectedType(value)
    setPage(1)
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    setPage(1)
  }

  function handleInactiveChange(value: boolean) {
    setIncludeInactive(value)
    setPage(1)
  }

  async function handleSaveNewWorkItem() {
    setFormError(null)
    if (!form.workItemTypeId || !form.externalId || !form.title.trim()) {
      setFormError('Todos los campos son requeridos')
      return
    }

    const externalId = Number(form.externalId)
    if (!Number.isInteger(externalId) || externalId <= 0) {
      setFormError('El número debe ser un entero positivo')
      return
    }

    startTransition(async () => {
      const result = await createExternalWorkItem({
        workItemTypeId: Number(form.workItemTypeId),
        externalId,
        title: form.title.trim(),
      })

      if (!result.success) {
        setFormError(result.error || 'Error al guardar el trámite')
        return
      }

      toast.success('Trámite guardado correctamente')
      setForm({ ...EMPTY_FORM })
      setIsAddOpen(false)
      reload(1)
    })
  }

  function handleStatusChange(item: ExternalWorkItemSummary, status: ExternalWorkItemStatus) {
    startTransition(async () => {
      const result = await updateExternalWorkItemStatus({ id: item.id, status })

      if (result.success) {
        toast.success(status === ExternalWorkItemStatus.ACTIVE ? 'Trámite reactivado' : 'Trámite inactivado')
        reload(data.page)
      } else {
        toast.error(result.error || 'Error al guardar el trámite')
      }
    })
  }

  function handleDelete(item: ExternalWorkItemSummary) {
    startTransition(async () => {
      const result = await deleteExternalWorkItem(item.id)

      if (result.success) {
        toast.success('Trámite eliminado')
        reload(data.page)
      } else {
        toast.error(result.error || 'Error al eliminar el trámite')
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trámites</h1>
          <p className="text-sm text-muted-foreground">Gestionar trámites externos disponibles para tracklists e incidencias.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          value={query}
          onChange={handleQueryChange}
          placeholder="Buscar número o título..."
          className="w-64"
        />
        <Select value={selectedType} onValueChange={handleTypeChange}>
          <SelectTrigger className="h-8 w-48 text-sm">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES_VALUE}>Todos los tipos</SelectItem>
            {typeOptions.map((type) => (
              <SelectItem key={type.id} value={String(type.id)}>
                <span className="flex items-center gap-2">
                  {getWorkItemTypeColorOption(type.color) ? (
                    <span className={`h-2.5 w-2.5 rounded-full ${getWorkItemTypeColorOption(type.color)!.indicatorClassName}`} />
                  ) : null}
                  <span>{type.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex h-8 items-center gap-2 rounded-md border px-3 text-sm">
          <Switch checked={includeInactive} onCheckedChange={handleInactiveChange} />
          Mostrar inactivos
        </label>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Tipo</TableHead>
              <TableHead className="w-[120px]">Número</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="w-[120px]">Estado</TableHead>
              <TableHead className="w-[120px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No hay trámites para los filtros seleccionados
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      {getWorkItemTypeColorOption(item.color) ? (
                        <span className={`h-2.5 w-2.5 rounded-full ${getWorkItemTypeColorOption(item.color)!.indicatorClassName}`} />
                      ) : null}
                      <span>{item.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.externalId}</TableCell>
                  <TableCell>{item.title || '-'}</TableCell>
                  <TableCell>
                    <span className={item.status === ExternalWorkItemStatus.ACTIVE ? 'text-emerald-600' : 'text-muted-foreground'}>
                      {item.status === ExternalWorkItemStatus.ACTIVE ? 'Activo' : 'Inactivo'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {item.status === ExternalWorkItemStatus.ACTIVE ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                          onClick={() => handleStatusChange(item, ExternalWorkItemStatus.INACTIVE)}
                          disabled={isPending}
                          aria-label="Inactivar trámite"
                          title="Inactivar trámite"
                        >
                          <PowerOff className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleStatusChange(item, ExternalWorkItemStatus.ACTIVE)}
                          disabled={isPending}
                          aria-label="Activar trámite"
                          title="Activar trámite"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(item)}
                        disabled={isPending}
                        aria-label="Borrar trámite"
                        title="Borrar trámite"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Mostrando {pageStart}-{pageEnd} de {data.total}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={!canGoPrevious || isPending}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="min-w-24 text-center">
            Página {data.page} de {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => current + 1)}
            disabled={!canGoNext || isPending}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar trámite</DialogTitle>
            <DialogDescription>
              Si el tipo y número corresponden a un trámite inactivo existente, se reactivará al guardar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.workItemTypeId}
                onValueChange={(value) => setForm((current) => ({ ...current, workItemTypeId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input
                type="number"
                min={1}
                value={form.externalId}
                onChange={(event) => setForm((current) => ({ ...current, externalId: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSaveNewWorkItem} disabled={isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

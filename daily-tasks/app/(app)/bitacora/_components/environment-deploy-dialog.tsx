'use client'

import { useMemo, useState, useTransition } from 'react'
import { CheckSquare, Rocket } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  PendingEnvironmentDeployItem,
  registerEnvironmentDeploys,
} from '@/app/actions/environment-log'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface EnvironmentDeployDialogProps {
  environmentId: number
  environmentName: string
  initialPendingItems: PendingEnvironmentDeployItem[]
  canRegisterDeploy: boolean
}

function formatDateTime(date: Date) {
  return new Date(date).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function EnvironmentDeployDialog({
  environmentId,
  environmentName,
  initialPendingItems,
  canRegisterDeploy,
}: EnvironmentDeployDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>(() => initialPendingItems.map((item) => item.incidenceId))
  const [items, setItems] = useState(initialPendingItems)
  const [isPending, startTransition] = useTransition()

  const allSelected = items.length > 0 && selectedIds.length === items.length
  const selectedCount = selectedIds.length

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.incidenceId)),
    [items, selectedIds]
  )

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      setItems(initialPendingItems)
      setSelectedIds(initialPendingItems.map((item) => item.incidenceId))
    }
  }

  function handleToggleAll() {
    setSelectedIds(allSelected ? [] : items.map((item) => item.incidenceId))
  }

  function handleToggleItem(incidenceId: number) {
    setSelectedIds((current) =>
      current.includes(incidenceId)
        ? current.filter((id) => id !== incidenceId)
        : [...current, incidenceId]
    )
  }

  function handleRegister() {
    startTransition(async () => {
      const result = await registerEnvironmentDeploys({
        environmentId,
        items: selectedItems.map((item) => ({ incidenceId: item.incidenceId })),
      })

      if (!result.success) {
        toast.error(result.error || 'No se pudo registrar el deploy')
        return
      }

      toast.success('Deploy registrado')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            className="h-9 w-9"
            onClick={() => handleOpenChange(true)}
            disabled={!canRegisterDeploy}
            aria-label="Registrar deploy"
          >
            <Rocket className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Registrar deploy</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Registrar deploy en {environmentName}</DialogTitle>
          </DialogHeader>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px] h-9 px-2 text-center">
                    <Checkbox
                      checked={allSelected}
                      disabled={items.length === 0}
                      onCheckedChange={handleToggleAll}
                      aria-label="Seleccionar todas"
                    />
                  </TableHead>
                  <TableHead className="h-9 px-2">Pendiente</TableHead>
                  <TableHead className="h-9 px-2">Disponible desde</TableHead>
                  <TableHead className="h-9 px-2">Último deploy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No hay incidencias pendientes para este ambiente.
                    </TableCell>
                  </TableRow>
                ) : null}

                {items.map((item) => (
                  <TableRow key={item.incidenceId}>
                    <TableCell className="px-2 py-2 text-center">
                      <Checkbox
                        checked={selectedIds.includes(item.incidenceId)}
                        onCheckedChange={() => handleToggleItem(item.incidenceId)}
                        aria-label={`Seleccionar incidencia ${item.incidenceId}`}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {item.workItem.type} {item.workItem.externalId}
                          </Badge>
                          {item.ticketNumber ? (
                            <Badge variant="secondary">Ticket #{item.ticketNumber}</Badge>
                          ) : null}
                        </div>
                        <div className="text-sm font-medium">{item.description}</div>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-2 text-sm text-muted-foreground">
                      {formatDateTime(item.readyForDeployAt)}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-sm text-muted-foreground">
                      {item.lastDeployedAt ? formatDateTime(item.lastDeployedAt) : 'Sin deploy'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleRegister}
              disabled={isPending || selectedCount === 0}
            >
              <CheckSquare className="h-4 w-4" />
              Registrar {selectedCount}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

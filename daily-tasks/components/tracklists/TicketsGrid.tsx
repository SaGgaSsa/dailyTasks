'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { createTicket } from '@/app/actions/tracklists'
import { cn } from '@/lib/utils'
import { TicketQAWithDetails } from '@/types'

const TIPO_TICKET = ['Bug', 'Cambio', 'Consulta'] as const
const PRIORIDAD = ['Alta', 'Media', 'Baja', 'Bloqueante'] as const

type NewTicketRow = {
  type: string
  module: string
  description: string
  priority: string
  impact: string
  tramite: string
}

const initialNewRow: NewTicketRow = {
  type: '',
  module: '',
  description: '',
  priority: '',
  impact: '',
  tramite: ''
}

interface TicketsGridProps {
  tracklistId: string
  initialTickets: TicketQAWithDetails[]
}

export function TicketsGrid({ tracklistId, initialTickets }: TicketsGridProps) {
  const [newRow, setNewRow] = useState<NewTicketRow>(initialNewRow)
  const [isPending, setIsPending] = useState(false)

  function handleChange<K extends keyof NewTicketRow>(field: K, value: NewTicketRow[K]) {
    setNewRow(prev => ({ ...prev, [field]: value }))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  async function handleSave() {
    if (!newRow.type || !newRow.module || !newRow.description || !newRow.priority) {
      toast.error('Completa los campos obligatorios')
      return
    }

    setIsPending(true)
    const result = await createTicket(tracklistId, {
      type: newRow.type,
      module: newRow.module,
      description: newRow.description,
      priority: newRow.priority,
      impact: newRow.impact || 'Medio',
      tramite: newRow.tramite
    })

    if (result.success) {
      toast.message('Ticket guardado')
      setNewRow(initialNewRow)
    } else {
      toast.error(result.error || 'Error al crear ticket')
    }
    setIsPending(false)
  }

  const isRowEmpty = !newRow.type && !newRow.module && !newRow.description

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 px-2">#</TableHead>
          <TableHead className="w-24 px-2">Tipo</TableHead>
          <TableHead className="w-20 px-2">Módulo</TableHead>
          <TableHead className="px-2">Descripción</TableHead>
          <TableHead className="w-24 px-2">Prioridad</TableHead>
          <TableHead className="w-28 px-2">Trámite</TableHead>
          <TableHead className="w-24 px-2">Estado Dev</TableHead>
          <TableHead className="w-24 px-2">Estado QA</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {initialTickets.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell className="font-mono text-xs px-2 py-2">{ticket.ticketNumber}</TableCell>
            <TableCell className="px-2 py-2">{ticket.type}</TableCell>
            <TableCell className="px-2 py-2">{ticket.module}</TableCell>
            <TableCell className="max-w-xs truncate px-2 py-2" title={ticket.description}>
              {ticket.description}
            </TableCell>
            <TableCell className="px-2 py-2">
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                  ticket.priority === 'Bloqueante' && 'bg-red-500/20 text-red-400',
                  ticket.priority === 'Alta' && 'bg-orange-500/20 text-orange-400',
                  ticket.priority === 'Media' && 'bg-yellow-500/20 text-yellow-400',
                  ticket.priority === 'Baja' && 'bg-green-500/20 text-green-400'
                )}
              >
                {ticket.priority}
              </span>
            </TableCell>
            <TableCell className="font-mono text-xs px-2 py-2">{ticket.tramite || '-'}</TableCell>
            <TableCell className="px-2 py-2">{ticket.status}</TableCell>
            <TableCell className="px-2 py-2">{ticket.verificationStatus}</TableCell>
          </TableRow>
        ))}

        <TableRow className="bg-muted/30 hover:bg-muted/40">
          <TableCell className="text-muted-foreground text-xs px-2 py-2">*</TableCell>
          <TableCell className="px-2 py-2">
            <Select value={newRow.type} onValueChange={(v) => handleChange('type', v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_TICKET.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell className="px-2 py-2">
            <Input
              placeholder="ej: SERV"
              className="h-8 text-sm"
              value={newRow.module}
              onChange={(e) => handleChange('module', e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </TableCell>
          <TableCell className="px-2 py-2">
            <Input
              placeholder="¿Qué falló?"
              className="h-8 text-sm"
              value={newRow.description}
              onChange={(e) => handleChange('description', e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </TableCell>
          <TableCell className="px-2 py-2">
            <Select value={newRow.priority} onValueChange={(v) => handleChange('priority', v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                {PRIORIDAD.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell className="px-2 py-2">
            <Input
              placeholder="I_MODAPL..."
              className="h-8 text-sm font-mono"
              value={newRow.tramite}
              onChange={(e) => handleChange('tramite', e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </TableCell>
          <TableCell className="text-muted-foreground text-xs px-2 py-2">—</TableCell>
          <TableCell className="px-2 py-2">
            <Button
              size="sm"
              className="h-8 gap-1"
              onClick={handleSave}
              disabled={isRowEmpty || isPending}
            >
              {isPending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
              <span className="text-xs">Agregar</span>
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

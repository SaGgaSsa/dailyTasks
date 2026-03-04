'use client'

import { useState } from 'react'
import { createTicket } from '@/app/actions/tracklists'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem 
} from '@/components/ui/select'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog'
import { toast } from 'sonner'

const TIPO_TICKET = [
  { value: 'Bug', label: 'Bug' },
  { value: 'Cambio', label: 'Cambio' },
  { value: 'Consulta', label: 'Consulta' }
]

interface Props {
  tracklistId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTicketDialog({ tracklistId, open, onOpenChange }: Props) {
  const [isPending, setIsPending] = useState(false)
  const [type, setType] = useState('Bug')
  const [description, setDescription] = useState('')
  const [observations, setObservations] = useState('')

  const handleSubmit = async () => {
    if (!description.trim()) return
    
    setIsPending(true)
    const result = await createTicket(tracklistId.toString(), {
      type,
      module: '',
      description: description.trim(),
      priority: 'Media',
      impact: 'Medio',
      observations: observations.trim() || undefined
    })
    setIsPending(false)
    
    if (result.success) {
      toast.success('Ticket creado correctamente')
      handleClose()
    } else {
      toast.error(result.error || 'Error al crear ticket')
    }
  }

  const handleClose = () => {
    setType('Bug')
    setDescription('')
    setObservations('')
    onOpenChange(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setType('Bug')
      setDescription('')
      setObservations('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-[600px]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Nuevo Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              placeholder="Descripción"
            />
          </div>
          <div className="space-y-2">
            <Textarea 
              value={observations} 
              onChange={e => setObservations(e.target.value)}
              placeholder="Observación"
              rows={4}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_TICKET.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!description.trim() || isPending}>
            {isPending ? 'Guardando...' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

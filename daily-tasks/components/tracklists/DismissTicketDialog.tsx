'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { dismissTicket } from '@/app/actions/tracklists'

interface DismissTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId: number
  tracklistId: number
}

export function DismissTicketDialog({ open, onOpenChange, ticketId, tracklistId }: DismissTicketDialogProps) {
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    const result = await dismissTicket(ticketId, reason, tracklistId)
    setIsLoading(false)

    if (result.success) {
      toast.success('Ticket desestimado correctamente')
      setReason('')
      onOpenChange(false)
    } else {
      toast.error(result.error || 'Error al desestimar el ticket')
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) setReason('')
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Desestimar ticket</DialogTitle>
          <DialogDescription>
            Indica la razón por la que se desestima este ticket. Esta acción cambiará su estado a Desestimado.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-2">
          <Label htmlFor="dismiss-reason">Razón</Label>
          <Textarea
            id="dismiss-reason"
            placeholder="Escribe la razón..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || reason.trim().length < 3}
          >
            {isLoading ? 'Desestimando...' : 'Desestimar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

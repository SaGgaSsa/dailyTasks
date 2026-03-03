'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTracklist } from '@/app/actions/tracklists'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTracklistDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')

  const handleSubmit = async () => {
    if (!title.trim()) return
    
    setIsPending(true)
    const result = await createTracklist({
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined
    })
    setIsPending(false)
    
    if (result.success && result.data) {
      toast.success('Tracklist creado correctamente')
      onOpenChange(false)
      setTitle('')
      setDescription('')
      setDueDate('')
      router.push(`/tracklists/${result.data.id}`)
    } else {
      toast.error(result.error || 'Error al crear tracklist')
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTitle('')
      setDescription('')
      setDueDate('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Tracklist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              placeholder="Nombre del tracklist"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              placeholder="Descripción opcional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Fecha de Entrega</Label>
            <Input 
              id="dueDate" 
              type="date" 
              value={dueDate} 
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isPending}>
            {isPending ? 'Guardando...' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

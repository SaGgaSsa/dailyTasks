'use client'

import { useState } from 'react'
import { Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { addLinkAttachment } from '@/app/actions/attachment-actions'
import { toast } from 'sonner'

interface AddLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  externalWorkItemId: number
  onSuccess?: () => void
}

export function AddLinkDialog({
  open,
  onOpenChange,
  externalWorkItemId,
  onSuccess,
}: AddLinkDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim() || !name.trim()) {
      setError('La URL y el nombre son requeridos')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await addLinkAttachment({
        externalWorkItemId,
        url: url.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
      })

      if (result.success) {
        toast.success('Enlace agregado correctamente')
        handleClose()
        onSuccess?.()
      } else {
        setError(result.error || 'Error al agregar el enlace')
      }
    } catch (err) {
      setError('Error al agregar el enlace')
      console.error('Add link error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setUrl('')
    setDescription('')
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Agregar Enlace</DialogTitle>
            <DialogDescription>
              Vincula un enlace externo (Google Drive, Figma, etc.)
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="link-name">Nombre</Label>
              <Input
                id="link-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre para mostrar"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="link-description">Descripción (opcional)</Label>
              <Textarea
                id="link-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Agrega una descripción..."
                rows={3}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !url.trim() || !name.trim()}>
              {isLoading ? (
                <>
                  <LinkIcon className="h-4 w-4 animate-pulse" />
                  Agregando...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4" />
                  Agregar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { EllipsisVertical, Download, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { updateAttachmentName, deleteAttachment } from '@/app/actions/attachment-actions'
import { toast } from 'sonner'
import { Attachment } from '@/types'

interface AttachmentRowActionsProps {
  attachment: Attachment
  onSuccess?: () => void
}

export function AttachmentRowActions({ attachment, onSuccess }: AttachmentRowActionsProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editName, setEditName] = useState(attachment.name)
  const [error, setError] = useState<string | null>(null)

  const uploadsPath = process.env.NEXT_PUBLIC_UPLOADS_PATH || '/uploads'
  const downloadUrl = `${uploadsPath}${attachment.url.replace('/uploads', '')}`

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = attachment.originalName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleUpdateName = async () => {
    if (!editName.trim()) {
      setError('El nombre no puede estar vacío')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await updateAttachmentName(Number(attachment.id), editName.trim())

      if (result.success) {
        toast.success('Nombre actualizado correctamente')
        setIsEditDialogOpen(false)
        onSuccess?.()
      } else {
        setError(result.error || 'Error al actualizar el nombre')
      }
    } catch (err) {
      setError('Error al actualizar el nombre')
      console.error('Update error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await deleteAttachment(Number(attachment.id))

      if (result.success) {
        toast.success('Archivo eliminado correctamente')
        setIsDeleteDialogOpen(false)
        onSuccess?.()
      } else {
        setError(result.error || 'Error al eliminar el archivo')
      }
    } catch (err) {
      setError('Error al eliminar el archivo')
      console.error('Delete error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <EllipsisVertical className="h-4 w-4" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Descargar
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => {
            setEditName(attachment.name)
            setError(null)
            setIsEditDialogOpen(true)
          }}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar Nombre
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={() => {
              setError(null)
              setIsDeleteDialogOpen(true)
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Editar Nombre</DialogTitle>
            <DialogDescription>
              Cambia el nombre que se mostrará para este archivo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre del archivo"
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
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateName} disabled={isLoading || !editName.trim()}>
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>¿Estás seguro de eliminar este archivo?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El archivo &quot;{attachment.name}&quot; será eliminado permanentemente.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Alert variant="destructive">
              <AlertDescription>
                ADVERTENCIA: Esta acción eliminará el archivo tanto de la base de datos como del servidor.
              </AlertDescription>
            </Alert>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

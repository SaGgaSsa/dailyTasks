'use client'

import { useState, useRef } from 'react'
import { Plus, Upload, FileIcon } from 'lucide-react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { uploadAttachment } from '@/app/actions/attachment-actions'
import { toast } from 'sonner'

interface UploadAssetDialogProps {
  externalWorkItemId: number
  uploadedById: number
  onSuccess?: () => void
}

export function UploadAssetDialog({
  externalWorkItemId,
  uploadedById,
  onSuccess,
}: UploadAssetDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!fileName) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setFileName(nameWithoutExt)
      }
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFile || !fileName.trim()) {
      setError('Selecciona un archivo y proporciona un nombre')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('externalWorkItemId', String(externalWorkItemId))
      formData.append('uploadedById', String(uploadedById))
      formData.append('name', fileName.trim())

      const result = await uploadAttachment(formData)

      if (result.success) {
        toast.success('Archivo subido correctamente')
        handleClose()
        onSuccess?.()
      } else {
        setError(result.error || 'Error al subir el archivo')
      }
    } catch (err) {
      setError('Error al subir el archivo')
      console.error('Upload error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setSelectedFile(null)
    setFileName('')
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Subir Archivo</DialogTitle>
            <DialogDescription>
              Adjunta un archivo a esta incidencia. Máximo 10MB.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file-name">Nombre del archivo</Label>
              <Input
                id="file-name"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Nombre para mostrar"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="file-input">Archivo</Label>
              <Input
                id="file-input"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="*/*"
                className="cursor-pointer"
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileIcon className="h-4 w-4" />
                  <span>{selectedFile.name}</span>
                  <span className="text-xs">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
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
            <Button type="submit" disabled={isLoading || !selectedFile || !fileName.trim()}>
              {isLoading ? (
                <>
                  <Upload className="h-4 w-4 animate-pulse" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Subir
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

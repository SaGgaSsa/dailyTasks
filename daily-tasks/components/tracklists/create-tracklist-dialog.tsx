'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createTracklist, updateTracklist } from '@/app/actions/tracklists'
import { FormSheet, FormInput, FormTextarea } from '@/components/ui/form-sheet'
import { toast } from 'sonner'

interface TracklistData {
  id: number
  title: string
  description: string | null
  dueDate: Date | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  tracklist?: TracklistData
}

export function CreateTracklistDialog({ open, onOpenChange, tracklist }: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')

  const isEditing = !!tracklist

  useEffect(() => {
    if (open) {
      if (tracklist) {
        setTitle(tracklist.title)
        setDescription(tracklist.description || '')
        setDueDate(tracklist.dueDate ? new Date(tracklist.dueDate).toISOString().split('T')[0] : '')
      } else {
        setTitle('')
        setDescription('')
        setDueDate('')
      }
    }
  }, [open, tracklist])

  const handleSave = async () => {
    if (!title.trim()) return false

    setIsPending(true)

    let result
    if (isEditing) {
      result = await updateTracklist({
        id: tracklist.id,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined
      })
    } else {
      result = await createTracklist({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined
      })
    }

    setIsPending(false)

    if (result.success) {
      toast.success(isEditing ? 'Tracklist actualizado correctamente' : 'Tracklist creado correctamente')
      if (!isEditing && result.data) {
        router.push(`/tracklists/${result.data.id}`)
      }
      return true
    } else {
      toast.error(result.error || 'Error al guardar')
      return false
    }
  }

  const handleClose = () => {
    setTitle('')
    setDescription('')
    setDueDate('')
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Editar Tracklist' : 'Nuevo Tracklist'}
      isEditMode={isEditing}
      isSaving={isPending}
      onSave={handleSave}
      onClose={handleClose}
    >
      <div className="space-y-4">
        <FormInput
          label="Título"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Nombre del tracklist"
          required
        />
        <FormTextarea
          label="Descripción"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Descripción opcional"
        />
        <FormInput
          label="Fecha de Entrega"
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
        />
      </div>
    </FormSheet>
  )
}

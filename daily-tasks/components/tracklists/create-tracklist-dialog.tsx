'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createTracklist, updateTracklist } from '@/app/actions/tracklists'
import { FormSheet, FormInput, FormTextarea } from '@/components/ui/form-sheet'
import { IncidenceQuery } from '@/components/ui/incidence-query'
import { toast } from 'sonner'

interface TracklistExternalWorkItem {
  id: number
  type: string
  externalId: number
  title: string | null
}

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
  externalWorkItems?: TracklistExternalWorkItem[]
}

export function CreateTracklistDialog({ open, onOpenChange, tracklist, externalWorkItems = [] }: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [selectedWorkItems, setSelectedWorkItems] = useState<TracklistExternalWorkItem[]>([])
  const [hasInitialized, setHasInitialized] = useState(false)

  const isEditing = !!tracklist

  useEffect(() => {
    if (open && !hasInitialized) {
      if (tracklist) {
        setTitle(tracklist.title)
        setDescription(tracklist.description || '')
        setDueDate(tracklist.dueDate ? new Date(tracklist.dueDate).toISOString().split('T')[0] : '')
        setSelectedWorkItems(externalWorkItems.map(w => ({ ...w, title: w.title ?? null })))
      } else {
        setTitle('')
        setDescription('')
        setDueDate('')
        setSelectedWorkItems([])
      }
      setHasInitialized(true)
    }

    if (!open) {
      setHasInitialized(false)
    }
  }, [open, tracklist, externalWorkItems, hasInitialized])

  const handleSave = async () => {
    if (!title.trim()) return false

    setIsPending(true)

    let result
    if (isEditing) {
      result = await updateTracklist({
        id: tracklist.id,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        externalWorkItemIds: selectedWorkItems.map(i => i.id)
      })
    } else {
      result = await createTracklist({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        externalWorkItemIds: selectedWorkItems.map(i => i.id)
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
    setSelectedWorkItems([])
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
        <div>
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Trámites
          </label>
          <div className="mt-2">
            <IncidenceQuery
              selectedIncidences={selectedWorkItems}
              onChange={setSelectedWorkItems}
            />
          </div>
        </div>
      </div>
    </FormSheet>
  )
}

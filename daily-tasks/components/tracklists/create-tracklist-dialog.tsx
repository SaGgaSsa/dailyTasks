'use client'

import { useState, useEffect, useRef } from 'react'
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
  color: string | null
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
  lockedWorkItemIds?: number[]
}

export function CreateTracklistDialog({ open, onOpenChange, tracklist, externalWorkItems = [], lockedWorkItemIds }: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [selectedWorkItems, setSelectedWorkItems] = useState<TracklistExternalWorkItem[]>([])
  const [hasInitialized, setHasInitialized] = useState(false)

  const isEditing = !!tracklist
  const initialValues = useRef<{
    title: string
    description: string
    dueDate: string
    workItemIds: number[]
  } | null>(null)

  useEffect(() => {
    if (open && !hasInitialized) {
      if (tracklist) {
        const initTitle = tracklist.title
        const initDescription = tracklist.description || ''
        const initDueDate = tracklist.dueDate ? new Date(tracklist.dueDate).toISOString().split('T')[0] : ''
        const initWorkItems = externalWorkItems.map(w => ({ ...w, title: w.title ?? null }))
        setTitle(initTitle)
        setDescription(initDescription)
        setDueDate(initDueDate)
        setSelectedWorkItems(initWorkItems)
        initialValues.current = {
          title: initTitle,
          description: initDescription,
          dueDate: initDueDate,
          workItemIds: initWorkItems.map(w => w.id).sort()
        }
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
      initialValues.current = null
    }
  }, [open, tracklist, externalWorkItems, hasInitialized])

  const handleSave = async () => {
    if (!title.trim()) return false

    if (isEditing && initialValues.current) {
      const currentWorkItemIds = selectedWorkItems.map(i => i.id).sort()
      const hasChanges =
        title.trim() !== initialValues.current.title ||
        description.trim() !== initialValues.current.description ||
        dueDate !== initialValues.current.dueDate ||
        JSON.stringify(currentWorkItemIds) !== JSON.stringify(initialValues.current.workItemIds)

      if (!hasChanges) return true
    }

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
              lockedIds={lockedWorkItemIds}
            />
          </div>
        </div>
      </div>
    </FormSheet>
  )
}

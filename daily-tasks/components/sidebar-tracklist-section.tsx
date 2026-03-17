'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CreateTracklistDialog } from '@/components/tracklists/create-tracklist-dialog'
import { SidebarTopSection } from '@/components/sidebar-top-section'
import { getTracklists, deleteTracklist, getTracklistExternalWorkItems } from '@/app/actions/tracklists'
import { toast } from 'sonner'

interface Tracklist {
  id: number
  title: string
}

interface TracklistExternalWorkItem {
  id: number
  type: string
  externalId: number
  title: string | null
  color: string | null
}

interface TracklistForEdit {
  id: number
  title: string
  description: string | null
  dueDate: Date | null
}

interface Props {
  isOpen: boolean
  initialTracklists?: { id: number; title: string }[]
}

export function TracklistSidebarSection({ isOpen, initialTracklists = [] }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [tracklists, setTracklists] = useState<Tracklist[]>(initialTracklists)

  useEffect(() => {
    setTracklists(initialTracklists)
  }, [initialTracklists])
  const [createOpen, setCreateOpen] = useState(false)
  const [editingTracklist, setEditingTracklist] = useState<TracklistForEdit | undefined>(undefined)
  const [editWorkItems, setEditWorkItems] = useState<TracklistExternalWorkItem[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const refreshTracklists = () => {
    getTracklists().then((result) => {
      if (result.success && result.data) {
        setTracklists(result.data.map((tl) => ({ id: tl.id, title: tl.title })))
      }
    })
  }

  const handleEdit = async (tl: Tracklist) => {
    const result = await getTracklistExternalWorkItems(tl.id)
    const workItems = result.success && result.data ? result.data.map((w) => ({ ...w, title: w.title ?? null })) : []
    const details = result.tracklistDetails
    setEditingTracklist({
      id: tl.id,
      title: tl.title,
      description: details?.description ?? null,
      dueDate: details?.dueDate ?? null,
    })
    setEditWorkItems(workItems)
    setEditOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    setIsDeleting(true)
    const result = await deleteTracklist(deleteTargetId)
    setIsDeleting(false)
    setDeleteOpen(false)

    if (result.success) {
      toast.success('Tracklist eliminado')
      refreshTracklists()
      if (pathname.includes(`/tracklists/${deleteTargetId}`)) {
        router.push('/tracklists')
      }
    } else {
      toast.error(result.error || 'Error al eliminar')
    }
    setDeleteTargetId(null)
  }

  return (
    <>
      <SidebarTopSection
        isOpen={isOpen}
        label="Tracklists"
        href="/tracklists"
        icon={ClipboardList}
        isActive={pathname.startsWith('/tracklists')}
        showAddButton
        onAdd={() => setCreateOpen(true)}
        childrenItems={tracklists.map((tl) => ({
          id: tl.id,
          label: tl.title,
          href: `/tracklists/${tl.id}`,
          isActive: pathname === `/tracklists/${tl.id}`,
        }))}
        onEditChild={(childId) => {
          const tracklist = tracklists.find((tl) => tl.id === childId)
          if (tracklist) {
            void handleEdit(tracklist)
          }
        }}
        onDeleteChild={(childId) => {
          setDeleteTargetId(Number(childId))
          setDeleteOpen(true)
        }}
      />

      <CreateTracklistDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) refreshTracklists()
        }}
      />

      <CreateTracklistDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) {
            setEditingTracklist(undefined)
            setEditWorkItems([])
            refreshTracklists()
          }
        }}
        tracklist={editingTracklist}
        externalWorkItems={editWorkItems}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tracklist?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el tracklist y todos sus tickets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

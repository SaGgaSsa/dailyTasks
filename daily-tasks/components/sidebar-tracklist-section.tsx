'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, Plus, EllipsisVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
    const workItems = result.success && result.data ? result.data.map(w => ({ ...w, title: null as string | null })) : []
    setEditingTracklist({ id: tl.id, title: tl.title, description: null, dueDate: null })
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

  if (!isOpen) {
    return (
      <div className="flex justify-center px-0">
        <Link href="/tracklists">
          <Button
            variant="ghost"
            className={`w-full justify-center px-0 transition-colors ${
              pathname.startsWith('/tracklists')
                ? 'bg-sidebar-accent text-sidebar-foreground'
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2">
        <Link
          href="/tracklists"
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50"
        >
          <ClipboardList className="h-3 w-3" />
          Tracklists
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-0.5 px-2">
        {tracklists.map((tl) => {
          const isActive = pathname === `/tracklists/${tl.id}`
          return (
            <div
              key={tl.id}
              className="group flex items-center gap-1 px-2 rounded-md hover:bg-sidebar-accent/50"
            >
              <Link
                href={`/tracklists/${tl.id}`}
                className={`flex-1 truncate text-sm py-1 ${
                  isActive
                    ? 'text-sidebar-foreground font-medium'
                    : 'text-sidebar-foreground/70'
                }`}
              >
                {tl.title}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                  >
                    <EllipsisVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleEdit(tl)}>Editar</DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => {
                      setDeleteTargetId(tl.id)
                      setDeleteOpen(true)
                    }}
                  >
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        })}
      </div>

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

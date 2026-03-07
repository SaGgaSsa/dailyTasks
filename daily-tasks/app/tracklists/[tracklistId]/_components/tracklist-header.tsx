'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem 
} from '@/components/ui/select'
import { PlusIcon, PencilIcon, ListTodo, LayoutDashboard } from 'lucide-react'
import { CreateTracklistDialog } from '@/components/tracklists/create-tracklist-dialog'
import { CreateTicketDialog } from '@/components/tracklists/create-ticket-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssignableUser } from '@/app/actions/user-actions'

interface TracklistIncidence {
  id: number
  type: string
  externalId: number
  title: string
}

interface TracklistData {
  id: number
  title: string
  description: string | null
  dueDate: Date | null
  incidences: TracklistIncidence[]
}

interface Props {
  tracklists: { id: number; title: string }[]
  currentId: number
  assignableUsers: AssignableUser[]
  currentTracklist?: TracklistData
  incidences: TracklistIncidence[]
  view: 'list' | 'kanban'
  onViewChange: (v: 'list' | 'kanban') => void
}

export function TracklistHeader({ tracklists, currentId, assignableUsers, currentTracklist, incidences, view, onViewChange }: Props) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)

  const handleValueChange = (value: string) => {
    if (value === 'new') {
      setIsEditMode(false)
      setIsDialogOpen(true)
    } else {
      router.push(`/tracklists/${value}`)
    }
  }

  const handleEdit = () => {
    setIsEditMode(true)
    setIsDialogOpen(true)
  }

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <Select 
            value={currentId.toString()} 
            onValueChange={handleValueChange}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Seleccionar Tracklist" />
            </SelectTrigger>
            <SelectContent side="bottom">
              {tracklists.map(tracklist => (
                <SelectItem key={tracklist.id} value={tracklist.id.toString()}>
                  {tracklist.title}
                </SelectItem>
              ))}
              <SelectItem value="new" className="font-medium">
                <PlusIcon className="w-4 h-4 mr-2 inline" />
                Nuevo Tracklist
              </SelectItem>
            </SelectContent>
          </Select>
          {currentTracklist && (
            <Button variant="ghost" size="icon" onClick={handleEdit}>
              <PencilIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 w-8 p-0"
            onClick={() => setIsTicketDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Tabs value={view} onValueChange={(v) => onViewChange(v as 'list' | 'kanban')}>
            <TabsList className="bg-muted border border-border h-8">
              <TabsTrigger value="list" className="data-[state=active]:bg-accent px-3">
                <ListTodo className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="kanban" className="data-[state=active]:bg-accent px-3">
                <LayoutDashboard className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      <CreateTracklistDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        tracklist={isEditMode && currentTracklist ? currentTracklist : undefined}
        incidences={incidences}
      />
      <CreateTicketDialog 
        tracklistId={currentId}
        assignableUsers={assignableUsers}
        open={isTicketDialogOpen} 
        onOpenChange={setIsTicketDialogOpen} 
      />
    </>
  )
}

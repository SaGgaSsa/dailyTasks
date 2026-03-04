'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem 
} from '@/components/ui/select'
import { PlusIcon, PencilIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateTracklistDialog } from '@/components/tracklists/create-tracklist-dialog'

interface Props {
  tracklists: { id: number; title: string }[]
  currentId: number
}

export function TracklistSelector({ tracklists, currentId }: Props) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const current = tracklists.find(t => t.id === currentId)

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
        {current && (
          <Button variant="ghost" size="icon" onClick={handleEdit}>
            <PencilIcon className="w-4 h-4" />
          </Button>
        )}
      </div>
      <CreateTracklistDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        tracklist={isEditMode && current ? { id: current.id, title: current.title, description: null, dueDate: null } : undefined}
      />
    </>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem 
} from '@/components/ui/select'
import { PlusIcon } from 'lucide-react'
import { CreateTracklistDialog } from '@/components/tracklists/create-tracklist-dialog'
import { CreateTicketDialog } from '@/components/tracklists/create-ticket-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface Props {
  tracklists: { id: number; title: string }[]
  currentId: number
}

export function TracklistHeader({ tracklists, currentId }: Props) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)

  const handleValueChange = (value: string) => {
    if (value === 'new') {
      setIsDialogOpen(true)
    } else {
      router.push(`/tracklists/${value}`)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
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
        <Button 
          className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 w-8 p-0"
          onClick={() => setIsTicketDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <CreateTracklistDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
      />
      <CreateTicketDialog 
        tracklistId={currentId}
        open={isTicketDialogOpen} 
        onOpenChange={setIsTicketDialogOpen} 
      />
    </>
  )
}

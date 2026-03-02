'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem 
} from '@/components/ui/select'
import { PlusIcon } from 'lucide-react'
import { CreateTracklistDialog } from '@/components/tracklists/create-tracklist-dialog'

interface Props {
  tracklists: { id: number; title: string }[]
  currentId: number
}

export function TracklistSelector({ tracklists, currentId }: Props) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const current = tracklists.find(t => t.id === currentId)

  const handleValueChange = (value: string) => {
    if (value === 'new') {
      setIsDialogOpen(true)
    } else {
      router.push(`/dashboard/tracklists/${value}`)
    }
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
      </div>
      <CreateTracklistDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
      />
    </>
  )
}

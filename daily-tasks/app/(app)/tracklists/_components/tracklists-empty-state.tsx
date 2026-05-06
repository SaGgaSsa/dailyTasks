'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import { CreateTracklistDialog } from '@/components/tracklists/create-tracklist-dialog'

export function TracklistsEmptyState() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <h2 className="text-2xl font-semibold">No hay tracklists</h2>
      <p className="text-muted-foreground">
        Crea tu primer tracklist para comenzar
      </p>
      <Button onClick={() => setIsDialogOpen(true)}>
        <PlusIcon className="w-4 h-4 mr-2" />
        Crear Primer Tracklist
      </Button>
      <CreateTracklistDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  )
}

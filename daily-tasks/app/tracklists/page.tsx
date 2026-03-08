import { ClipboardList } from 'lucide-react'

export default function TracklistsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
      <ClipboardList className="h-10 w-10 opacity-30" />
      <p className="text-sm">Selecciona o crea un Tracklist desde el menú lateral</p>
    </div>
  )
}

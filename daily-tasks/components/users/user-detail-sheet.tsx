'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Copy,
  ExternalLink,
  Mail,
  Calendar,
  Shield,
  AlertTriangle,
  Hash,
  Clock,
  CheckCircle2,
  Circle,
  ChevronDown,
} from 'lucide-react'
import { getUserDetails } from '@/app/actions/user-actions'
import { toast } from 'sonner'
import { TaskStatus } from '@/types/enums'

interface UserDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: number | null
}

interface UserDetails {
  id: number
  email: string
  name: string | null
  username: string | null
  role: string
  createdAt: Date
  updatedAt: Date
  metrics: {
    totalTasks: number
    pendingTasks: number
    completedTasks: number
  }
  recentIncidences: Array<{
    id: number
    title: string
    status: string
    priority: string
    type: string
    externalId: number
    updatedAt: Date
  }>
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function copyToClipboard(text: string | number, label: string) {
  navigator.clipboard.writeText(String(text))
  toast.success(`${label} copiado al portapapeles`)
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'DONE':
      return 'text-green-400'
    case 'IN_PROGRESS':
      return 'text-blue-400'
    case 'REVIEW':
      return 'text-yellow-400'
    case 'TODO':
      return 'text-gray-400'
    default:
      return 'text-zinc-400'
  }
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const colors: Record<string, string> = {
    BACKLOG: 'bg-zinc-700 text-zinc-300',
    TODO: 'bg-gray-600 text-gray-200',
    IN_PROGRESS: 'bg-blue-600 text-blue-100',
    REVIEW: 'bg-yellow-600 text-yellow-100',
    DONE: 'bg-green-600 text-green-100',
  }
  const colorClass = colors[status] || 'bg-zinc-700 text-zinc-300'

  const labels: Record<string, string> = {
    BACKLOG: 'Backlog',
    TODO: 'Por Hacer',
    IN_PROGRESS: 'En Progreso',
    REVIEW: 'En Revisión',
    DONE: 'Completada',
  }

  return (
    <Badge variant="secondary" className={`${colorClass} border-none`}>
      {labels[status] || status}
    </Badge>
  )
}

export function UserDetailSheet({
  open,
  onOpenChange,
  userId,
}: UserDetailSheetProps) {
  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState<UserDetails | null>(null)
  const [isDebugOpen, setIsDebugOpen] = useState(false)

  useEffect(() => {
    if (open && userId) {
      loadUserDetails()
    } else {
      setDetails(null)
    }
  }, [open, userId])

  const loadUserDetails = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const data = await getUserDetails(userId)
      setDetails(data)
    } catch (error) {
      toast.error('Error al cargar los detalles del usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  if (!userId) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showCloseButton={false}
        className="w-full sm:min-w-[45vw] sm:max-w-[50vw] bg-[#191919] border-zinc-800 overflow-y-auto"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Detalles del usuario</SheetTitle>
          <SheetDescription>Información detallada del colaborador</SheetDescription>
        </SheetHeader>
        
        <SheetHeader className="space-y-2 pb-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            {loading ? (
              <div className="h-6 w-48 rounded bg-zinc-800 animate-pulse" />
            ) : details ? (
              <SheetTitle className="text-zinc-100 pt-1">
                {details.name || 'Sin nombre'}
              </SheetTitle>
            ) : (
              <SheetTitle className="text-zinc-100">Usuario no encontrado</SheetTitle>
            )}
            <div className="flex items-center gap-2 pt-1">
              {loading && (
                <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-col space-y-4 py-6 pl-8">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : details ? (
            <>

              <Separator className="bg-zinc-800" />

              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Hash className="h-3 w-3" />
                  Metadatos
                </h3>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                    <span className="text-zinc-500 text-xs">ID de Usuario</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-zinc-400 font-mono">
                        {details.id}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(details.id, 'ID')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                    <span className="text-zinc-500 text-xs">Fecha de Creación</span>
                    <span className="flex items-center gap-2 text-zinc-300">
                      <Calendar className="h-3 w-3 text-zinc-500" />
                      {formatDate(details.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                    <span className="text-zinc-500 text-xs">Última Actualización</span>
                    <span className="flex items-center gap-2 text-zinc-300">
                      <Clock className="h-3 w-3 text-zinc-500" />
                      {formatDate(details.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Shield className="h-3 w-3" />
                  Métricas
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center p-3 rounded-lg bg-zinc-900/50">
                    <span className="text-xl font-bold text-zinc-200">
                      {details.metrics.totalTasks}
                    </span>
                    <span className="text-[10px] text-zinc-500 text-center">
                      Totales
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-lg bg-zinc-900/50">
                    <span className="text-xl font-bold text-yellow-400">
                      {details.metrics.pendingTasks}
                    </span>
                    <span className="text-[10px] text-zinc-500 text-center">
                      Pendientes
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-lg bg-zinc-900/50">
                    <span className="text-xl font-bold text-green-400">
                      {details.metrics.completedTasks}
                    </span>
                    <span className="text-[10px] text-zinc-500 text-center">
                      Completadas
                    </span>
                  </div>
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <ExternalLink className="h-3 w-3" />
                  Actividad Reciente
                </h3>
                {details.recentIncidences.length > 0 ? (
                  <div className="space-y-2">
                    {details.recentIncidences.map((incidence) => (
                      <div
                        key={incidence.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {incidence.status === 'DONE' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                          ) : (
                            <Circle
                              className={`h-4 w-4 flex-shrink-0 ${getStatusColor(incidence.status)}`}
                            />
                          )}
                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {incidence.type}-{incidence.externalId}
                              </span>
                              <StatusBadge status={incidence.status as TaskStatus} />
                            </div>
                            <p className="text-sm text-zinc-300 truncate">{incidence.title}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-zinc-500 text-sm">
                    No hay incidencias asignadas
                  </div>
                )}
              </div>

              <Separator className="bg-zinc-800" />

              <details className="group" open={isDebugOpen}>
                <summary
                  className="list-none cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault()
                    setIsDebugOpen(!isDebugOpen)
                  }}
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-between text-red-400 hover:text-red-400 hover:bg-red-950/50"
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Debug
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isDebugOpen ? 'rotate-180' : ''}`}
                    />
                  </Button>
                </summary>
                <div className="mt-2 rounded-lg bg-zinc-950 p-4 overflow-auto max-h-[300px]">
                  <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(details, null, 2)}
                  </pre>
                </div>
              </details>
            </>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-zinc-500">Usuario no encontrado</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

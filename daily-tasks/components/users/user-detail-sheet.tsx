'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ChevronDown,
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
      console.error('Error loading user details:', error)
      toast.error('Error al cargar los detalles del usuario')
    } finally {
      setLoading(false)
    }
  }

  if (!userId) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : details ? (
          <>
            <SheetHeader className="space-y-4">
              <div className="flex items-center gap-4">
                <UserAvatar username={details.username} size="lg" className="h-16 w-16" />
                <div>
                  <SheetTitle className="text-xl">
                    {details.name || 'Sin nombre'}
                  </SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-1">
                    <span>@{details.username}</span>
                    <Badge
                      variant={details.role === 'ADMIN' ? 'default' : 'secondary'}
                    >
                      {details.role}
                    </Badge>
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px]">{details.email}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(details.email, 'Email')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Metadatos del Sistema
                </h3>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex flex-col gap-1 p-3 rounded-lg bg-zinc-900/50">
                    <span className="text-xs text-muted-foreground">ID de Usuario</span>
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
                  <div className="flex flex-col gap-1 p-3 rounded-lg bg-zinc-900/50">
                    <span className="text-xs text-muted-foreground">
                      Fecha de Creación
                    </span>
                    <span className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatDate(details.createdAt)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-3 rounded-lg bg-zinc-900/50">
                    <span className="text-xs text-muted-foreground">
                      Última Actualización
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {formatDate(details.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Métricas de Trabajo
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center p-4 rounded-lg bg-zinc-900/50">
                    <span className="text-2xl font-bold">
                      {details.metrics.totalTasks}
                    </span>
                    <span className="text-xs text-muted-foreground text-center">
                      Tareas Totales
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-4 rounded-lg bg-zinc-900/50">
                    <span className="text-2xl font-bold text-yellow-400">
                      {details.metrics.pendingTasks}
                    </span>
                    <span className="text-xs text-muted-foreground text-center">
                      Pendientes
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-4 rounded-lg bg-zinc-900/50">
                    <span className="text-2xl font-bold text-green-400">
                      {details.metrics.completedTasks}
                    </span>
                    <span className="text-xs text-muted-foreground text-center">
                      Completadas
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
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
                              className={`h-4 w-4 flex-shrink-0 ${getStatusColor(
                                incidence.status
                              )}`}
                            />
                          )}
                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-mono">
                                {incidence.type}-{incidence.externalId}
                              </span>
                              <StatusBadge
                                status={incidence.status as TaskStatus}
                              />
                            </div>
                            <p className="text-sm truncate">{incidence.title}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No hay incidencias asignadas
                  </div>
                )}
              </div>

              <Separator />

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
                      Zona de Peligro (Debug)
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        isDebugOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </Button>
                </summary>
                <div className="mt-2 rounded-lg bg-zinc-950 p-4 overflow-auto max-h-[400px]">
                  <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(details, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Usuario no encontrado</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

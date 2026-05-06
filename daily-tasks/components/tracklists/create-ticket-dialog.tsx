'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from 'react'
import { createTicket, updateTicket, getTicketFormData, clearTicketUnreadUpdates, getTicketById } from '@/app/actions/tracklists'
import { getEnvironmentAvailability, type EnvironmentAvailabilityItem } from '@/app/actions/environment-log'
import { rejectTicket } from '@/app/actions/incidence-actions'
import { AssignableUser } from '@/app/actions/user-actions'
import { TicketQAWithDetails } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { toast } from 'sonner'
import { Check, ChevronDown, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IncidenceBadge } from '@/components/ui/incidence-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { Observation } from '@/components/tracklists/observation'
import { TicketType, Priority } from '@/types/enums'
import { PRIORITY_OPTIONS } from '@/lib/ticket-sort'

const TIPO_TICKET = [
  { value: TicketType.BUG, label: 'Bug' },
  { value: TicketType.CAMBIO, label: 'Cambio' },
  { value: TicketType.CONSULTA, label: 'Consulta' }
]

interface TechWithModules {
  id: number
  name: string
  modules: { id: number; name: string; technologyId: number }[]
}

interface DefaultModule {
  techId: number
  module: { id: number; name: string }
}

interface ExternalWorkItem {
  id: number
  type: string
  externalId: number
  color: string | null
}

interface Props {
  tracklistId: number
  assignableUsers: AssignableUser[]
  open: boolean
  onOpenChange: (open: boolean) => void
  rejectMode?: TicketQAWithDetails
  editMode?: TicketQAWithDetails
  viewMode?: TicketQAWithDetails
}

export function CreateTicketDialog({ tracklistId, assignableUsers, open, onOpenChange, rejectMode, editMode, viewMode }: Props) {
  const [isPending, setIsPending] = useState(false)
  const [resolvedViewMode, setResolvedViewMode] = useState<TicketQAWithDetails | null>(null)
  const [type, setType] = useState<TicketType>(TicketType.BUG)
  const [description, setDescription] = useState('')
  const [observations, setObservations] = useState('')

  const [techs, setTechs] = useState<TechWithModules[]>([])
  const [defaultModules, setDefaultModules] = useState<DefaultModule[]>([])
  const [selectedTech, setSelectedTech] = useState<TechWithModules | null>(null)
  const [selectedModule, setSelectedModule] = useState<{ id: number; name: string } | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<Priority>(Priority.MEDIUM)
  const [selectedAssignee, setSelectedAssignee] = useState<AssignableUser | null>(null)

  const [techOpen, setTechOpen] = useState(false)
  const [moduleOpen, setModuleOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const [workItemOpen, setWorkItemOpen] = useState(false)
  const [selectedWorkItem, setSelectedWorkItem] = useState<ExternalWorkItem | null>(null)
  const [workItemsList, setWorkItemsList] = useState<ExternalWorkItem[]>([])
  const [environmentAvailability, setEnvironmentAvailability] = useState<EnvironmentAvailabilityItem[]>([])

  const effectiveViewMode = resolvedViewMode ?? viewMode ?? null

  useEffect(() => {
    if (!open || rejectMode || viewMode) {
      return
    }

    async function loadData() {
      const result = await getTicketFormData(tracklistId)
      if (!result.success) {
        console.error(result.error)
        return
      }
      const formData = result.data!

      setTechs(formData.techs)
      setDefaultModules(formData.defaultModules.map(dm => ({
        techId: dm.techId,
        module: { id: dm.module.id, name: dm.module.name }
      })))

      setWorkItemsList(formData.externalWorkItems ?? [])

      if (editMode) {
        const matchingTech = formData.techs.find(t => t.modules.some(m => m.id === editMode.module.id)) || null
        setSelectedTech(matchingTech)
        setSelectedModule({ id: editMode.module.id, name: editMode.module.name })
      } else if (formData.defaultTech) {
        const defaultTechWithModules = formData.techs.find(t => t.id === formData.defaultTech!.id) || null
        setSelectedTech(defaultTechWithModules)
        const defaultForTech = formData.defaultModules.find(dm => dm.techId === formData.defaultTech!.id)
        if (defaultForTech) {
          setSelectedModule({ id: defaultForTech.module.id, name: defaultForTech.module.name })
        }
      }
    }
    void loadData()
  }, [open, rejectMode, editMode, tracklistId, viewMode])

  useEffect(() => {
    if (!open || !viewMode) return

    let isActive = true

    const loadTicket = async () => {
      const result = await getTicketById(viewMode.id)
      if (!isActive || !result.success || !result.data) {
        return
      }

      setResolvedViewMode(result.data)
    }

    void loadTicket()

    return () => {
      isActive = false
    }
  }, [open, viewMode])

  useEffect(() => {
    if (!rejectMode) return
    setType(rejectMode.type as TicketType)
    setSelectedTech({ id: -1, name: rejectMode.module.technology.name, modules: [] })
    setSelectedModule({ id: rejectMode.module.id, name: rejectMode.module.name })
    setSelectedPriority(rejectMode.priority as Priority)
    setSelectedAssignee(rejectMode.assignedTo
      ? assignableUsers.find(u => u.id === rejectMode.assignedTo!.id) ?? null
      : null)
    setSelectedWorkItem(rejectMode.externalWorkItem ?? null)
    setDescription('')
    setObservations('')
  }, [assignableUsers, rejectMode])

  useEffect(() => {
    if (!effectiveViewMode) return
    setType(effectiveViewMode.type as TicketType)
    setSelectedTech({ id: -1, name: effectiveViewMode.module.technology.name, modules: [] })
    setSelectedModule({ id: effectiveViewMode.module.id, name: effectiveViewMode.module.name })
    setSelectedPriority(effectiveViewMode.priority as Priority)
    setSelectedAssignee(effectiveViewMode.assignedTo
      ? assignableUsers.find(u => u.id === effectiveViewMode.assignedTo!.id) ?? null
      : null)
    setSelectedWorkItem(effectiveViewMode.externalWorkItem ?? null)
    setDescription(effectiveViewMode.latestQaTask?.title ?? effectiveViewMode.description)
    setObservations(effectiveViewMode.latestQaTask?.description ?? effectiveViewMode.observations ?? '')
  }, [assignableUsers, effectiveViewMode])

  useEffect(() => {
    const ticket = effectiveViewMode || editMode
    if (open && ticket?.hasUnreadUpdates) {
      clearTicketUnreadUpdates(ticket.id, ticket.tracklistId)
    }
  }, [open, effectiveViewMode, editMode])

  useEffect(() => {
    if (!open || !effectiveViewMode) {
      setEnvironmentAvailability([])
      return
    }

    let isActive = true

    const loadAvailability = async () => {
      const result = await getEnvironmentAvailability({ ticketId: effectiveViewMode.id })
      if (!isActive) return
      setEnvironmentAvailability(result.success ? result.data ?? [] : [])
    }

    void loadAvailability()

    return () => {
      isActive = false
    }
  }, [effectiveViewMode, open])

  useEffect(() => {
    if (!editMode) return
    setType(editMode.type as TicketType)
    setSelectedPriority(editMode.priority as Priority)
    setSelectedAssignee(editMode.assignedTo
      ? assignableUsers.find(u => u.id === editMode.assignedTo!.id) ?? null
      : null)
    setSelectedWorkItem(editMode.externalWorkItem ?? null)
    setDescription(editMode.description)
    setObservations(editMode.observations ?? '')
  }, [assignableUsers, editMode])

  useEffect(() => {
    if (rejectMode || viewMode) return
    if (!selectedTech) return
    // Don't override the module if it already belongs to the selected tech
    if (selectedModule && selectedTech.modules.some(m => m.id === selectedModule.id)) return
    const defaultForTech = defaultModules.find(dm => dm.techId === selectedTech.id)
    if (defaultForTech) {
      setSelectedModule(defaultForTech.module)
    } else {
      setSelectedModule(null)
    }
  }, [defaultModules, rejectMode, selectedModule, selectedTech, viewMode])

  const filteredModules = selectedTech
    ? selectedTech.modules
    : []

  const handleSubmit = async () => {
    if (!description.trim() || description.trim().length < 3) return

    setIsPending(true)
    if (rejectMode) {
      const result = await rejectTicket({
        ticketId: rejectMode.id,
        description: description.trim(),
        observations: observations.trim() || undefined,
        tracklistId,
      })
      setIsPending(false)
      if (result.success) {
        toast.success('Ticket rechazado. Se creó una tarea para el DEV.')
        handleClose()
      } else {
        toast.error(result.error || 'Error al rechazar el ticket')
      }
    } else if (editMode) {
      const result = await updateTicket(editMode.id, tracklistId, {
        type,
        moduleId: selectedModule?.id || 0,
        description: description.trim(),
        priority: selectedPriority,
        observations: observations.trim() || undefined,
        assignedToId: selectedAssignee?.id,
        externalWorkItemId: selectedWorkItem?.id
      })
      setIsPending(false)
      if (result.success) {
        toast.success('Ticket actualizado correctamente')
        handleClose()
      } else {
        toast.error(result.error || 'Error al actualizar el ticket')
      }
    } else {
      const result = await createTicket(tracklistId, {
        type,
        moduleId: selectedModule?.id || 0,
        description: description.trim(),
        priority: selectedPriority,
        observations: observations.trim() || undefined,
        assignedToId: selectedAssignee?.id,
        externalWorkItemId: selectedWorkItem?.id
      })
      setIsPending(false)
      if (result.success) {
        toast.success('Ticket creado correctamente')
        handleClose()
      } else {
        toast.error(result.error || 'Error al crear ticket')
      }
    }
  }

  const handleClose = () => {
    setType(TicketType.BUG)
    setDescription('')
    setObservations('')
    setSelectedPriority(Priority.MEDIUM)
    setSelectedAssignee(null)
    setSelectedWorkItem(null)
    setWorkItemsList([])
    onOpenChange(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setType(TicketType.BUG)
      setDescription('')
      setObservations('')
      setSelectedPriority(Priority.MEDIUM)
      setSelectedAssignee(null)
      setSelectedWorkItem(null)
      setWorkItemsList([])
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[900px]"
        onInteractOutside={(e) => { if (!effectiveViewMode) e.preventDefault() }}
      >
        <DialogHeader>
          <DialogTitle>
            {effectiveViewMode ? `Ticket #${effectiveViewMode.ticketNumber}` : rejectMode ? rejectMode.description : editMode ? `Editar Ticket #${editMode.ticketNumber}` : 'Nuevo Ticket'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={rejectMode ? 'Descripción del problema' : 'Descripción'}
              disabled={!!effectiveViewMode}
            />
          </div>
          <div className="space-y-2">
            <Observation
              value={observations}
              onChange={setObservations}
              placeholder={rejectMode ? 'Observación del rechazo (opcional)' : 'Observación'}
              disabled={!!effectiveViewMode}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Popover open={typeOpen} onOpenChange={setTypeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-dashed w-[100px]"
                  disabled={!!rejectMode || !!effectiveViewMode}
                >
                  <span className="text-xs">{type}</span>
                  {!rejectMode && !effectiveViewMode && <ChevronDown className="ml-1 h-3 w-3 opacity-50" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[140px] p-0" align="start">
                <Command>
                  <CommandGroup>
                    {TIPO_TICKET.map((t) => (
                      <CommandItem
                        key={t.value}
                        value={t.label}
                        onSelect={() => {
                          setType(t.value)
                          setTypeOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            type === t.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {t.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <Popover open={techOpen} onOpenChange={setTechOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-dashed"
                  disabled={!!rejectMode || !!effectiveViewMode}
                >
                  {selectedTech ? (
                    <span className="text-xs">{selectedTech.name}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">+ Tecnología</span>
                  )}
                  {!rejectMode && !effectiveViewMode && <ChevronDown className="ml-1 h-3 w-3 opacity-50" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar tecnología..." />
                  <CommandEmpty>No encontrada.</CommandEmpty>
                  <CommandGroup>
                    {techs.map((tech) => (
                      <CommandItem
                        key={tech.id}
                        value={tech.name}
                        onSelect={() => {
                          setSelectedTech(tech)
                          setTechOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedTech?.id === tech.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {tech.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <Popover open={moduleOpen} onOpenChange={setModuleOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-dashed"
                  disabled={!selectedTech || !!rejectMode || !!effectiveViewMode}
                >
                  {selectedModule ? (
                    <span className="text-xs">{selectedModule.name}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">+ Módulo</span>
                  )}
                  {!rejectMode && !effectiveViewMode && <ChevronDown className="ml-1 h-3 w-3 opacity-50" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar módulo..." />
                  <CommandEmpty>No encontrado.</CommandEmpty>
                  <CommandGroup>
                    {filteredModules.map((mod) => (
                      <CommandItem
                        key={mod.id}
                        value={mod.name}
                        onSelect={() => {
                          setSelectedModule({ id: mod.id, name: mod.name })
                          setModuleOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedModule?.id === mod.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {mod.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-dashed"
                  disabled={!!rejectMode || !!effectiveViewMode}
                >
                  <PriorityBadge priority={selectedPriority} className="text-xs" />
                  {!rejectMode && !effectiveViewMode && <ChevronDown className="ml-1 h-3 w-3 opacity-50" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandGroup>
                    {PRIORITY_OPTIONS.map((priority) => (
                      <CommandItem
                        key={priority.value}
                        value={priority.label}
                        onSelect={() => {
                          setSelectedPriority(priority.value)
                          setPriorityOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedPriority === priority.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <PriorityBadge priority={priority.value} className="text-xs" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-dashed"
                  disabled={!!rejectMode || !!effectiveViewMode}
                >
                  {selectedAssignee ? (
                    <>
                      <User className="mr-1 h-3 w-3" />
                      <span className="text-xs">{selectedAssignee.username}</span>
                    </>
                  ) : (
                    <User className="mr-1 h-3 w-3 text-muted-foreground" />
                  )}
                  {!rejectMode && !effectiveViewMode && <ChevronDown className="ml-1 h-3 w-3 opacity-50" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar usuario..." />
                  <CommandEmpty>No encontrado.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setSelectedAssignee(null)
                        setAssigneeOpen(false)
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Sin asignar
                    </CommandItem>
                    {assignableUsers.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.username}
                        onSelect={() => {
                          setSelectedAssignee(user)
                          setAssigneeOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedAssignee?.id === user.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {user.username}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <Popover open={workItemOpen} onOpenChange={setWorkItemOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-dashed"
                  disabled={!!rejectMode || !!effectiveViewMode}
                >
                  {selectedWorkItem ? (
                    <IncidenceBadge type={selectedWorkItem.type} color={selectedWorkItem.color} externalId={selectedWorkItem.externalId} className="text-xs" />
                  ) : (
                    <span className="text-xs text-muted-foreground">+ Trámite</span>
                  )}
                  {!rejectMode && !effectiveViewMode && <ChevronDown className="ml-1 h-3 w-3 opacity-50" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Filtrar trámite..." />
                  {workItemsList.length === 0 ? (
                    <CommandEmpty>No hay trámites en este Tracklist</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setSelectedWorkItem(null)
                          setWorkItemOpen(false)
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Sin trámite
                      </CommandItem>
                      {workItemsList.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={`${item.type} ${item.externalId}`}
                          onSelect={() => {
                            setSelectedWorkItem(item)
                            setWorkItemOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedWorkItem?.id === item.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <IncidenceBadge type={item.type} color={item.color} externalId={item.externalId} className="text-xs" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {effectiveViewMode && environmentAvailability.length > 0 ? (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="text-sm font-medium">Disponibilidad por ambiente</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {environmentAvailability.map((environment) => (
                  <div key={environment.environmentId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{environment.environmentName}</span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-xs font-medium',
                        environment.isAvailable
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                          : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-500'
                      )}
                    >
                      {environment.isAvailable ? 'Disponible' : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          {effectiveViewMode ? (
            <Button variant="outline" onClick={handleClose}>Cerrar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                variant={rejectMode ? 'destructive' : 'default'}
                onClick={handleSubmit}
                disabled={!description.trim() || description.trim().length < 3 || isPending}
              >
                {isPending
                  ? (rejectMode ? 'Rechazando...' : 'Guardando...')
                  : (rejectMode ? 'Rechazar' : editMode ? 'Guardar' : 'Agregar')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

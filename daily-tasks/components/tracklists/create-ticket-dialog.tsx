'use client'

import { useState, useEffect } from 'react'
import { createTicket, updateTicket, getTicketFormData } from '@/app/actions/tracklists'
import { rejectTicket } from '@/app/actions/incidence-actions'
import { AssignableUser } from '@/app/actions/user-actions'
import { TicketQAWithDetails } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

  useEffect(() => {
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
      } else if (!selectedTech && formData.defaultTech) {
        const defaultTechWithModules = formData.techs.find(t => t.id === formData.defaultTech!.id) || null
        setSelectedTech(defaultTechWithModules)
        const defaultForTech = formData.defaultModules.find(dm => dm.techId === formData.defaultTech!.id)
        if (defaultForTech) {
          setSelectedModule({ id: defaultForTech.module.id, name: defaultForTech.module.name })
        }
      }
    }
    if (open && !rejectMode && !viewMode) {
      loadData()
    }
  }, [open, rejectMode, editMode, viewMode])

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
  }, [rejectMode])

  useEffect(() => {
    if (!viewMode) return
    setType(viewMode.type as TicketType)
    setSelectedTech({ id: -1, name: viewMode.module.technology.name, modules: [] })
    setSelectedModule({ id: viewMode.module.id, name: viewMode.module.name })
    setSelectedPriority(viewMode.priority as Priority)
    setSelectedAssignee(viewMode.assignedTo
      ? assignableUsers.find(u => u.id === viewMode.assignedTo!.id) ?? null
      : null)
    setSelectedWorkItem(viewMode.externalWorkItem ?? null)
    setDescription(viewMode.description)
    setObservations(viewMode.observations ?? '')
  }, [viewMode])

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
  }, [editMode])

  useEffect(() => {
    if (rejectMode) return
    if (!selectedTech) return
    // Don't override the module if it already belongs to the selected tech
    if (selectedModule && selectedTech.modules.some(m => m.id === selectedModule.id)) return
    const defaultForTech = defaultModules.find(dm => dm.techId === selectedTech.id)
    if (defaultForTech) {
      setSelectedModule(defaultForTech.module)
    } else {
      setSelectedModule(null)
    }
  }, [selectedTech, defaultModules, rejectMode])

  const filteredModules = selectedTech
    ? selectedTech.modules
    : []

  const handleSubmit = async () => {
    if (!description.trim() || description.trim().length < 3) return

    setIsPending(true)
    if (rejectMode) {
      const result = await rejectTicket(rejectMode.id, description.trim(), tracklistId)
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
        onInteractOutside={(e) => { if (!viewMode) e.preventDefault() }}
      >
        <DialogHeader>
          <DialogTitle>
            {viewMode ? `Ticket #${viewMode.ticketNumber}` : rejectMode ? rejectMode.description : editMode ? `Editar Ticket #${editMode.ticketNumber}` : 'Nuevo Ticket'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={rejectMode ? 'Descripción del problema' : 'Descripción'}
              disabled={!!viewMode}
            />
          </div>
          {!rejectMode && (
            <div className="space-y-2">
              <Textarea
                value={observations}
                onChange={e => setObservations(e.target.value)}
                placeholder="Observación"
                rows={4}
                disabled={!!viewMode}
              />
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Popover open={typeOpen} onOpenChange={setTypeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-dashed w-[100px]"
                  disabled={!!rejectMode || !!viewMode}
                >
                  <span className="text-xs">{type}</span>
                  {!rejectMode && !viewMode && <ChevronDown className="ml-1 h-3 w-3 opacity-50" />}
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
                  disabled={!!rejectMode || !!viewMode}
                >
                  {selectedTech ? (
                    <span className="text-xs">{selectedTech.name}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">+ Tecnología</span>
                  )}
                  {!rejectMode && !viewMode && <ChevronDown className="ml-1 h-3 w-3 opacity-50" />}
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
                  disabled={!selectedTech || !!rejectMode || !!viewMode}
                >
                  {selectedModule ? (
                    <span className="text-xs">{selectedModule.name}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">+ Módulo</span>
                  )}
                  {!rejectMode && !viewMode && <ChevronDown className="ml-1 h-3 w-3 opacity-50" />}
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
                  disabled={!!rejectMode || !!viewMode}
                >
                  <PriorityBadge priority={selectedPriority} className="text-xs" />
                  {!rejectMode && !viewMode && <ChevronDown className="ml-1 h-3 w-3 opacity-50" />}
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
                  disabled={!!rejectMode || !!viewMode}
                >
                  {selectedAssignee ? (
                    <>
                      <User className="mr-1 h-3 w-3" />
                      <span className="text-xs">{selectedAssignee.username}</span>
                    </>
                  ) : (
                    <User className="mr-1 h-3 w-3 text-muted-foreground" />
                  )}
                  {!rejectMode && !viewMode && <ChevronDown className="ml-1 h-3 w-3 opacity-50" />}
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
                  disabled={!!rejectMode || !!viewMode}
                >
                  {selectedWorkItem ? (
                    <IncidenceBadge type={selectedWorkItem.type} externalId={selectedWorkItem.externalId} className="text-xs" />
                  ) : (
                    <span className="text-xs text-muted-foreground">+ Trámite</span>
                  )}
                  {!rejectMode && !viewMode && <ChevronDown className="ml-1 h-3 w-3 opacity-50" />}
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
                          <IncidenceBadge type={item.type} externalId={item.externalId} className="text-xs" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          {viewMode ? (
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

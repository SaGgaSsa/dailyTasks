'use client'

import { useState, useEffect } from 'react'
import { createTicket, getTicketFormData } from '@/app/actions/tracklists'
import { AssignableUser } from '@/app/actions/user-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem 
} from '@/components/ui/select'
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
import { Check, Plus, ChevronDown, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IncidenceBadge } from '@/components/ui/incidence-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'

const TIPO_TICKET = [
  { value: 'BUG', label: 'Bug' },
  { value: 'CAMBIO', label: 'Cambio' },
  { value: 'CONSULTA', label: 'Consulta' }
]

const PRIORITIES = [
  { value: 'BLOQUEANTE', label: 'Bloqueante' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'LOW', label: 'Baja' }
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

interface Props {
  tracklistId: number
  assignableUsers: AssignableUser[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTicketDialog({ tracklistId, assignableUsers, open, onOpenChange }: Props) {
  const [isPending, setIsPending] = useState(false)
  const [type, setType] = useState('BUG')
  const [description, setDescription] = useState('')
  const [observations, setObservations] = useState('')
  
  const [techs, setTechs] = useState<TechWithModules[]>([])
  const [defaultTech, setDefaultTech] = useState<{ id: number; name: string } | null>(null)
  const [defaultModules, setDefaultModules] = useState<DefaultModule[]>([])
  const [selectedTech, setSelectedTech] = useState<TechWithModules | null>(null)
  const [selectedModule, setSelectedModule] = useState<{ id: number; name: string } | null>(null)
  const [selectedPriority, setSelectedPriority] = useState('MEDIUM')
  const [selectedAssignee, setSelectedAssignee] = useState<AssignableUser | null>(null)
  
  const [techOpen, setTechOpen] = useState(false)
  const [moduleOpen, setModuleOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const [incidenceOpen, setIncidenceOpen] = useState(false)
  const [selectedIncidence, setSelectedIncidence] = useState<{ id: number; type: string; externalId: number } | null>(null)
  const [incidencesList, setIncidencesList] = useState<{ id: number; type: string; externalId: number }[]>([])

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
      
      setIncidencesList(formData.incidences ?? [])
      
      // Solo setear valores por defecto si no hay selección previa
      if (!selectedTech && formData.defaultTech) {
        const defaultTechWithModules = formData.techs.find(t => t.id === formData.defaultTech!.id) || null
        setDefaultTech({ id: formData.defaultTech.id, name: formData.defaultTech.name })
        setSelectedTech(defaultTechWithModules)
        const defaultForTech = formData.defaultModules.find(dm => dm.techId === formData.defaultTech!.id)
        if (defaultForTech) {
          setSelectedModule({ id: defaultForTech.module.id, name: defaultForTech.module.name })
        }
      }
    }
    if (open) {
      loadData()
    }
  }, [open])

  useEffect(() => {
    if (selectedTech) {
      const defaultForTech = defaultModules.find(dm => dm.techId === selectedTech.id)
      if (defaultForTech) {
        setSelectedModule(defaultForTech.module)
      } else {
        setSelectedModule(null)
      }
    }
  }, [selectedTech, defaultModules])

  const filteredModules = selectedTech 
    ? selectedTech.modules 
    : []

  const handleSubmit = async () => {
    if (!description.trim()) return
    
    const priority = selectedPriority
    
    setIsPending(true)
    const result = await createTicket(tracklistId, {
      type,
      module: selectedModule?.name || '',
      description: description.trim(),
      priority,
      observations: observations.trim() || undefined,
      assignedToId: selectedAssignee?.id,
      incidenceId: selectedIncidence?.id
    })
    setIsPending(false)
    
    if (result.success) {
      toast.success('Ticket creado correctamente')
      handleClose()
    } else {
      toast.error(result.error || 'Error al crear ticket')
    }
  }

  const handleClose = () => {
    setType('BUG')
    setDescription('')
    setObservations('')
    setSelectedPriority('MEDIUM')
    setSelectedAssignee(null)
    setSelectedIncidence(null)
    setIncidencesList([])
    onOpenChange(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setType('BUG')
      setDescription('')
      setObservations('')
      setSelectedPriority('MEDIUM')
      setSelectedAssignee(null)
      setSelectedIncidence(null)
      setIncidencesList([])
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-[900px]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Nuevo Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              placeholder="Descripción"
            />
          </div>
          <div className="space-y-2">
            <Textarea 
              value={observations} 
              onChange={e => setObservations(e.target.value)}
              placeholder="Observación"
              rows={4}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Popover open={typeOpen} onOpenChange={setTypeOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 rounded-full border-dashed w-[100px]"
                >
                  <span className="text-xs">{type}</span>
                  <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
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
                >
                  {selectedTech ? (
                    <span className="text-xs">{selectedTech.name}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">+ Tecnología</span>
                  )}
                  <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
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
                  disabled={!selectedTech}
                >
                  {selectedModule ? (
                    <span className="text-xs">{selectedModule.name}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">+ Módulo</span>
                  )}
                  <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
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
                >
                  <PriorityBadge priority={selectedPriority} className="text-xs" />
                  <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandGroup>
                    {PRIORITIES.map((priority) => (
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
                >
                  {selectedAssignee ? (
                    <>
                      <User className="mr-1 h-3 w-3" />
                      <span className="text-xs">{selectedAssignee.username}</span>
                    </>
                  ) : (
                    <User className="mr-1 h-3 w-3 text-muted-foreground" />
                  )}
                  <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
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

            <Popover open={incidenceOpen} onOpenChange={setIncidenceOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 rounded-full border-dashed"
                >
                  {selectedIncidence ? (
                    <IncidenceBadge type={selectedIncidence.type} externalId={selectedIncidence.externalId} className="text-xs" />
                  ) : (
                    <span className="text-xs text-muted-foreground">+ Incidencia</span>
                  )}
                  <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Filtrar incidencia..." />
                  {incidencesList.length === 0 ? (
                    <CommandEmpty>No hay incidencias en este Tracklist</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setSelectedIncidence(null)
                          setIncidenceOpen(false)
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Sin incidencia
                      </CommandItem>
                      {incidencesList.map((incidence) => (
                        <CommandItem
                          key={incidence.id}
                          value={`${incidence.type} ${incidence.externalId}`}
                          onSelect={() => {
                            setSelectedIncidence(incidence)
                            setIncidenceOpen(false)
                          }}
                        >
                          <Check 
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedIncidence?.id === incidence.id ? "opacity-100" : "opacity-0"
                            )} 
                          />
                          <IncidenceBadge type={incidence.type} externalId={incidence.externalId} className="text-xs" />
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
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!description.trim() || isPending}>
            {isPending ? 'Guardando...' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

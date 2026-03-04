'use client'

import { useState, useEffect } from 'react'
import { createTicket } from '@/app/actions/tracklists'
import { getCachedTechsWithModules } from '@/app/actions/tech'
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
import { Check, Plus, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

const TIPO_TICKET = [
  { value: 'Bug', label: 'Bug' },
  { value: 'Cambio', label: 'Cambio' },
  { value: 'Consulta', label: 'Consulta' }
]

const PRIORITIES = [
  { value: 'HIGH', label: 'Alto' },
  { value: 'MEDIUM', label: 'Medio' },
  { value: 'LOW', label: 'Bajo' }
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
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTicketDialog({ tracklistId, open, onOpenChange }: Props) {
  const [isPending, setIsPending] = useState(false)
  const [type, setType] = useState('Bug')
  const [description, setDescription] = useState('')
  const [observations, setObservations] = useState('')
  
  const [techs, setTechs] = useState<TechWithModules[]>([])
  const [defaultTech, setDefaultTech] = useState<{ id: number; name: string } | null>(null)
  const [defaultModules, setDefaultModules] = useState<DefaultModule[]>([])
  const [selectedTech, setSelectedTech] = useState<TechWithModules | null>(null)
  const [selectedModule, setSelectedModule] = useState<{ id: number; name: string } | null>(null)
  const [selectedPriority, setSelectedPriority] = useState('MEDIUM')
  const [isBloqueante, setIsBloqueante] = useState(false)
  
  const [techOpen, setTechOpen] = useState(false)
  const [moduleOpen, setModuleOpen] = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)

  useEffect(() => {
    async function loadData() {
      const data = await getCachedTechsWithModules()
      setTechs(data.techs)
      if (data.defaultTech) {
        const defaultTechWithModules = data.techs.find(t => t.id === data.defaultTech!.id) || null
        setDefaultTech({ id: data.defaultTech.id, name: data.defaultTech.name })
        setSelectedTech(defaultTechWithModules)
        const defaultForTech = data.defaultModules.find(dm => dm.techId === data.defaultTech!.id)
        if (defaultForTech) {
          setSelectedModule({ id: defaultForTech.module.id, name: defaultForTech.module.name })
        }
      }
      setDefaultModules(data.defaultModules.map(dm => ({
        techId: dm.techId,
        module: { id: dm.module.id, name: dm.module.name }
      })))
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
    
    setIsPending(true)
    const result = await createTicket(tracklistId.toString(), {
      type,
      module: selectedModule?.name || '',
      description: description.trim(),
      priority: selectedPriority,
      impact: isBloqueante,
      observations: observations.trim() || undefined
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
    setType('Bug')
    setDescription('')
    setObservations('')
    setSelectedTech(null)
    setSelectedModule(null)
    setSelectedPriority('MEDIUM')
    setIsBloqueante(false)
    onOpenChange(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setType('Bug')
      setDescription('')
      setObservations('')
      setSelectedTech(null)
      setSelectedModule(null)
      setSelectedPriority('MEDIUM')
      setIsBloqueante(false)
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
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_TICKET.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
                  <span className="text-xs">
                    {isBloqueante ? 'Bloqueante' : (PRIORITIES.find(p => p.value === selectedPriority)?.label || 'Medio')}
                  </span>
                  <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar prioridad..." />
                  <CommandEmpty>No encontrada.</CommandEmpty>
                  <CommandGroup>
                    {PRIORITIES.map((priority) => (
                      <CommandItem
                        key={priority.value}
                        value={priority.label}
                        onSelect={() => {
                          setSelectedPriority(priority.value)
                          setIsBloqueante(false)
                          setPriorityOpen(false)
                        }}
                      >
                        <Check 
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedPriority === priority.value && !isBloqueante ? "opacity-100" : "opacity-0"
                          )} 
                        />
                        {priority.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-2">
              <Checkbox 
                id="bloqueante"
                checked={isBloqueante}
                onCheckedChange={(checked) => {
                  setIsBloqueante(checked === true)
                  if (checked) {
                    setSelectedPriority('HIGH')
                  }
                }}
              />
              <label 
                htmlFor="bloqueante" 
                className="text-xs text-muted-foreground cursor-pointer select-none"
              >
                Bloqueante
              </label>
            </div>
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

'use client'

import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterChipProps {
  label: string
  value: string
  onRemove: () => void
}

function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-300">
      <span>{label}: {value}</span>
      <button
        onClick={onRemove}
        className="text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

interface FilterChipsProps {
  searchQuery?: string
  selectedTech?: string[]
  selectedStatus?: string[]
  selectedAssignee?: string[]
  techOptions: Array<{ value: string; label: string }>
  statusOptions: Array<{ value: string; label: string }>
  assigneeOptions: Array<{ value: string; label: string }>
  onSearchChange: (value: string) => void
  onTechChange: (values: string[]) => void
  onStatusChange: (values: string[]) => void
  onAssigneeChange: (values: string[]) => void
  onResetFilters: () => void
  resetLabel?: string
  className?: string
}

export function FilterChips({
  searchQuery,
  selectedTech = [],
  selectedStatus = [],
  selectedAssignee = [],
  techOptions,
  statusOptions,
  assigneeOptions,
  onSearchChange,
  onTechChange,
  onStatusChange,
  onAssigneeChange,
  onResetFilters,
  resetLabel = "Resetear filtros",
  className = ""
}: FilterChipsProps) {
  const hasActiveFilters = searchQuery || selectedTech.length > 0 || selectedStatus.length > 0 || selectedAssignee.length > 0

  const getTechLabel = (value: string) => 
    techOptions.find(opt => opt.value === value)?.label || value

  const getStatusLabel = (value: string) => 
    statusOptions.find(opt => opt.value === value)?.label || value

  const getAssigneeLabel = (value: string) => 
    assigneeOptions.find(opt => opt.value === value)?.label || value

  return (
    <div className={cn("flex items-center gap-3 flex-wrap", className)}>
      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          {searchQuery && (
            <FilterChip
              label="Búsqueda"
              value={searchQuery}
              onRemove={() => onSearchChange('')}
            />
          )}
          
          {selectedTech.map(tech => (
            <FilterChip
              key={tech}
              label="Tecnología"
              value={getTechLabel(tech)}
              onRemove={() => onTechChange(selectedTech.filter(t => t !== tech))}
            />
          ))}
          
          {selectedStatus.map(status => (
            <FilterChip
              key={status}
              label="Estado"
              value={getStatusLabel(status)}
              onRemove={() => onStatusChange(selectedStatus.filter(s => s !== status))}
            />
          ))}
          
          {selectedAssignee.map(assignee => (
            <FilterChip
              key={assignee}
              label="Usuario"
              value={getAssigneeLabel(assignee)}
              onRemove={() => onAssigneeChange(selectedAssignee.filter(a => a !== assignee))}
            />
          ))}
        </div>
      )}

      {/* Reset button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetFilters}
          className="h-7 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
        >
          <X className="h-3 w-3 mr-1" />
          {resetLabel}
        </Button>
      )}
    </div>
  )
}
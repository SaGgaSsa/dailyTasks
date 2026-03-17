'use client'

import Link from 'next/link'
import { EllipsisVertical, Plus, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SidebarTopSectionChild {
  id: string | number
  label: string
  href: string
  isActive: boolean
}

interface SidebarTopSectionProps {
  isOpen: boolean
  label: string
  href: string
  icon: LucideIcon
  isActive: boolean
  showAddButton?: boolean
  onAdd?: () => void
  childrenItems?: SidebarTopSectionChild[]
  onEditChild?: (childId: SidebarTopSectionChild['id']) => void
  onDeleteChild?: (childId: SidebarTopSectionChild['id']) => void
}

export function SidebarTopSection({
  isOpen,
  label,
  href,
  icon: Icon,
  isActive,
  showAddButton = false,
  onAdd,
  childrenItems = [],
  onEditChild,
  onDeleteChild,
}: SidebarTopSectionProps) {
  if (!isOpen) {
    return (
      <div className="flex justify-center px-0">
        <Link href={href}>
          <Button
            variant="ghost"
            className={`w-full justify-center px-0 transition-colors ${
              isActive
                ? 'bg-sidebar-accent text-sidebar-foreground'
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
            }`}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Link href={href} className="min-w-0 flex-1">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 transition-colors ${
              isActive
                ? 'bg-sidebar-accent text-sidebar-foreground'
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate">{label}</span>
          </Button>
        </Link>

        {showAddButton && onAdd ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-9 w-9 flex-shrink-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={onAdd}
            aria-label={`Agregar ${label}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {childrenItems.length > 0 ? (
        <div className="space-y-0.5 pl-4">
          {childrenItems.map((child) => (
            <div
              key={child.id}
              className={`flex items-center gap-1 rounded-md ${
                child.isActive
                  ? 'bg-sidebar-accent/60 text-sidebar-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              }`}
            >
              <Link
                href={child.href}
                className="min-w-0 flex-1 truncate px-3 py-2 text-sm"
              >
                {child.label}
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="mr-1 h-7 w-7 flex-shrink-0 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                    aria-label={`Opciones de ${child.label}`}
                  >
                    <EllipsisVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onEditChild?.(child.id)}>
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => onDeleteChild?.(child.id)}
                  >
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

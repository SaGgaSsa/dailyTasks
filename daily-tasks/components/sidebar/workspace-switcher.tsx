'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Folder, ChevronsUpDown, Plus } from 'lucide-react'
import { createWorkspace } from '@/app/actions/workspace-actions'

interface Workspace {
  id: string
  name: string
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[]
  defaultWorkspaceId: string
  userId?: string
}

export function WorkspaceSwitcher({ workspaces, defaultWorkspaceId, userId }: WorkspaceSwitcherProps) {
  const router = useRouter()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(defaultWorkspaceId)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Actualiza el estado si la prop defaultWorkspaceId cambia externamente
  useEffect(() => {
    if (defaultWorkspaceId) {
      setSelectedWorkspaceId(defaultWorkspaceId);
    }
  }, [defaultWorkspaceId]);

  const handleSelect = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId)
    // Set cookie
    document.cookie = `active-workspace-id=${workspaceId}; path=/;`
    // Refresh the page
    router.refresh()
  }

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      setError('El nombre del workspace es requerido')
      return
    }

    if (!userId) {
      setError('No se pudo obtener el ID del usuario')
      return
    }

    try {
      // Call the server action directly with the real userId
      const newWorkspace = await createWorkspace(newWorkspaceName, userId)
      setIsDialogOpen(false)
      setNewWorkspaceName('')
      setError(null)
      // Select the new workspace
      handleSelect(newWorkspace.id)
    } catch (error: any) {
      console.error('Error creating workspace:', error)
      setError(error.message || 'Error al crear el workspace')
    }
  }

  const currentWorkspace = workspaces.find(ws => ws.id === selectedWorkspaceId)

  return (
    <div className="p-4 border-b">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start">
            <Folder className="h-4 w-4 mr-2" />
            <span className="font-medium truncate">{currentWorkspace?.name || 'Seleccionar workspace'}</span>
            <ChevronsUpDown className="h-4 w-4 ml-auto text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Mis Workspaces</div>
          {workspaces.map((workspace) => (
            <DropdownMenuItem key={workspace.id} onSelect={() => handleSelect(workspace.id)}>
              <Folder className="h-4 w-4 mr-2" />
              <span className="truncate">{workspace.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Workspace
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear nuevo workspace</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Nombre del workspace"
                  value={newWorkspaceName}
                  onChange={(e) => {
                    setNewWorkspaceName(e.target.value)
                    setError(null) // Limpiar error al editar
                  }}
                />
                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => {
                    setIsDialogOpen(false)
                    setError(null)
                  }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateWorkspace}>
                    Guardar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

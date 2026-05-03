'use client'

import { useState } from 'react'
import type { Environment } from '@prisma/client'
import { Pencil, Power, PowerOff, Save, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  createEnvironment,
  setEnvironmentEnabled,
  updateEnvironment,
} from '@/app/actions/environments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface EnvironmentsSectionProps {
  environments: Environment[]
  onRefresh: () => Promise<void>
}

export function EnvironmentsSection({ environments, onRefresh }: EnvironmentsSectionProps) {
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    setError(null)
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }

    setIsCreating(true)
    const result = await createEnvironment({ name })
    setIsCreating(false)

    if (!result.success) {
      setError(result.error || 'Error al crear el ambiente')
      return
    }

    setName('')
    toast.success('Ambiente creado')
    await onRefresh()
  }

  function startEditing(environment: Environment) {
    setError(null)
    setEditingId(environment.id)
    setEditingName(environment.name)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingName('')
  }

  async function handleUpdate(id: number) {
    setError(null)
    if (!editingName.trim()) {
      setError('El nombre es requerido')
      return
    }

    setPendingId(id)
    const result = await updateEnvironment({ id, name: editingName })
    setPendingId(null)

    if (!result.success) {
      setError(result.error || 'Error al actualizar el ambiente')
      return
    }

    cancelEditing()
    toast.success('Ambiente actualizado')
    await onRefresh()
  }

  async function handleToggle(environment: Environment) {
    setError(null)
    setPendingId(environment.id)
    const result = await setEnvironmentEnabled({
      id: environment.id,
      isEnabled: !environment.isEnabled,
    })
    setPendingId(null)

    if (!result.success) {
      setError(result.error || 'Error al actualizar el ambiente')
      return
    }

    toast.success('Ambiente actualizado')
    await onRefresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Ambientes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestioná el catálogo global de ambientes disponibles.
        </p>
      </div>

      <section className="space-y-4">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-2">Nombre</TableHead>
                <TableHead className="w-[140px] h-9 px-2">Estado</TableHead>
                <TableHead className="w-[120px] h-9 px-2">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {environments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    No hay ambientes cargados.
                  </TableCell>
                </TableRow>
              )}

              {environments.map((environment) => {
                const isEditing = editingId === environment.id
                const isPending = pendingId === environment.id

                return (
                  <TableRow key={environment.id}>
                    <TableCell className="py-1.5 px-2 font-medium">
                      {isEditing ? (
                        <Input
                          type="text"
                          className="h-8 text-xs"
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          disabled={isPending}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              void handleUpdate(environment.id)
                            }
                            if (event.key === 'Escape') {
                              cancelEditing()
                            }
                          }}
                        />
                      ) : (
                        environment.name
                      )}
                    </TableCell>
                    <TableCell className="py-1.5 px-2">
                      <Badge
                        variant={environment.isEnabled ? 'secondary' : 'outline'}
                        className={environment.isEnabled ? 'text-emerald-700 dark:text-emerald-300' : ''}
                      >
                        {environment.isEnabled ? 'Habilitado' : 'Deshabilitado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5 px-2">
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => handleUpdate(environment.id)}
                              disabled={isPending}
                              aria-label="Guardar ambiente"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={cancelEditing}
                              disabled={isPending}
                              aria-label="Cancelar edición"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => startEditing(environment)}
                              disabled={pendingId !== null || isCreating}
                              aria-label="Editar ambiente"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => handleToggle(environment)}
                              disabled={pendingId !== null || isCreating}
                              aria-label={environment.isEnabled ? 'Deshabilitar ambiente' : 'Habilitar ambiente'}
                            >
                              {environment.isEnabled ? (
                                <PowerOff className="h-4 w-4" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}

              <TableRow>
                <TableCell className="py-1.5 px-2">
                  <Input
                    type="text"
                    placeholder="Nombre del ambiente"
                    className="h-8 text-xs"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={isCreating}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handleCreate()
                      }
                    }}
                  />
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <Badge variant="secondary" className="text-emerald-700 dark:text-emerald-300">
                    Habilitado
                  </Badge>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={handleCreate}
                    disabled={isCreating}
                    aria-label="Crear ambiente"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>
    </div>
  )
}

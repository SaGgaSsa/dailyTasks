'use client'

import { useMemo, useState } from 'react'
import { Module, Technology } from '@prisma/client'
import { Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createModule,
  createTechnology,
  deleteModule,
  deleteTechnology,
} from '@/app/actions/tech'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface TechnologyWithModules extends Technology {
  modules: Module[]
}

interface TechModulesSectionProps {
  techs: TechnologyWithModules[]
  canManage: boolean
  onRefresh: () => Promise<void>
  mode: 'technologies' | 'modules'
}

export function TechModulesSection({ techs, canManage, onRefresh, mode }: TechModulesSectionProps) {
  const [name, setName] = useState('')
  const [technologyId, setTechnologyId] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; type: 'technology' | 'module'; label: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const modules = useMemo(
    () =>
      techs.flatMap((technology) =>
        technology.modules.map((moduleRecord) => ({
          ...moduleRecord,
          technologyName: technology.name,
        }))
      ),
    [techs]
  )

  const technologyOptions = useMemo(
    () =>
      techs.map((technology) => ({
        value: String(technology.id),
        label: technology.name,
      })),
    [techs]
  )

  async function handleCreateTechnology() {
    setError(null)
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }

    setIsPending(true)
    const result = await createTechnology({ name })
    setIsPending(false)

    if (!result.success) {
      setError(result.error || 'Error al crear la tecnología')
      return
    }

    setName('')
    toast.success('Tecnología creada')
    await onRefresh()
  }

  async function handleCreateModule() {
    setError(null)
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }
    if (!technologyId) {
      setError('La tecnología es requerida')
      return
    }

    setIsPending(true)
    const result = await createModule({ name, technologyId: Number(technologyId) })
    setIsPending(false)

    if (!result.success) {
      setError(result.error || 'Error al crear el módulo')
      return
    }

    setName('')
    setTechnologyId('')
    toast.success('Módulo creado')
    await onRefresh()
  }

  async function handleDelete() {
    if (!deleteTarget) return

    setIsDeleting(true)

    const result =
      deleteTarget.type === 'technology'
        ? await deleteTechnology(deleteTarget.id)
        : await deleteModule(deleteTarget.id)

    setIsDeleting(false)

    if (!result.success) {
      toast.error(result.error || 'Error al eliminar')
      return
    }

    toast.success(deleteTarget.type === 'technology' ? 'Tecnología eliminada' : 'Módulo eliminado')
    setDeleteTarget(null)
    await onRefresh()
  }

  return (
    <div className="space-y-8">
      {mode === 'technologies' && (
        <>
          <div>
            <h2 className="text-lg font-semibold">Tecnologías</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {canManage
                ? 'Gestioná el catálogo base de tecnologías usado por incidencias y tickets.'
                : 'Consultá el catálogo base de tecnologías usado por incidencias y tickets.'}
            </p>
          </div>

          <section className="space-y-4">
            <p className="text-sm text-muted-foreground">Listado corto de tecnologías disponibles en el sistema.</p>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-9 px-2">Nombre</TableHead>
                    <TableHead className="w-[140px] h-9 px-2">Módulos</TableHead>
                    {canManage && <TableHead className="w-[60px] h-9 px-2">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {techs.length === 0 && !canManage && (
                    <TableRow>
                      <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                        No hay tecnologías cargadas.
                      </TableCell>
                    </TableRow>
                  )}
                  {techs.map((technology) => (
                    <TableRow key={technology.id}>
                      <TableCell className="py-1.5 px-2 font-medium">{technology.name}</TableCell>
                      <TableCell className="py-1.5 px-2">{technology.modules.length}</TableCell>
                      {canManage && (
                        <TableCell className="py-1.5 px-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget({ id: technology.id, type: 'technology', label: technology.name })}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}

                  {canManage && (
                    <TableRow>
                      <TableCell className="py-1.5 px-2">
                        <Input
                          type="text"
                          placeholder="Nombre de la tecnología"
                          className="h-8 text-xs"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={isPending}
                        />
                      </TableCell>
                      <TableCell className="py-1.5 px-2" />
                      <TableCell className="py-1.5 px-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={handleCreateTechnology}
                          disabled={isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </section>
        </>
      )}

      {mode === 'modules' && (
        <>
          <div>
            <h2 className="text-lg font-semibold">Módulos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {canManage
                ? 'Gestioná los módulos asociados a cada tecnología.'
                : 'Consultá los módulos asociados a cada tecnología.'}
            </p>
          </div>

          <section className="space-y-4">
            <p className="text-sm text-muted-foreground">Cada módulo pertenece a una tecnología y puede usarse en tickets QA.</p>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-9 px-2">Nombre</TableHead>
                    <TableHead className="h-9 px-2">Tecnología</TableHead>
                    {canManage && <TableHead className="w-[60px] h-9 px-2">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.length === 0 && !canManage && (
                    <TableRow>
                      <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                        No hay módulos cargados.
                      </TableCell>
                    </TableRow>
                  )}
                  {modules.map((moduleRecord) => (
                    <TableRow key={moduleRecord.id}>
                      <TableCell className="py-1.5 px-2 font-medium">{moduleRecord.name}</TableCell>
                      <TableCell className="py-1.5 px-2">{moduleRecord.technologyName}</TableCell>
                      {canManage && (
                        <TableCell className="py-1.5 px-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget({ id: moduleRecord.id, type: 'module', label: moduleRecord.name })}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}

                  {canManage && (
                    <TableRow>
                      <TableCell className="py-1.5 px-2">
                        <Input
                          type="text"
                          placeholder="Nombre del módulo"
                          className="h-8 text-xs"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={isPending || techs.length === 0}
                        />
                      </TableCell>
                      <TableCell className="py-1.5 px-2">
                        <Select
                          value={technologyId}
                          onValueChange={setTechnologyId}
                          disabled={isPending || techs.length === 0}
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="Tecnología" />
                          </SelectTrigger>
                          <SelectContent>
                            {technologyOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="py-1.5 px-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={handleCreateModule}
                          disabled={isPending || techs.length === 0}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </section>
        </>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === 'technology' ? '¿Eliminar tecnología?' : '¿Eliminar módulo?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'technology'
                ? `Se eliminará ${deleteTarget.label}. Si tiene módulos sin uso, también se eliminarán.`
                : `Se eliminará ${deleteTarget?.label}. Esta acción no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { Module, Technology } from '@prisma/client'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createModule,
  createTechnology,
  deleteModule,
  deleteTechnology,
  updateModule,
  updateTechnology,
} from '@/app/actions/tech'
import { Button } from '@/components/ui/button'
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
  FormInput,
  FormSelect,
  FormSheet,
} from '@/components/ui/form-sheet'
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

type TechnologyFormState = {
  id?: number
  name: string
}

type ModuleFormState = {
  id?: number
  name: string
  technologyId: string
}

const EMPTY_TECH_FORM: TechnologyFormState = {
  name: '',
}

const EMPTY_MODULE_FORM: ModuleFormState = {
  name: '',
  technologyId: '',
}

interface TechModulesSectionProps {
  techs: TechnologyWithModules[]
  canManage: boolean
  onRefresh: () => Promise<void>
  mode: 'technologies' | 'modules'
}

export function TechModulesSection({ techs, canManage, onRefresh, mode }: TechModulesSectionProps) {
  const [technologyFormOpen, setTechnologyFormOpen] = useState(false)
  const [moduleFormOpen, setModuleFormOpen] = useState(false)
  const [technologyForm, setTechnologyForm] = useState<TechnologyFormState>(EMPTY_TECH_FORM)
  const [moduleForm, setModuleForm] = useState<ModuleFormState>(EMPTY_MODULE_FORM)
  const [isSavingTechnology, setIsSavingTechnology] = useState(false)
  const [isSavingModule, setIsSavingModule] = useState(false)
  const [technologyError, setTechnologyError] = useState<string | null>(null)
  const [moduleError, setModuleError] = useState<string | null>(null)
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

  function resetTechnologyForm() {
    setTechnologyForm(EMPTY_TECH_FORM)
    setTechnologyError(null)
  }

  function resetModuleForm() {
    setModuleForm({
      ...EMPTY_MODULE_FORM,
      technologyId: techs[0] ? String(techs[0].id) : '',
    })
    setModuleError(null)
  }

  function openCreateTechnology() {
    resetTechnologyForm()
    setTechnologyFormOpen(true)
  }

  function openEditTechnology(technology: Technology) {
    setTechnologyError(null)
    setTechnologyForm({
      id: technology.id,
      name: technology.name,
    })
    setTechnologyFormOpen(true)
  }

  function openCreateModule() {
    resetModuleForm()
    setModuleFormOpen(true)
  }

  function openEditModule(moduleRecord: Module) {
    setModuleError(null)
    setModuleForm({
      id: moduleRecord.id,
      name: moduleRecord.name,
      technologyId: String(moduleRecord.technologyId),
    })
    setModuleFormOpen(true)
  }

  async function handleSaveTechnology() {
    setTechnologyError(null)
    setIsSavingTechnology(true)

    const result = technologyForm.id
      ? await updateTechnology({
          id: technologyForm.id,
          name: technologyForm.name,
        })
      : await createTechnology({
          name: technologyForm.name,
        })

    setIsSavingTechnology(false)

    if (!result.success) {
      setTechnologyError(result.error || 'Error al guardar la tecnología')
      return false
    }

    toast.success(technologyForm.id ? 'Tecnología actualizada' : 'Tecnología creada')
    setTechnologyFormOpen(false)
    resetTechnologyForm()
    await onRefresh()
    return true
  }

  async function handleSaveModule() {
    setModuleError(null)
    setIsSavingModule(true)

    const payload = {
      name: moduleForm.name,
      technologyId: Number(moduleForm.technologyId),
    }

    const result = moduleForm.id
      ? await updateModule({
          id: moduleForm.id,
          ...payload,
        })
      : await createModule(payload)

    setIsSavingModule(false)

    if (!result.success) {
      setModuleError(result.error || 'Error al guardar el módulo')
      return false
    }

    toast.success(moduleForm.id ? 'Módulo actualizado' : 'Módulo creado')
    setModuleFormOpen(false)
    resetModuleForm()
    await onRefresh()
    return true
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return
    }

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
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Listado corto de tecnologías disponibles en el sistema.</p>
              </div>
              {canManage && (
                <Button onClick={openCreateTechnology}>
                  <Plus className="h-4 w-4" />
                  Nueva tecnología
                </Button>
              )}
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="w-[140px]">Módulos</TableHead>
                    {canManage && <TableHead className="w-[120px]">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {techs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canManage ? 3 : 2} className="py-8 text-center text-muted-foreground">
                        No hay tecnologías cargadas.
                      </TableCell>
                    </TableRow>
                  )}
                  {techs.map((technology) => (
                    <TableRow key={technology.id}>
                      <TableCell className="font-medium">{technology.name}</TableCell>
                      <TableCell>{technology.modules.length}</TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTechnology(technology)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget({ id: technology.id, type: 'technology', label: technology.name })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Cada módulo pertenece a una tecnología y puede usarse en tickets QA.</p>
              </div>
              {canManage && (
                <Button onClick={openCreateModule} disabled={techs.length === 0}>
                  <Plus className="h-4 w-4" />
                  Nuevo módulo
                </Button>
              )}
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tecnología</TableHead>
                    {canManage && <TableHead className="w-[120px]">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canManage ? 3 : 2} className="py-8 text-center text-muted-foreground">
                        No hay módulos cargados.
                      </TableCell>
                    </TableRow>
                  )}
                  {modules.map((moduleRecord) => (
                    <TableRow key={moduleRecord.id}>
                      <TableCell className="font-medium">{moduleRecord.name}</TableCell>
                      <TableCell>{moduleRecord.technologyName}</TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModule(moduleRecord)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget({ id: moduleRecord.id, type: 'module', label: moduleRecord.name })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}

      <FormSheet
        open={technologyFormOpen}
        onOpenChange={(open) => {
          setTechnologyFormOpen(open)
          if (!open) {
            resetTechnologyForm()
          }
        }}
        title={technologyForm.id ? 'Editar tecnología' : 'Nueva tecnología'}
        isEditMode={Boolean(technologyForm.id)}
        isSaving={isSavingTechnology}
        onSave={handleSaveTechnology}
        onClose={() => {
          setTechnologyFormOpen(false)
          resetTechnologyForm()
        }}
      >
        <FormInput
          id="technology-name"
          label="Nombre"
          value={technologyForm.name}
          onChange={(event) => setTechnologyForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Ej. SISA"
        />
        {technologyError && <p className="text-sm text-destructive">{technologyError}</p>}
      </FormSheet>

      <FormSheet
        open={moduleFormOpen}
        onOpenChange={(open) => {
          setModuleFormOpen(open)
          if (!open) {
            resetModuleForm()
          }
        }}
        title={moduleForm.id ? 'Editar módulo' : 'Nuevo módulo'}
        isEditMode={Boolean(moduleForm.id)}
        isSaving={isSavingModule}
        onSave={handleSaveModule}
        onClose={() => {
          setModuleFormOpen(false)
          resetModuleForm()
        }}
      >
        <FormInput
          id="module-name"
          label="Nombre"
          value={moduleForm.name}
          onChange={(event) => setModuleForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Ej. Serv"
        />
        <FormSelect
          id="module-technology"
          label="Tecnología"
          value={moduleForm.technologyId}
          onValueChange={(value) => setModuleForm((current) => ({ ...current, technologyId: value }))}
          options={technologyOptions}
          placeholder="Seleccioná una tecnología"
          disabled={technologyOptions.length === 0}
        />
        {moduleError && <p className="text-sm text-destructive">{moduleError}</p>}
      </FormSheet>

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

import { describe, expect, it } from 'vitest'

import {
  createModule,
  createTechnology,
  deleteModule,
  deleteTechnology,
  getCachedTechsWithModules,
  updateModule,
  updateTechnology,
} from '@/app/actions/tech'
import { db } from '@/lib/db'
import {
  actAs,
  createExternalWorkItem,
  createIncidenceFixture,
  createTicketFixture,
  createTracklist,
  createUser,
} from '@/tests/integration/helpers'
import { revalidatePathMock, revalidateTagMock } from '@/tests/integration/setup'

describe('tech/module settings automation', () => {
  it('allows ADMIN and QA to manage technologies and modules and revalidates cache', async () => {
    const admin = await createUser('ADMIN')
    actAs(admin)

    const createdTechnology = await createTechnology({ name: ' Plataforma Core ' })
    expect(createdTechnology.success).toBe(true)
    expect(createdTechnology.data?.name).toBe('Plataforma Core')

    const createdModule = await createModule({
      name: 'Portal Clientes',
      technologyId: createdTechnology.data!.id,
    })

    expect(createdModule.success).toBe(true)
    expect(createdModule.data?.slug).toBe('portal-clientes')
    expect(revalidateTagMock).toHaveBeenCalledWith('tecnologias', 'default')
    expect(revalidateTagMock).toHaveBeenCalledWith('modulos', 'default')
    expect(revalidatePathMock).toHaveBeenCalledWith('/incidences')
    expect(revalidatePathMock).toHaveBeenCalledWith('/tracklists')

    const qa = await createUser('QA')
    actAs(qa)

    const updatedTechnology = await updateTechnology({
      id: createdTechnology.data!.id,
      name: 'Plataforma Comercial',
    })
    expect(updatedTechnology.success).toBe(true)
    expect(updatedTechnology.data?.name).toBe('Plataforma Comercial')

    const updatedModule = await updateModule({
      id: createdModule.data!.id,
      name: 'Portal B2B',
      technologyId: createdTechnology.data!.id,
    })
    expect(updatedModule.success).toBe(true)
    expect(updatedModule.data?.name).toBe('Portal B2B')
    expect(updatedModule.data?.slug).toBe('portal-clientes')

    const cachedTechs = await getCachedTechsWithModules()
    expect(cachedTechs.techs).toHaveLength(1)
    expect(cachedTechs.techs[0].name).toBe('Plataforma Comercial')
    expect(cachedTechs.techs[0].modules[0].name).toBe('Portal B2B')
  })

  it('rejects mutations for DEV users', async () => {
    const dev = await createUser('DEV')
    actAs(dev)

    const createTechnologyResult = await createTechnology({ name: 'Dev Tech' })
    expect(createTechnologyResult).toEqual({
      success: false,
      error: 'Solo administradores y QA pueden modificar esta configuración',
    })

    const technology = await db.technology.create({
      data: { name: 'Tech existente' },
    })

    const createModuleResult = await createModule({
      name: 'Modulo bloqueado',
      technologyId: technology.id,
    })
    expect(createModuleResult).toEqual({
      success: false,
      error: 'Solo administradores y QA pueden modificar esta configuración',
    })

    const updateTechnologyResult = await updateTechnology({
      id: technology.id,
      name: 'Cambio no permitido',
    })
    expect(updateTechnologyResult.success).toBe(false)

    const deleteTechnologyResult = await deleteTechnology(technology.id)
    expect(deleteTechnologyResult.success).toBe(false)
  })

  it('generates a unique slug for modules with duplicate names', async () => {
    const admin = await createUser('ADMIN')
    actAs(admin)

    const technology = await db.technology.create({
      data: { name: 'SISA' },
    })

    const firstModule = await createModule({
      name: 'Módulo Único',
      technologyId: technology.id,
    })
    const secondModule = await createModule({
      name: 'Modulo Unico',
      technologyId: technology.id,
    })

    expect(firstModule.success).toBe(true)
    expect(firstModule.data?.slug).toBe('modulo-unico')
    expect(secondModule.success).toBe(true)
    expect(secondModule.data?.slug).toBe('modulo-unico-2')
  })

  it('blocks deleting a module used by a ticket', async () => {
    const admin = await createUser('ADMIN')
    const qa = await createUser('QA')
    const dev = await createUser('DEV')
    const technology = await db.technology.create({
      data: { name: 'Backend' },
    })
    const moduleRecord = await db.module.create({
      data: {
        name: 'API',
        slug: 'api',
        technologyId: technology.id,
      },
    })
    const tracklist = await createTracklist(qa.id)

    await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: moduleRecord.id,
      reportedById: qa.id,
      assignedToId: dev.id,
    })

    actAs(admin)
    const result = await deleteModule(moduleRecord.id)

    expect(result).toEqual({
      success: false,
      error: 'No se puede eliminar el módulo porque tiene tickets asociados',
    })
    expect(await db.module.findUnique({ where: { id: moduleRecord.id } })).not.toBeNull()
  })

  it('blocks deleting a technology used by an incidence', async () => {
    const admin = await createUser('ADMIN')
    const dev = await createUser('DEV')
    const technology = await db.technology.create({
      data: { name: 'Legacy' },
    })
    const workItem = await createExternalWorkItem()

    await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      assignees: [{ userId: dev.id, assignedHours: 4 }],
    })

    actAs(admin)
    const result = await deleteTechnology(technology.id)

    expect(result).toEqual({
      success: false,
      error: 'No se puede eliminar la tecnología porque tiene incidencias asociadas o módulos usados en tickets',
    })
    expect(await db.technology.findUnique({ where: { id: technology.id } })).not.toBeNull()
  })

  it('deletes an unused technology and cascades its unused modules', async () => {
    const admin = await createUser('ADMIN')
    actAs(admin)

    const technology = await createTechnology({ name: 'Temporal' })
    const moduleRecord = await createModule({
      name: 'Temporal Mod',
      technologyId: technology.data!.id,
    })

    const result = await deleteTechnology(technology.data!.id)

    expect(result).toEqual({ success: true })
    expect(await db.technology.findUnique({ where: { id: technology.data!.id } })).toBeNull()
    expect(await db.module.findUnique({ where: { id: moduleRecord.data!.id } })).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'

import {
  createEnvironment,
  getEnvironmentsForSettings,
  setEnvironmentEnabled,
  updateEnvironment,
} from '@/app/actions/environments'
import { db } from '@/lib/db'
import { actAs, createUser } from '@/tests/integration/helpers'
import { clearMockSession, revalidateTagMock } from '@/tests/integration/setup'

describe('environment settings automation', () => {
  it('allows ADMIN to create, rename, disable and enable environments', async () => {
    const admin = await createUser('ADMIN')
    actAs(admin)

    const created = await createEnvironment({ name: '  Producción   Principal  ' })
    expect(created.success).toBe(true)
    expect(created.data?.name).toBe('Producción Principal')
    expect(created.data?.isEnabled).toBe(true)
    expect(revalidateTagMock).toHaveBeenCalledWith('environments', 'default')

    const renamed = await updateEnvironment({
      id: created.data!.id,
      name: 'Producción Norte',
    })
    expect(renamed.success).toBe(true)
    expect(renamed.data?.name).toBe('Producción Norte')

    const disabled = await setEnvironmentEnabled({
      id: created.data!.id,
      isEnabled: false,
    })
    expect(disabled.success).toBe(true)
    expect(disabled.data?.isEnabled).toBe(false)

    const enabled = await setEnvironmentEnabled({
      id: created.data!.id,
      isEnabled: true,
    })
    expect(enabled.success).toBe(true)
    expect(enabled.data?.isEnabled).toBe(true)

    expect(revalidateTagMock).toHaveBeenCalledTimes(4)
  })

  it('rejects environment mutations for QA, DEV and anonymous users', async () => {
    const environment = await db.environment.create({
      data: { name: 'Existente' },
    })

    const qa = await createUser('QA')
    actAs(qa)

    await expect(createEnvironment({ name: 'QA env' })).resolves.toEqual({
      success: false,
      error: 'Solo administradores pueden modificar ambientes',
    })
    await expect(
      updateEnvironment({ id: environment.id, name: 'Cambio QA' })
    ).resolves.toEqual({
      success: false,
      error: 'Solo administradores pueden modificar ambientes',
    })
    await expect(
      setEnvironmentEnabled({ id: environment.id, isEnabled: false })
    ).resolves.toEqual({
      success: false,
      error: 'Solo administradores pueden modificar ambientes',
    })

    const dev = await createUser('DEV')
    actAs(dev)

    await expect(createEnvironment({ name: 'DEV env' })).resolves.toEqual({
      success: false,
      error: 'Solo administradores pueden modificar ambientes',
    })
    await expect(
      updateEnvironment({ id: environment.id, name: 'Cambio DEV' })
    ).resolves.toEqual({
      success: false,
      error: 'Solo administradores pueden modificar ambientes',
    })
    await expect(
      setEnvironmentEnabled({ id: environment.id, isEnabled: false })
    ).resolves.toEqual({
      success: false,
      error: 'Solo administradores pueden modificar ambientes',
    })

    clearMockSession()

    await expect(
      setEnvironmentEnabled({ id: environment.id, isEnabled: false })
    ).resolves.toEqual({
      success: false,
      error: 'No autorizado',
    })
  })

  it('rejects empty and duplicate environment names', async () => {
    const admin = await createUser('ADMIN')
    actAs(admin)

    await expect(createEnvironment({ name: '   ' })).resolves.toEqual({
      success: false,
      error: 'El nombre es requerido',
    })

    const first = await createEnvironment({ name: 'Testing' })
    expect(first.success).toBe(true)

    await expect(createEnvironment({ name: 'Testing' })).resolves.toEqual({
      success: false,
      error: 'El ambiente ya existe',
    })

    const second = await createEnvironment({ name: 'Staging' })
    expect(second.success).toBe(true)

    await expect(
      updateEnvironment({ id: second.data!.id, name: 'Testing' })
    ).resolves.toEqual({
      success: false,
      error: 'El ambiente ya existe',
    })
  })

  it('returns enabled and disabled environments ordered by name', async () => {
    await db.environment.createMany({
      data: [
        { name: 'UAT', isEnabled: false },
        { name: 'Desarrollo', isEnabled: true },
        { name: 'Producción', isEnabled: true },
      ],
    })

    const result = await getEnvironmentsForSettings()

    expect(result.success).toBe(true)
    expect(result.data?.map((environment) => environment.name)).toEqual([
      'Desarrollo',
      'Producción',
      'UAT',
    ])
    expect(result.data?.map((environment) => environment.isEnabled)).toEqual([
      true,
      true,
      false,
    ])
  })
})

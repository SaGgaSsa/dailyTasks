import bcrypt from 'bcryptjs'
import { describe, expect, it } from 'vitest'
import { UserRole } from '@prisma/client'

import { changeOwnPassword, getUsers, resetUserPassword, upsertUser } from '@/app/actions/user-actions'
import { db } from '@/lib/db'
import { getTemporaryUserPassword } from '@/lib/passwords'
import { actAs, createUser } from '@/tests/integration/helpers'

describe('user password lifecycle', () => {
  it('creates admin-managed users with the temporary password and requires changing it', async () => {
    const admin = await createUser(UserRole.ADMIN)
    actAs(admin)

    const result = await upsertUser({
      username: 'New Dev',
      name: 'New Dev',
      email: 'new.dev@example.com',
      role: UserRole.DEV,
      technologies: [],
    })

    expect(result.success).toBe(true)

    const storedUser = await db.user.findUniqueOrThrow({
      where: { email: 'new.dev@example.com' },
    })
    await expect(bcrypt.compare(getTemporaryUserPassword(), storedUser.password)).resolves.toBe(true)
    expect(storedUser.mustChangePassword).toBe(true)
  })

  it('resets a user password to the temporary password and marks it for change', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const dev = await createUser(UserRole.DEV)
    actAs(admin)

    const result = await resetUserPassword(dev.id)

    expect(result.success).toBe(true)

    const storedUser = await db.user.findUniqueOrThrow({ where: { id: dev.id } })
    await expect(bcrypt.compare(getTemporaryUserPassword(), storedUser.password)).resolves.toBe(true)
    expect(storedUser.mustChangePassword).toBe(true)
  })

  it('blocks non-admin roles from resetting passwords', async () => {
    const qa = await createUser(UserRole.QA)
    const dev = await createUser(UserRole.DEV)
    actAs(qa)

    const result = await resetUserPassword(dev.id)

    expect(result.success).toBe(false)
    expect(result.error).toBe('No autorizado')
  })

  it('lets an authenticated user change their own password and clears the pending flag', async () => {
    const dev = await createUser(UserRole.DEV)
    await db.user.update({
      where: { id: dev.id },
      data: { mustChangePassword: true },
    })
    actAs(dev)

    const result = await changeOwnPassword({ newPassword: 'real-password' })

    expect(result.success).toBe(true)

    const storedUser = await db.user.findUniqueOrThrow({ where: { id: dev.id } })
    await expect(bcrypt.compare('real-password', storedUser.password)).resolves.toBe(true)
    expect(storedUser.mustChangePassword).toBe(false)
  })

  it('rejects changing the own password to the temporary password', async () => {
    const dev = await createUser(UserRole.DEV)
    actAs(dev)

    const result = await changeOwnPassword({ newPassword: getTemporaryUserPassword() })

    expect(result.success).toBe(false)
    expect(result.error).toBe('La nueva contraseña no puede ser la contraseña temporal')
  })

  it('keeps password hashes out of admin user listings after adding the pending flag', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const dev = await createUser(UserRole.DEV)
    await db.user.update({ where: { id: dev.id }, data: { mustChangePassword: true } })
    actAs(admin)

    const result = await getUsers()

    expect(result.success).toBe(true)
    const listedDev = result.data?.find((user) => user.id === dev.id)
    expect(listedDev?.mustChangePassword).toBe(true)
    expect('password' in (listedDev as unknown as Record<string, unknown>)).toBe(false)
  })
})

import { existsSync } from 'node:fs'
import { readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'

import { rejectTicket } from '@/app/actions/incidence-actions'
import { createTicket, updateTicket, uploadTicketImage } from '@/app/actions/tracklists'
import { db } from '@/lib/db'
import { actAs, createExternalWorkItem, createIncidenceFixture, createTechnologyModule, createTracklist, createTicketFixture, createUser } from '@/tests/integration/helpers'
import { Priority, TicketType } from '@/types/enums'

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
])

const createdUploadUrls: string[] = []

function imageFormData(input: {
  tracklistId: number
  ticketId?: number
  draftId?: string
  bytes?: Uint8Array
  name?: string
  type?: string
}) {
  const formData = new FormData()
  formData.set('tracklistId', String(input.tracklistId))
  if (input.ticketId) formData.set('ticketId', String(input.ticketId))
  if (input.draftId) formData.set('draftId', input.draftId)
  formData.set('file', new File([Buffer.from(input.bytes ?? PNG_BYTES)], input.name ?? 'paste.png', { type: input.type ?? 'image/png' }))
  return formData
}

function uploadPathFromUrl(url: string) {
  return path.join(process.cwd(), 'public', url)
}

async function uploadImage(formData: FormData) {
  const result = await uploadTicketImage(formData)
  if (result.success) {
    createdUploadUrls.push(result.data.url)
  }
  return result
}

afterEach(async () => {
  await Promise.all(createdUploadUrls.map((url) => rm(uploadPathFromUrl(url), { force: true })))
  createdUploadUrls.length = 0
})

describe('ticket inline images', () => {
  test('rejects unauthenticated image uploads', async () => {
    const result = await uploadImage(imageFormData({ tracklistId: 1, draftId: 'draft-unauthorized' }))

    expect(result.success).toBe(false)
    expect(result.error).toBe('No autorizado')
  })

  test('rejects invalid image MIME and extension', async () => {
    const admin = await createUser('ADMIN')
    const tracklist = await createTracklist(admin.id)
    actAs(admin)

    const result = await uploadImage(imageFormData({
      tracklistId: tracklist.id,
      draftId: 'draft-invalid',
      name: 'paste.gif',
      type: 'image/gif',
      bytes: new Uint8Array([0x47, 0x49, 0x46, 0x38]),
    }))

    expect(result.success).toBe(false)
    expect(result.error).toContain('JPEG, PNG o WebP')
  })

  test('rejects images over the configured server limit', async () => {
    const previousLimit = process.env.TICKET_IMAGE_MAX_BYTES
    process.env.TICKET_IMAGE_MAX_BYTES = '8'

    const admin = await createUser('ADMIN')
    const tracklist = await createTracklist(admin.id)
    actAs(admin)

    const result = await uploadImage(imageFormData({ tracklistId: tracklist.id, draftId: 'draft-large' }))

    process.env.TICKET_IMAGE_MAX_BYTES = previousLimit

    expect(result.success).toBe(false)
    expect(result.error).toContain('supera el tamaño máximo')
  })

  test('creates a draft TicketImage and writes the file under public uploads', async () => {
    const admin = await createUser('ADMIN')
    const tracklist = await createTracklist(admin.id)
    actAs(admin)

    const result = await uploadImage(imageFormData({ tracklistId: tracklist.id, draftId: 'draft-create' }))

    expect(result.success).toBe(true)
    expect(result.data?.url).toMatch(/^\/uploads\/tickets\/.+\.png$/)

    const image = await db.ticketImage.findUniqueOrThrow({ where: { id: result.data!.id } })
    expect(image.ticketId).toBeNull()
    expect(image.draftId).toBe('draft-create')
    expect(image.uploadedById).toBe(admin.id)
    expect(image.mimeType).toBe('image/png')
    expect(await readFile(uploadPathFromUrl(image.url))).toEqual(Buffer.from(PNG_BYTES))

    await rm(uploadPathFromUrl(image.url), { force: true })
  })

  test('links referenced draft images when creating a ticket and deletes removed draft images', async () => {
    const admin = await createUser('ADMIN')
    const { module } = await createTechnologyModule()
    const tracklist = await createTracklist(admin.id)
    actAs(admin)

    const draftId = 'draft-link-create'
    const kept = await uploadImage(imageFormData({ tracklistId: tracklist.id, draftId }))
    const removed = await uploadImage(imageFormData({ tracklistId: tracklist.id, draftId }))

    const result = await createTicket(tracklist.id, {
      type: TicketType.BUG,
      moduleId: module.id,
      description: 'Ticket con imagen',
      priority: Priority.MEDIUM,
      draftId,
      observations: `<p>Detalle</p><img src="${kept.data!.url}" alt="captura">`,
    })

    expect(result.success).toBe(true)
    if (!result.success) throw new Error(result.error)

    const images = await db.ticketImage.findMany({ orderBy: { id: 'asc' } })
    expect(images).toHaveLength(1)
    expect(images[0].id).toBe(kept.data!.id)
    expect(images[0].ticketId).toBe(result.data!.id)
    expect(images[0].draftId).toBeNull()
    expect(existsSync(uploadPathFromUrl(removed.data!.url))).toBe(false)
    expect(result.data!.observations).toContain(kept.data!.url)
  })

  test('sanitizes ticket observations before saving', async () => {
    const admin = await createUser('ADMIN')
    const { module } = await createTechnologyModule()
    const tracklist = await createTracklist(admin.id)
    actAs(admin)

    const draftId = 'draft-sanitize-create'
    const upload = await uploadImage(imageFormData({ tracklistId: tracklist.id, draftId }))

    const result = await createTicket(tracklist.id, {
      type: TicketType.BUG,
      moduleId: module.id,
      description: 'Ticket sanitizado',
      priority: Priority.MEDIUM,
      draftId,
      observations: `<p onclick="bad()">Texto <strong>válido</strong><script>alert(1)</script></p><img src="${upload.data!.url}" onerror="bad()"><img src="https://example.com/x.png"><iframe src="/uploads/tickets/x.png"></iframe>`,
    })

    expect(result.success).toBe(true)
    if (!result.success) throw new Error(result.error)
    expect(result.data!.observations).toBe(`<p>Texto <strong>válido</strong></p><img src="${upload.data!.url}">`)
  })

  test('reconciles images when editing a ticket', async () => {
    const admin = await createUser('ADMIN')
    const { module } = await createTechnologyModule()
    const tracklist = await createTracklist(admin.id)
    actAs(admin)

    const ticket = await createTicketFixture({ tracklistId: tracklist.id, moduleId: module.id, reportedById: admin.id })
    const kept = await uploadImage(imageFormData({ tracklistId: tracklist.id, ticketId: ticket.id }))
    const removed = await uploadImage(imageFormData({ tracklistId: tracklist.id, ticketId: ticket.id }))

    const result = await updateTicket(ticket.id, tracklist.id, {
      type: TicketType.BUG,
      moduleId: module.id,
      description: 'Ticket editado',
      priority: Priority.HIGH,
      observations: `<p>Queda</p><img src="${kept.data!.url}">`,
    })

    expect(result.success).toBe(true)

    const images = await db.ticketImage.findMany({ orderBy: { id: 'asc' } })
    expect(images.map((image) => image.id)).toEqual([kept.data!.id])
    expect(existsSync(uploadPathFromUrl(removed.data!.url))).toBe(false)
  })

  test('links rejection observation images to the rejected ticket', async () => {
    const admin = await createUser('ADMIN')
    const dev = await createUser('DEV')
    const { technology, module } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(admin.id)
    const { incidence } = await createIncidenceFixture({
      externalWorkItemId: workItem.id,
      technologyId: technology.id,
      status: 'REVIEW',
      assignees: [{ userId: dev.id }],
    })
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: module.id,
      reportedById: admin.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      externalWorkItemId: workItem.id,
      status: 'TEST',
    })
    actAs(admin)

    const upload = await uploadImage(imageFormData({ tracklistId: tracklist.id, ticketId: ticket.id }))
    const result = await rejectTicket({
      ticketId: ticket.id,
      tracklistId: tracklist.id,
      description: 'Rechazo con captura',
      observations: `<p>Falla</p><img src="${upload.data!.url}">`,
    })

    expect(result.success).toBe(true)

    const image = await db.ticketImage.findUniqueOrThrow({ where: { id: upload.data!.id } })
    expect(image.ticketId).toBe(ticket.id)

    const task = await db.task.findFirstOrThrow({ where: { isQaReported: true } })
    expect(task.description).toBe(`<p>Falla</p><img src="${upload.data!.url}">`)
  })
})

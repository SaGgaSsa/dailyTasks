import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { ExternalWorkItemStatus } from '.prisma/client'
import { db } from '@/lib/db'
import {
  externalApiDisabledResponse,
  externalApiUnauthorizedResponse,
  isExternalApiEnabled,
  validateExternalApiSecret,
} from '@/lib/external-api'

interface CreateExternalWorkItemRequest {
  type?: string
  externalId?: number | string
  title?: string
}

export async function POST(request: NextRequest) {
  try {
    if (!isExternalApiEnabled()) {
      return externalApiDisabledResponse()
    }

    if (!validateExternalApiSecret(request.headers.get('x-api-secret'))) {
      return externalApiUnauthorizedResponse()
    }

    const body: CreateExternalWorkItemRequest = await request.json()
    const type = body.type?.trim()
    const title = body.title?.trim()
    const parsedExternalId = Number(body.externalId)

    if (!type || Number.isNaN(parsedExternalId) || !title) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: type, externalId, title' },
        { status: 400 }
      )
    }

    if (!Number.isInteger(parsedExternalId)) {
      return NextResponse.json(
        { error: `externalId inválido: ${body.externalId}` },
        { status: 400 }
      )
    }

    const workItemType = await db.workItemType.findUnique({
      where: { name: type },
      select: { id: true, name: true },
    })

    if (!workItemType) {
      return NextResponse.json(
        { error: `Tipo inválido: ${body.type}` },
        { status: 400 }
      )
    }

    const existingWorkItem = await db.externalWorkItem.findUnique({
      where: { workItemTypeId_externalId: { workItemTypeId: workItemType.id, externalId: parsedExternalId } },
      select: { id: true },
    })

    if (existingWorkItem) {
      return NextResponse.json(
        { error: `ExternalWorkItem ya existe para type=${type} y externalId=${parsedExternalId}` },
        { status: 409 }
      )
    }

    const workItem = await db.externalWorkItem.create({
      data: {
        workItemTypeId: workItemType.id,
        externalId: parsedExternalId,
        title,
        status: ExternalWorkItemStatus.ACTIVE,
      },
      include: {
        workItemType: {
          select: { name: true },
        },
      },
    })

    revalidateTag('external-work-items', 'default')

    return NextResponse.json(
      {
        success: true,
        id: workItem.id,
        type: workItem.workItemType.name,
        externalId: workItem.externalId,
        title: workItem.title,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creando external work item:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

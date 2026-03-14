import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { TaskType } from '@/types/enums'

interface CreateExternalWorkItemRequest {
  type?: string
  externalId?: number | string
  title?: string
}

function validateApiSecret(request: NextRequest) {
  const apiSecret = request.headers.get('x-api-secret')
  return apiSecret && apiSecret === process.env.EXTERNAL_API_SECRET
}

export async function POST(request: NextRequest) {
  try {
    if (!validateApiSecret(request)) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const body: CreateExternalWorkItemRequest = await request.json()
    const type = body.type as TaskType | undefined
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

    if (!Object.values(TaskType).includes(type)) {
      return NextResponse.json(
        { error: `Tipo inválido: ${body.type}` },
        { status: 400 }
      )
    }

    const existingWorkItem = await db.externalWorkItem.findUnique({
      where: { type_externalId: { type, externalId: parsedExternalId } },
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
        type,
        externalId: parsedExternalId,
        title,
      },
    })

    revalidateTag('external-work-items', 'default')

    return NextResponse.json(
      {
        success: true,
        id: workItem.id,
        type: workItem.type,
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

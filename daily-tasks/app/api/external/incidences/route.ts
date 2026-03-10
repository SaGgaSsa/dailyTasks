import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { TaskType, Priority, TaskStatus } from '@/types/enums'

export async function POST(request: NextRequest) {
  try {
    const apiSecret = request.headers.get('x-api-secret')

    if (!apiSecret) {
      return NextResponse.json(
        { error: 'Header x-api-secret es requerido' },
        { status: 401 }
      )
    }

    if (apiSecret !== process.env.EXTERNAL_API_SECRET) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const { type, externalId, title, technology } = body

    if (!type || !externalId || !title || !technology) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos: type, externalId, title, technology' },
        { status: 400 }
      )
    }

    const taskType = type as TaskType

    if (!Object.values(TaskType).includes(taskType)) {
      return NextResponse.json(
        { success: false, error: `Tipo inválido: ${type}` },
        { status: 400 }
      )
    }

    const tech = await db.technology.findUnique({ where: { name: technology } })
    if (!tech) {
      return NextResponse.json(
        { success: false, error: `Tecnología inválida: ${technology}` },
        { status: 400 }
      )
    }

    const workItem = await db.externalWorkItem.upsert({
      where: { type_externalId: { type: taskType, externalId: Number(externalId) } },
      create: { type: taskType, externalId: Number(externalId), title },
      update: { title },
    })

    const incidence = await db.incidence.create({
      data: {
        externalWorkItemId: workItem.id,
        description: title,
        technologyId: tech.id,
        status: TaskStatus.BACKLOG,
        priority: Priority.MEDIUM,
        estimatedTime: 0,
        comment: title,
      },
    })

    return NextResponse.json(
      { success: true, incidenceId: incidence.id, externalWorkItemId: workItem.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en ingesta externa:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

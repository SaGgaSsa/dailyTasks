import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { TaskType, TechStack, Priority, TaskStatus } from '@/types/enums'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { type, externalId, title, technology } = body

    if (!type || !externalId || !title || !technology) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos: type, externalId, title, technology' },
        { status: 400 }
      )
    }

    const taskType = type as TaskType
    const tech = technology as TechStack

    if (!Object.values(TaskType).includes(taskType)) {
      return NextResponse.json(
        { success: false, error: `Tipo inválido: ${type}` },
        { status: 400 }
      )
    }

    if (!Object.values(TechStack).includes(tech)) {
      return NextResponse.json(
        { success: false, error: `Tecnología inválida: ${technology}` },
        { status: 400 }
      )
    }

    const existing = await db.incidence.findUnique({
      where: {
        type_externalId: {
          type: taskType,
          externalId: Number(externalId),
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'La incidencia ya existe' },
        { status: 409 }
      )
    }

    const incidence = await db.incidence.create({
      data: {
        type: taskType,
        externalId: Number(externalId),
        title,
        technology: tech,
        status: TaskStatus.BACKLOG,
        priority: Priority.MEDIUM,
        estimatedTime: 0,
        description: title,
      },
    })

    return NextResponse.json(
      { success: true, id: incidence.id },
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

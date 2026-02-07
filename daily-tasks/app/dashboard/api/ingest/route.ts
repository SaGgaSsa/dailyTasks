import { NextRequest, NextResponse } from 'next/server'
import { db } from "@/lib/db"

// Mapeo de status de texto a ENUM de Prisma
const statusMap: Record<string, 'PENDING' | 'ANALYSIS' | 'DEVELOPMENT' | 'TESTING' | 'DONE'> = {
  'pendiente': 'PENDING',
  'analysis': 'ANALYSIS',
  'desarrollo': 'DEVELOPMENT',
  'testing': 'TESTING',
  'pruebas': 'TESTING',
  'done': 'DONE',
  'completado': 'DONE',
}

interface TaskPayload {
  title: string
  description?: string
  status: string
  userEmail?: string
  estimatedHours: number
}

interface IngestResponse {
  success: boolean
  created: number
  failed: number
  errors: string[]
  details: {
    created: string[]
    failed: Array<{ title: string; error: string }>
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validar header de seguridad
    const apiSecret = request.headers.get('x-api-secret')

    if (!apiSecret) {
      return NextResponse.json(
        { error: 'Header x-api-secret es requerido' },
        { status: 401 }
      )
    }

    if (apiSecret !== process.env.INGEST_SECRET) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Parsear el body
    const body = await request.json()

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: 'El payload debe ser un array de tareas' },
        { status: 400 }
      )
    }

    if (body.length === 0) {
      return NextResponse.json(
        { error: 'El array de tareas no puede estar vacío' },
        { status: 400 }
      )
    }

    const response: IngestResponse = {
      success: true,
      created: 0,
      failed: 0,
      errors: [],
      details: {
        created: [],
        failed: []
      }
    }

    // Procesar cada tarea
    for (const taskData of body) {
      try {
        // Validar campos requeridos
        if (!taskData.title) {
          throw new Error('El campo title es requerido')
        }

        if (!taskData.estimatedHours && taskData.estimatedHours !== 0) {
          throw new Error('El campo estimatedHours es requerido')
        }

        // Mapear status
        const status = statusMap[taskData.status.toLowerCase()]
        if (!status) {
          throw new Error(`Status inválido: ${taskData.status}. Valores permitidos: pendiente, analysis, desarrollo, testing, done`)
        }

        // Buscar usuario si se proporciona email
        let assigneeId: string | undefined = undefined
        if (taskData.userEmail) {
          const user = await db.user.findUnique({
            where: { email: taskData.userEmail }
          })

          if (!user) {
            throw new Error(`Usuario con email ${taskData.userEmail} no encontrado`)
          }
          assigneeId = user.id
        }

        // TODO: Update to use db.incidence (Schema change: Task -> Incidence)
        // Missing required fields: type, externalId, technology
        /*
        const task = await db.task.create({
          data: {
            title: taskData.title,
            description: taskData.description || null,
            status,
            estimatedHours: taskData.estimatedHours,
            creatorId: 'admin', // Podría ser dinámico según el usuario que hace la ingesta
            assigneeId
          }
        })
        
        response.created++
        response.details.created.push(task.id)
        */
        throw new Error("Ingest endpoint temporarily disabled due to schema migration (Task -> Incidence).");


      } catch (error) {
        response.failed++
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        response.errors.push(errorMessage)
        response.details.failed.push({
          title: taskData.title || 'Tarea sin título',
          error: errorMessage
        })
      }
    }

    // Determinar si hubo fallos
    if (response.failed > 0) {
      response.success = false
    }

    return NextResponse.json(response, {
      status: response.success ? 200 : 207 // 207 Multi-Status para respuestas parciales
    })

  } catch (error) {
    console.error('Error en endpoint de ingesta:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
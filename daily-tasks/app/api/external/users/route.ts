import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { UserRole } from '@/types/enums'
import bcrypt from 'bcryptjs'

interface CreateUserRequest {
  email: string
  username: string
  name: string
}

async function validateApiSecret(request: NextRequest): Promise<boolean> {
  const apiSecret = request.headers.get('x-api-secret')
  if (!apiSecret || apiSecret !== process.env.EXTERNAL_API_SECRET) {
    return false
  }
  return true
}

export async function POST(request: NextRequest) {
  try {
    if (!(await validateApiSecret(request))) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const body: CreateUserRequest = await request.json()

    const { email, username, name } = body

    if (!email || !username || !name) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: email, username, name' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      )
    }

    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    })

    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json(
          { error: 'El email ya está registrado' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'El username ya está registrado' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash('sisa0314', 10)

    const allTechs = await db.technology.findMany()
    const technologies = allTechs.map(t => ({ connect: { id: t.id } }))

    const user = await db.user.create({
      data: {
        email,
        username,
        name,
        password: hashedPassword,
        role: UserRole.DEV,
        technologies: technologies as never,
      },
    })

    return NextResponse.json(
      {
        success: true,
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creando usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await validateApiSecret(request))) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'El parámetro id es requerido' },
        { status: 400 }
      )
    }

    const userId = parseInt(id, 10)
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const existingUser = await db.user.findUnique({
      where: { id: userId },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    await db.user.delete({
      where: { id: userId },
    })

    return NextResponse.json(
      { success: true, message: 'Usuario eliminado correctamente' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error eliminando usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkTeacherAuth, unauthorizedResponse } from '@/lib/auth'

/**
 * GET /api/subjects
 * Lista todas las materias con conteo de sesiones y asistencias.
 * Requiere password de maestro.
 */
export async function GET(req: NextRequest) {
  if (!checkTeacherAuth(req)) {
    return unauthorizedResponse()
  }
  const subjects = await db.subject.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { sessions: true } },
    },
  })
  return NextResponse.json({ subjects })
}

/**
 * POST /api/subjects
 * Crea una nueva materia.
 * Body: { name: string, color?: string (hex sin #) }
 * Requiere password de maestro.
 */
export async function POST(req: NextRequest) {
  if (!checkTeacherAuth(req)) {
    return unauthorizedResponse()
  }
  const body = await req.json().catch(() => ({}))
  const name = String(body.name || '').replace(/<[^>]*>/g, '').trim().slice(0, 200)
  const color = String(body.color || '0f766e').replace(/[^0-9a-fA-F]/g, '').slice(0, 6) || '0f766e'

  if (!name) {
    return NextResponse.json(
      { error: 'El nombre de la materia es obligatorio' },
      { status: 400 }
    )
  }

  const subject = await db.subject.create({
    data: { name, color },
  })
  return NextResponse.json({ subject }, { status: 201 })
}

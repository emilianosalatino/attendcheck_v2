import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomBytes } from 'crypto'
import { checkTeacherAuth, unauthorizedResponse } from '@/lib/auth'

/**
 * GET /api/sessions
 * Lista todas las sesiones de clase (panel del profesor).
 * Incluye info de la materia y conteo de asistencias.
 * Requiere password de maestro (header X-Teacher-Password).
 */
export async function GET(req: NextRequest) {
  if (!checkTeacherAuth(req)) {
    return unauthorizedResponse()
  }
  const sessions = await db.classSession.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      subject: { select: { id: true, name: true, color: true } },
      _count: { select: { attendances: true } },
    },
  })
  return NextResponse.json({ sessions })
}

/**
 * POST /api/sessions
 * Crea una nueva sesion de clase y genera un token unico para el QR.
 * Requiere password de maestro (header X-Teacher-Password).
 *
 * Body: {
 *   name: string,
 *   durationMin?: number (default 15),
 *   subjectId?: string (FK a Subject, opcional),
 *   expectedStudents?: number (default 0 = no especificado)
 * }
 */
export async function POST(req: NextRequest) {
  if (!checkTeacherAuth(req)) {
    return unauthorizedResponse()
  }

  const body = await req.json().catch(() => ({}))
  // Sanitizar name: strip HTML tags para evitar XSS almacenado
  const rawName = String(body.name || '').trim()
  const name = rawName
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, 200)

  const durationMin = Math.max(1, Math.min(480, Number(body.durationMin) || 15))
  const expectedStudents = Math.max(0, Math.min(500, Number(body.expectedStudents) || 0))
  const subjectId = body.subjectId
    ? String(body.subjectId).replace(/[^a-zA-Z0-9_-]/g, '')
    : null

  if (!name) {
    return NextResponse.json(
      { error: 'El nombre de la clase es obligatorio' },
      { status: 400 }
    )
  }

  // Si subjectId viene, validar que exista
  if (subjectId) {
    const sub = await db.subject.findUnique({ where: { id: subjectId }, select: { id: true } })
    if (!sub) {
      return NextResponse.json({ error: 'Materia no encontrada' }, { status: 400 })
    }
  }

  const token = randomBytes(16).toString('hex') // 32 chars = 128 bits
  const startsAt = new Date()
  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000)

  const session = await db.classSession.create({
    data: {
      name,
      token,
      subjectId: subjectId || null,
      startsAt,
      endsAt,
      durationMin,
      expectedStudents,
      isActive: true,
    },
    include: { subject: { select: { id: true, name: true, color: true } } },
  })

  return NextResponse.json({ session }, { status: 201 })
}

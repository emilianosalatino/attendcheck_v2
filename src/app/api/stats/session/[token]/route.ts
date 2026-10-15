import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkTeacherAuth, unauthorizedResponse } from '@/lib/auth'

/**
 * GET /api/stats/session/[token]
 * Estadisticas de una sesion especifica.
 *
 * Devuelve:
 *   - session: info de la sesion (nombre, fecha, materia, esperados, ventana)
 *   - attendances: lista de asistencias (con nombre completo, matricula, hora, flagged)
 *   - stats: { total, limpias, sospechosas, expected, percent }
 *
 * Requiere password de maestro.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!checkTeacherAuth(req)) {
    return unauthorizedResponse()
  }
  const { token } = await params
  const session = await db.classSession.findUnique({
    where: { token },
    include: {
      subject: { select: { id: true, name: true, color: true } },
    },
  })
  if (!session) {
    return NextResponse.json({ error: 'Sesion no encontrada' }, { status: 404 })
  }
  const attendances = await db.attendance.findMany({
    where: { sessionId: session.id },
    orderBy: { submittedAt: 'asc' },
  })

  const total = attendances.length
  const sospechosas = attendances.filter((a) => a.flagged).length
  const limpias = total - sospechosas
  const expected = session.expectedStudents || 0
  const percent = expected > 0 ? Math.round((total / expected) * 100) : null

  return NextResponse.json({
    session: {
      id: session.id,
      name: session.name,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      isActive: session.isActive,
      expectedStudents: session.expectedStudents,
      subject: session.subject
        ? { id: session.subject.id, name: session.subject.name, color: session.subject.color }
        : null,
    },
    attendances: attendances.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      studentGivenNames: a.studentGivenNames,
      studentPaternalSurname: a.studentPaternalSurname,
      studentMaternalSurname: a.studentMaternalSurname,
      submittedAt: a.submittedAt,
      flagged: a.flagged,
      flagReason: a.flagReason,
      ip: a.ip,
    })),
    stats: {
      total,
      limpias,
      sospechosas,
      expected,
      percent,
    },
  })
}

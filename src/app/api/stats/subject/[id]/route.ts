import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkTeacherAuth, unauthorizedResponse } from '@/lib/auth'

/**
 * GET /api/stats/subject/[id]
 * Estadisticas globales por materia.
 *
 * Devuelve:
 *   - subject: info de la materia
 *   - sessions: lista de sesiones de esta materia con # asistencias cada una
 *   - students: lista de alumnos (matricula + nombre) con # sesiones a las que asistieron
 *   - totals: { totalSesiones, totalAlumnosUnicos, totalAsistencias }
 *
 * Requiere password de maestro.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkTeacherAuth(req)) {
    return unauthorizedResponse()
  }
  const { id } = await params
  const subject = await db.subject.findUnique({
    where: { id },
    select: { id: true, name: true, color: true, createdAt: true },
  })
  if (!subject) {
    return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })
  }

  // Sesiones de esta materia con conteo de asistencias
  const sessions = await db.classSession.findMany({
    where: { subjectId: id },
    orderBy: { startsAt: 'desc' },
    include: { _count: { select: { attendances: true } } },
  })

  // Asistencias de todas las sesiones de esta materia
  const sessionIds = sessions.map((s) => s.id)
  const attendances = await db.attendance.findMany({
    where: { sessionId: { in: sessionIds } },
    select: {
      studentId: true,
      studentGivenNames: true,
      studentPaternalSurname: true,
      studentMaternalSurname: true,
      submittedAt: true,
      sessionId: true,
      flagged: true,
    },
  })

  // Agrupar por studentId
  const studentsMap = new Map<
    string,
    {
      studentId: string
      studentGivenNames: string
      studentPaternalSurname: string
      studentMaternalSurname: string | null
      attendanceCount: number
      flaggedCount: number
      sessionsAttended: string[]
      firstSeen: Date
      lastSeen: Date
    }
  >()

  attendances.forEach((a) => {
    const existing = studentsMap.get(a.studentId)
    if (existing) {
      existing.attendanceCount++
      if (a.flagged) existing.flaggedCount++
      existing.sessionsAttended.push(a.sessionId)
      if (a.submittedAt < existing.firstSeen) existing.firstSeen = a.submittedAt
      if (a.submittedAt > existing.lastSeen) existing.lastSeen = a.submittedAt
    } else {
      studentsMap.set(a.studentId, {
        studentId: a.studentId,
        studentGivenNames: a.studentGivenNames,
        studentPaternalSurname: a.studentPaternalSurname,
        studentMaternalSurname: a.studentMaternalSurname,
        attendanceCount: 1,
        flaggedCount: a.flagged ? 1 : 0,
        sessionsAttended: [a.sessionId],
        firstSeen: a.submittedAt,
        lastSeen: a.submittedAt,
      })
    }
  })

  const students = Array.from(studentsMap.values())
    .sort((a, b) => a.studentPaternalSurname.localeCompare(b.studentPaternalSurname))
    .map((s) => ({
      studentId: s.studentId,
      studentGivenNames: s.studentGivenNames,
      studentPaternalSurname: s.studentPaternalSurname,
      studentMaternalSurname: s.studentMaternalSurname,
      attendanceCount: s.attendanceCount,
      flaggedCount: s.flaggedCount,
      totalSessions: sessions.length,
      percent: sessions.length > 0 ? Math.round((s.attendanceCount / sessions.length) * 100) : 0,
      firstSeen: s.firstSeen,
      lastSeen: s.lastSeen,
    }))

  return NextResponse.json({
    subject: {
      id: subject.id,
      name: subject.name,
      color: subject.color,
      createdAt: subject.createdAt,
    },
    sessions: sessions.map((s) => ({
      id: s.id,
      name: s.name,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      isActive: s.isActive,
      expectedStudents: s.expectedStudents,
      attendanceCount: s._count.attendances,
      token: s.token,
    })),
    students,
    totals: {
      totalSesiones: sessions.length,
      totalAlumnosUnicos: students.length,
      totalAsistencias: attendances.length,
      promedioAsistencia:
        students.length > 0 && sessions.length > 0
          ? Math.round(
              (attendances.length / (students.length * sessions.length)) * 100
            )
          : null,
    },
  })
}

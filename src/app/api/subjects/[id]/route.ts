import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkTeacherAuth, unauthorizedResponse } from '@/lib/auth'

/**
 * PATCH /api/subjects/[id]
 * Actualiza el nombre o color de una materia.
 * Body: { name?: string, color?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkTeacherAuth(req)) {
    return unauthorizedResponse()
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const data: { name?: string; color?: string } = {}
  if (body.name !== undefined) {
    data.name = String(body.name).replace(/<[^>]*>/g, '').trim().slice(0, 200)
    if (!data.name) {
      return NextResponse.json({ error: 'Nombre invalido' }, { status: 400 })
    }
  }
  if (body.color !== undefined) {
    data.color = String(body.color).replace(/[^0-9a-fA-F]/g, '').slice(0, 6) || '0f766e'
  }
  try {
    const subject = await db.subject.update({ where: { id }, data })
    return NextResponse.json({ subject })
  } catch {
    return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })
  }
}

/**
 * DELETE /api/subjects/[id]
 * Borra una materia. Las sesiones quedan sin subjectId (onDelete: SetNull).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkTeacherAuth(req)) {
    return unauthorizedResponse()
  }
  const { id } = await params
  try {
    await db.subject.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Materia no encontrada' }, { status: 404 })
  }
}

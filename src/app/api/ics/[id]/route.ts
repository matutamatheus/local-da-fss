import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import ical, { ICalCalendarMethod } from 'ical-generator'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: evento } = await supabase
    .from('solicitacoes')
    .select('*, espaco:espacos(nome)')
    .eq('id', id)
    .eq('status', 'aprovado')
    .single()

  if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const calendar = ical({
    name: 'Local da FSS',
    method: ICalCalendarMethod.PUBLISH,
  })

  calendar.createEvent({
    id: evento.id,
    start: new Date(evento.data_inicio),
    end: new Date(evento.data_fim),
    summary: evento.titulo,
    description: evento.descricao || '',
    location: (evento.espaco as any)?.nome || '',
  })

  return new NextResponse(calendar.toString(), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="evento-${id}.ics"`,
    },
  })
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import ical, { ICalCalendarMethod } from 'ical-generator'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: eventos } = await supabase
    .from('solicitacoes')
    .select('*, espaco:espacos(nome)')
    .eq('status', 'aprovado')

  const calendar = ical({
    name: 'Local da FSS - Eventos',
    method: ICalCalendarMethod.PUBLISH,
  })

  for (const evento of eventos || []) {
    calendar.createEvent({
      id: evento.id,
      start: new Date(evento.data_inicio),
      end: new Date(evento.data_fim),
      summary: evento.titulo,
      description: evento.descricao || '',
      location: (evento.espaco as any)?.nome || '',
    })
  }

  return new NextResponse(calendar.toString(), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="local-da-fss.ics"',
    },
  })
}

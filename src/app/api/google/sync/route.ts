import { createClient } from '@/lib/supabase/server'
import { createCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Buscar tokens do usuário
  const { data: tokenData } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', user.id)
    .eq('sync_enabled', true)
    .single()

  if (!tokenData) {
    return NextResponse.json({ error: 'Google Calendar não conectado' }, { status: 400 })
  }

  // Verificar se é admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Buscar eventos aprovados
  let query = supabase
    .from('solicitacoes')
    .select('*, espaco:espacos(nome)')
    .eq('status', 'aprovado')

  // Solicitante só sincroniza os próprios eventos
  if (!isAdmin) {
    query = query.eq('solicitante_id', user.id)
  }

  const { data: eventos } = await query

  if (!eventos?.length) {
    return NextResponse.json({ message: 'Nenhum evento para sincronizar', synced: 0 })
  }

  const tokens = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expiry_date: tokenData.expiry_date,
  }

  let synced = 0
  let errors = 0

  for (const evento of eventos) {
    // Pular se já foi sincronizado
    if (evento.google_event_id) continue

    try {
      const gcalEvent = await createCalendarEvent(tokens, tokenData.calendar_id, {
        summary: evento.titulo,
        description: evento.descricao || '',
        location: (evento.espaco as any)?.nome || '',
        start: evento.data_inicio,
        end: evento.data_fim,
      })

      // Salvar o ID do evento no Google Calendar
      if (gcalEvent.id) {
        await supabase
          .from('solicitacoes')
          .update({ google_event_id: gcalEvent.id })
          .eq('id', evento.id)
      }

      synced++
    } catch (err) {
      console.error(`Erro ao sincronizar evento ${evento.id}:`, err)
      errors++
    }
  }

  return NextResponse.json({ synced, errors, total: eventos.length })
}

// DELETE - remover eventos cancelados do Google Calendar
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: tokenData } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!tokenData) {
    return NextResponse.json({ error: 'Google Calendar não conectado' }, { status: 400 })
  }

  // Buscar eventos cancelados/recusados que têm google_event_id
  const { data: eventos } = await supabase
    .from('solicitacoes')
    .select('id, google_event_id')
    .in('status', ['cancelado', 'recusado'])
    .not('google_event_id', 'is', null)

  const tokens = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expiry_date: tokenData.expiry_date,
  }

  let removed = 0

  for (const evento of eventos || []) {
    try {
      await deleteCalendarEvent(tokens, tokenData.calendar_id, evento.google_event_id!)
      await supabase
        .from('solicitacoes')
        .update({ google_event_id: null })
        .eq('id', evento.id)
      removed++
    } catch (err) {
      console.error(`Erro ao remover evento ${evento.id} do Google:`, err)
    }
  }

  return NextResponse.json({ removed })
}

'use client'

import { useState, useEffect, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import multiMonthPlugin from '@fullcalendar/multimonth'
import interactionPlugin from '@fullcalendar/interaction'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Download, CalendarPlus, UserPlus, X, ChevronRight, Users, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// Status colors — PRD palette
const RESERVA_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  agendada:     { bg: '#C0392B', border: '#922b21', text: '#fff', label: 'Agendada' },
  pre_reservada:{ bg: '#F39C12', border: '#b7770a', text: '#fff', label: 'Pré-reservada' },
  aberta:       { bg: '#27AE60', border: '#1e8449', text: '#fff', label: 'Aberta' },
  cancelada:    { bg: '#7F8C8D', border: '#566573', text: '#fff', label: 'Cancelada' },
  bloqueio:     { bg: '#7F8C8D', border: '#566573', text: '#fff', label: 'Bloqueio' },
  // legacy solicitacoes
  aprovado:     { bg: '#27AE60', border: '#1e8449', text: '#fff', label: 'Aprovado' },
  pendente:     { bg: '#F39C12', border: '#b7770a', text: '#fff', label: 'Pendente' },
  recusado:     { bg: '#C0392B', border: '#922b21', text: '#fff', label: 'Recusado' },
}

interface CalEvent {
  id: string
  title: string
  start: string
  end: string
  backgroundColor: string
  borderColor: string
  textColor: string
  extendedProps: {
    tipo: 'reserva' | 'solicitacao'
    status: string
    cliente_nome?: string
    espaco_nome?: string
    num_participantes?: number
    audiovisual?: boolean
    reserva_id?: string
  }
}

interface DayReserva {
  id: string
  tipo: 'reserva' | 'solicitacao'
  title: string
  status: string
  cliente_nome?: string
  espaco_nome?: string
  num_participantes?: number
  audiovisual?: boolean
  data_entrada?: string
  data_saida?: string
  reserva_id?: string
}

export function Calendario({ isAdmin = false }: { isAdmin?: boolean }) {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayReservas, setDayReservas] = useState<DayReserva[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const calRef = useRef<FullCalendar>(null)

  useEffect(() => {
    loadEvents()
  }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadEvents() {
    setLoadingEvents(true)
    const supabase = createClient()
    const mapped: CalEvent[] = []

    // Load reservas
    const { data: reservas } = await supabase
      .from('reservas')
      .select('id, status, data_entrada, data_saida, num_participantes, audiovisual, cliente:clientes(nome), espaco:espacos(nome)')
      .not('status', 'eq', 'cancelada')

    if (reservas) {
      for (const r of reservas) {
        const col = RESERVA_COLORS[r.status] ?? RESERVA_COLORS.aberta
        const clienteNome = (r.cliente as any)?.nome ?? '—'
        mapped.push({
          id: `res_${r.id}`,
          title: clienteNome,
          start: r.data_entrada,
          end: r.data_saida,
          backgroundColor: col.bg,
          borderColor: col.border,
          textColor: col.text,
          extendedProps: {
            tipo: 'reserva',
            status: r.status,
            cliente_nome: clienteNome,
            espaco_nome: (r.espaco as any)?.nome ?? '—',
            num_participantes: r.num_participantes,
            audiovisual: r.audiovisual,
            reserva_id: r.id,
          },
        })
      }
    }

    // Load solicitacoes (legacy)
    const { data: sols } = await supabase
      .from('solicitacoes')
      .select('id, titulo, status, data_inicio, data_fim, num_participantes, espaco:espacos(nome), solicitante:profiles(nome)')
      .in('status', ['aprovado', 'pendente'])

    if (sols) {
      for (const s of sols) {
        const col = RESERVA_COLORS[s.status] ?? RESERVA_COLORS.aberta
        mapped.push({
          id: `sol_${s.id}`,
          title: s.titulo,
          start: s.data_inicio,
          end: s.data_fim,
          backgroundColor: col.bg + 'cc',
          borderColor: col.border,
          textColor: col.text,
          extendedProps: {
            tipo: 'solicitacao',
            status: s.status,
            cliente_nome: (s.solicitante as any)?.nome ?? '—',
            espaco_nome: (s.espaco as any)?.nome ?? '—',
            num_participantes: s.num_participantes,
          },
        })
      }
    }

    // Load bloqueios
    const { data: bloqueios } = await supabase
      .from('bloqueios')
      .select('id, data_inicio, data_fim, motivo')

    if (bloqueios) {
      for (const b of bloqueios) {
        const col = RESERVA_COLORS.bloqueio
        mapped.push({
          id: `bloq_${b.id}`,
          title: b.motivo || 'Bloqueio',
          start: b.data_inicio,
          end: b.data_fim,
          backgroundColor: col.bg,
          borderColor: col.border,
          textColor: col.text,
          extendedProps: {
            tipo: 'reserva',
            status: 'bloqueio',
            espaco_nome: 'Bloqueio interno',
          },
        })
      }
    }

    setEvents(mapped)
    setLoadingEvents(false)
  }

  function handleDateClick(info: { dateStr: string }) {
    const date = info.dateStr
    setSelectedDate(date)
    const clickedDate = new Date(date + 'T12:00:00')
    const dayEvents = events.filter(e => {
      const start = new Date(e.start.substring(0, 10) + 'T00:00:00')
      const end = new Date(e.end.substring(0, 10) + 'T00:00:00')
      return clickedDate >= start && clickedDate < end
    })
    setDayReservas(dayEvents.map(e => ({
      id: e.id,
      tipo: e.extendedProps.tipo,
      title: e.title,
      status: e.extendedProps.status,
      cliente_nome: e.extendedProps.cliente_nome,
      espaco_nome: e.extendedProps.espaco_nome,
      num_participantes: e.extendedProps.num_participantes,
      audiovisual: e.extendedProps.audiovisual,
      reserva_id: e.extendedProps.reserva_id,
    })))
    setPanelOpen(true)
  }

  function handleEventClick(info: any) {
    const event = events.find(e => e.id === info.event.id)
    if (!event) return
    // Use start date of the event
    handleDateClick({ dateStr: event.start.substring(0, 10) })
  }

  function handleDownloadAllIcs() {
    window.open('/api/ics', '_blank')
  }

  const statusCounts = events.reduce((acc, e) => {
    const s = e.extendedProps.status
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Legend */}
          {[
            { key: 'agendada', label: 'Agendada' },
            { key: 'pre_reservada', label: 'Pré-reservada' },
            { key: 'aberta', label: 'Aberta' },
          ].map(s => (
            <span key={s.key} className="flex items-center gap-1.5 text-xs text-[var(--gray-600)]">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: RESERVA_COLORS[s.key]?.bg }} />
              {s.label}
              {statusCounts[s.key] ? <span className="text-[var(--gray-400)]">({statusCounts[s.key]})</span> : null}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Link href="/reservas/nova">
            <Button size="sm">
              <CalendarPlus size={15} /> Bookar Data
            </Button>
          </Link>
          <Link href="/clientes/novo">
            <Button variant="secondary" size="sm">
              <UserPlus size={15} /> Novo Cliente
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={handleDownloadAllIcs}>
            <Download size={15} /> .ics
          </Button>
        </div>
      </div>

      {loadingEvents && (
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 mb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 w-32 bg-[var(--gray-200)] rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 w-20 bg-[var(--gray-200)] rounded animate-pulse" />
              <div className="h-8 w-20 bg-[var(--gray-200)] rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 bg-[var(--gray-100)] rounded animate-pulse" />
            ))}
          </div>
        </div>
      )}

      <div className={`bg-white rounded-xl border border-[var(--gray-200)] p-4 ${loadingEvents ? 'hidden' : ''}`}>
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, multiMonthPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'multiMonthYear,dayGridMonth',
          }}
          views={{
            multiMonthYear: {
              type: 'multiMonth',
              duration: { months: 12 },
              buttonText: '12 meses',
            },
          }}
          locale="pt-br"
          buttonText={{
            today: 'Hoje',
            month: 'Mês',
          }}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="auto"
          editable={false}
          dayMaxEvents={3}
          eventDisplay="block"
          multiMonthMaxColumns={3}
        />
      </div>

      {/* Side Panel */}
      <AnimatePresence>
      {panelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPanelOpen(false)}
          />
          {/* Panel */}
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white border-l border-[var(--gray-200)] shadow-xl z-50 flex flex-col overflow-hidden"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--gray-200)] bg-[var(--gray-50)]">
              <div>
                <p className="text-xs text-[var(--gray-500)]">Selecionado</p>
                <p className="font-semibold text-[var(--gray-900)]">
                  {selectedDate
                    ? format(new Date(selectedDate + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })
                    : '—'}
                </p>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--gray-200)] text-[var(--gray-400)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick actions */}
            <div className="px-5 py-3 border-b border-[var(--gray-100)] flex gap-2">
              <Link
                href={`/reservas/nova${selectedDate ? `?data=${selectedDate}` : ''}`}
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--primary)] text-white rounded-lg py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                onClick={() => setPanelOpen(false)}
              >
                <CalendarPlus size={15} /> Bookar Data
              </Link>
              <Link
                href="/clientes/novo"
                className="flex-1 flex items-center justify-center gap-2 border border-[var(--gray-200)] text-[var(--gray-700)] rounded-lg py-2 text-sm font-medium hover:bg-[var(--gray-50)]"
                onClick={() => setPanelOpen(false)}
              >
                <UserPlus size={15} /> Novo Cliente
              </Link>
            </div>

            {/* Reservations list */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {dayReservas.length === 0 ? (
                <div className="text-center py-10 text-[var(--gray-400)]">
                  <CalendarPlus size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Nenhuma reserva neste dia</p>
                  <p className="text-xs mt-1">Clique em "Bookar Data" para criar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-[var(--gray-400)] uppercase font-medium tracking-wide">
                    {dayReservas.length} reserva(s)
                  </p>
                  {dayReservas.map(r => {
                    const col = RESERVA_COLORS[r.status]
                    const href = r.tipo === 'reserva' && r.reserva_id
                      ? `/reservas/${r.reserva_id}`
                      : '#'
                    return (
                      <Link
                        key={r.id}
                        href={href}
                        onClick={() => setPanelOpen(false)}
                        className="block bg-[var(--gray-50)] border border-[var(--gray-100)] rounded-xl p-3 hover:border-[var(--gray-200)] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="font-semibold text-sm text-[var(--gray-900)] truncate">{r.title}</p>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 text-white"
                            style={{ backgroundColor: col?.bg }}
                          >
                            {col?.label ?? r.status}
                          </span>
                        </div>
                        {r.cliente_nome && r.cliente_nome !== r.title && (
                          <p className="text-xs text-[var(--gray-500)] mb-1">{r.cliente_nome}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-[var(--gray-400)]">
                          {r.num_participantes && (
                            <span className="flex items-center gap-1">
                              <Users size={10} /> {r.num_participantes}p
                            </span>
                          )}
                          {r.audiovisual && (
                            <span className="flex items-center gap-1">
                              <Mic size={10} /> AV
                            </span>
                          )}
                          {r.espaco_nome && <span>{r.espaco_nome}</span>}
                        </div>
                        {r.tipo === 'reserva' && (
                          <p className="text-xs text-[var(--primary)] mt-2 flex items-center gap-0.5">
                            Ver reserva <ChevronRight size={11} />
                          </p>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>
    </div>
  )
}

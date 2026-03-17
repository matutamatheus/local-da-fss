'use client'

import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Download } from 'lucide-react'
import type { EventStatus } from '@/lib/types'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  backgroundColor?: string
  extendedProps: {
    descricao: string
    status: EventStatus
    espaco_nome: string
    solicitante_nome: string
    num_participantes: number
  }
}

export function Calendario({ isAdmin = false }: { isAdmin?: boolean }) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    async function loadEvents() {
      const supabase = createClient()
      let query = supabase
        .from('solicitacoes')
        .select('*, espaco:espacos(nome), solicitante:profiles(nome)')
        .eq('status', 'aprovado')

      if (!isAdmin) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          query = supabase
            .from('solicitacoes')
            .select('*, espaco:espacos(nome), solicitante:profiles(nome)')
            .eq('status', 'aprovado')
        }
      }

      const { data } = await query
      if (data) {
        setEvents(data.map((sol) => ({
          id: sol.id,
          title: sol.titulo,
          start: sol.data_inicio,
          end: sol.data_fim,
          backgroundColor: 'var(--primary)',
          extendedProps: {
            descricao: sol.descricao,
            status: sol.status as EventStatus,
            espaco_nome: (sol.espaco as any)?.nome || '—',
            solicitante_nome: (sol.solicitante as any)?.nome || '—',
            num_participantes: sol.num_participantes,
          },
        })))
      }
    }
    loadEvents()
  }, [isAdmin])

  function handleEventClick(info: any) {
    const event = events.find(e => e.id === info.event.id)
    if (event) {
      setSelectedEvent(event)
      setShowModal(true)
    }
  }

  function handleDownloadIcs() {
    if (!selectedEvent) return
    window.open(`/api/ics/${selectedEvent.id}`, '_blank')
  }

  function handleDownloadAllIcs() {
    window.open('/api/ics', '_blank')
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="secondary" size="sm" onClick={handleDownloadAllIcs}>
          <Download size={16} /> Exportar .ics
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          locale="pt-br"
          buttonText={{
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            day: 'Dia',
          }}
          events={events}
          eventClick={handleEventClick}
          height="auto"
          editable={false}
        />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Detalhes do Evento">
        {selectedEvent && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
            <StatusBadge status={selectedEvent.extendedProps.status} />

            {selectedEvent.extendedProps.descricao && (
              <p className="text-sm text-[var(--gray-600)]">{selectedEvent.extendedProps.descricao}</p>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-[var(--gray-500)] uppercase font-medium">Início</p>
                <p>{format(new Date(selectedEvent.start), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--gray-500)] uppercase font-medium">Término</p>
                <p>{format(new Date(selectedEvent.end), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--gray-500)] uppercase font-medium">Espaço</p>
                <p>{selectedEvent.extendedProps.espaco_nome}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--gray-500)] uppercase font-medium">Participantes</p>
                <p>{selectedEvent.extendedProps.num_participantes}</p>
              </div>
              {isAdmin && (
                <div>
                  <p className="text-xs text-[var(--gray-500)] uppercase font-medium">Solicitante</p>
                  <p>{selectedEvent.extendedProps.solicitante_nome}</p>
                </div>
              )}
            </div>

            <Button variant="secondary" size="sm" onClick={handleDownloadIcs}>
              <Download size={16} /> Baixar .ics
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}

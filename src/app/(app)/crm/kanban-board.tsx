'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Building, Calendar, Mail, Phone, GripVertical, Users } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CrmEtapa {
  id: string
  nome: string
  cor: string
  ordem: number
}

interface ClienteCard {
  id: string
  nome: string
  empresa?: string
  email?: string
  telefone?: string
  cliente_full_sales: boolean
  produto?: string
  crm_etapa_id?: string
  proximo_evento_1?: string
  proximo_evento_1_pessoas?: number
}

const produtoLabel: Record<string, string> = {
  ia_full_sales: 'IA Full Sales',
  high_sales: 'High Sales',
  aceleracao: 'Aceleração',
  ativacao: 'Ativação',
  outro: 'Outro',
}

function ClienteCardItem({ cliente, isDragging }: { cliente: ClienteCard; isDragging?: boolean }) {
  return (
    <div className={`bg-white border border-[var(--gray-200)] rounded-xl p-3 shadow-sm ${isDragging ? 'opacity-50' : ''}`}>
      <p className="font-semibold text-[var(--gray-900)] text-sm truncate">{cliente.nome}</p>
      {cliente.empresa && (
        <p className="text-xs text-[var(--gray-400)] flex items-center gap-1 mt-0.5">
          <Building size={10} /> {cliente.empresa}
        </p>
      )}
      <div className="mt-2 space-y-1">
        {cliente.email && (
          <p className="text-xs text-[var(--gray-400)] flex items-center gap-1 truncate">
            <Mail size={10} /> {cliente.email}
          </p>
        )}
        {cliente.telefone && (
          <p className="text-xs text-[var(--gray-400)] flex items-center gap-1">
            <Phone size={10} /> {cliente.telefone}
          </p>
        )}
        {cliente.proximo_evento_1 && (
          <p className="text-xs text-[var(--gray-400)] flex items-center gap-1">
            <Calendar size={10} />
            {format(new Date(cliente.proximo_evento_1 + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
            {cliente.proximo_evento_1_pessoas ? ` — ${cliente.proximo_evento_1_pessoas}p` : ''}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {cliente.cliente_full_sales && (
          <span className="text-xs bg-[var(--primary-light)] text-[var(--primary)] px-1.5 py-0.5 rounded-full">FS</span>
        )}
        {cliente.produto && (
          <span className="text-xs bg-[var(--gray-100)] text-[var(--gray-600)] px-1.5 py-0.5 rounded">{produtoLabel[cliente.produto] ?? cliente.produto}</span>
        )}
      </div>
    </div>
  )
}

function SortableCard({ cliente }: { cliente: ClienteCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cliente.id,
    data: { type: 'card', cliente },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={`relative group ${isDragging ? 'opacity-30' : ''}`}>
      <Link href={`/clientes/${cliente.id}`} className="block">
        <ClienteCardItem cliente={cliente} />
      </Link>
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity text-[var(--gray-300)] hover:text-[var(--gray-500)] touch-none"
      >
        <GripVertical size={14} />
      </div>
    </div>
  )
}

function KanbanColumn({
  etapa,
  clientes,
}: {
  etapa: CrmEtapa
  clientes: ClienteCard[]
}) {
  return (
    <div className="flex-shrink-0 w-[280px]">
      <div
        className="flex items-center gap-2 mb-3 px-1"
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: etapa.cor }} />
        <h3 className="text-sm font-semibold text-[var(--gray-700)]">{etapa.nome}</h3>
        <span className="ml-auto text-xs bg-[var(--gray-100)] text-[var(--gray-500)] px-2 py-0.5 rounded-full">
          {clientes.length}
        </span>
      </div>

      <div
        className="bg-[var(--gray-50)] rounded-xl p-2 min-h-[200px] border border-[var(--gray-200)]"
        style={{ borderTopColor: etapa.cor, borderTopWidth: 3 }}
      >
        <SortableContext items={clientes.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {clientes.map(c => (
              <SortableCard key={c.id} cliente={c} />
            ))}
          </div>
        </SortableContext>
        {clientes.length === 0 && (
          <p className="text-xs text-[var(--gray-300)] text-center py-6">Arraste clientes aqui</p>
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard({
  etapas,
  clientes: initialClientes,
}: {
  etapas: CrmEtapa[]
  clientes: ClienteCard[]
}) {
  const [clientes, setClientes] = useState(initialClientes)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const getClientesByEtapa = useCallback(
    (etapaId: string) => clientes.filter(c => c.crm_etapa_id === etapaId),
    [clientes]
  )

  const semEtapa = clientes.filter(c => !c.crm_etapa_id)

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const activeClienteId = active.id as string
    const overEtapaId = over.id as string

    // Determine the target etapa
    let targetEtapaId: string | null = null

    // Check if dropped on a column or a card within a column
    if (etapas.find(e => e.id === overEtapaId)) {
      targetEtapaId = overEtapaId
    } else {
      // Dropped on a card — find that card's etapa
      const targetCliente = clientes.find(c => c.id === overEtapaId)
      targetEtapaId = targetCliente?.crm_etapa_id ?? null
    }

    const activeCliente = clientes.find(c => c.id === activeClienteId)
    if (!activeCliente || activeCliente.crm_etapa_id === targetEtapaId) return

    // Optimistic update
    setClientes(prev =>
      prev.map(c => c.id === activeClienteId ? { ...c, crm_etapa_id: targetEtapaId ?? undefined } : c)
    )

    // Persist
    const supabase = createClient()
    const { error } = await supabase
      .from('clientes')
      .update({ crm_etapa_id: targetEtapaId })
      .eq('id', activeClienteId)

    if (error) {
      // Revert on error
      setClientes(prev =>
        prev.map(c => c.id === activeClienteId ? { ...c, crm_etapa_id: activeCliente.crm_etapa_id } : c)
      )
    }
  }

  const activeCliente = activeId ? clientes.find(c => c.id === activeId) : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {etapas.map(etapa => (
            <KanbanColumn
              key={etapa.id}
              etapa={etapa}
              clientes={getClientesByEtapa(etapa.id)}
            />
          ))}
          {semEtapa.length > 0 && (
            <KanbanColumn
              etapa={{ id: '__sem_etapa__', nome: 'Sem etapa', cor: '#d1d5db', ordem: 999 }}
              clientes={semEtapa}
            />
          )}
        </div>
      </div>

      <DragOverlay>
        {activeCliente && <ClienteCardItem cliente={activeCliente} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Building, Calendar, Mail, Phone, GripVertical, Plus, Pencil, Check, X, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { showToast } from '@/components/ui/toast'

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

const COR_PADRAO = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
]

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
  onRename,
  onDelete,
}: {
  etapa: CrmEtapa
  clientes: ClienteCard[]
  onRename?: (id: string, nome: string) => void
  onDelete?: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(etapa.nome)
  const inputRef = useRef<HTMLInputElement>(null)
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: etapa.id })

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const isSemEtapa = etapa.id === '__sem_etapa__'

  function handleSave() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== etapa.nome && onRename) {
      onRename(etapa.id, trimmed)
    }
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setDraft(etapa.nome); setEditing(false) }
  }

  return (
    <div className="flex-shrink-0 w-[280px]">
      <div className="flex items-center gap-2 mb-3 px-1 group/header">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: etapa.cor }} />
        {editing && !isSemEtapa ? (
          <>
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-sm font-semibold text-[var(--gray-700)] border-b border-[var(--primary)] outline-none bg-transparent"
            />
            <button onClick={handleSave} className="text-[var(--primary)] hover:opacity-70">
              <Check size={14} />
            </button>
            <button onClick={() => { setDraft(etapa.nome); setEditing(false) }} className="text-[var(--gray-400)] hover:opacity-70">
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-[var(--gray-700)] flex-1 truncate">{etapa.nome}</h3>
            <span className="text-xs bg-[var(--gray-100)] text-[var(--gray-500)] px-2 py-0.5 rounded-full">
              {clientes.length}
            </span>
            {!isSemEtapa && onRename && (
              <button
                onClick={() => { setDraft(etapa.nome); setEditing(true) }}
                className="opacity-0 group-hover/header:opacity-100 transition-opacity text-[var(--gray-400)] hover:text-[var(--gray-600)]"
                title="Renomear coluna"
              >
                <Pencil size={12} />
              </button>
            )}
            {!isSemEtapa && onDelete && clientes.length === 0 && (
              <button
                onClick={() => onDelete(etapa.id)}
                className="opacity-0 group-hover/header:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                title="Excluir coluna"
              >
                <Trash2 size={12} />
              </button>
            )}
          </>
        )}
      </div>

      <div
        ref={setDropRef}
        className={`bg-[var(--gray-50)] rounded-xl p-2 min-h-[200px] border border-[var(--gray-200)] transition-colors ${isOver ? 'bg-[var(--primary-light)]' : ''}`}
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

function NovaEtapaForm({ onAdd }: { onAdd: (etapa: CrmEtapa) => void }) {
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState(COR_PADRAO[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  async function handleAdd() {
    const trimmed = nome.trim()
    if (!trimmed) return
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('crm_etapas')
      .insert({ nome: trimmed, cor, ordem: 9999 })
      .select()
      .single()
    setSaving(false)
    if (err) {
      setError('Erro ao criar coluna. Tente novamente.')
      return
    }
    if (data) {
      onAdd(data)
      setNome('')
      setCor(COR_PADRAO[0])
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex-shrink-0 w-[280px] flex items-center gap-2 border-2 border-dashed border-[var(--gray-200)] rounded-xl p-4 text-sm text-[var(--gray-400)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors self-start mt-8"
      >
        <Plus size={16} /> Nova coluna
      </button>
    )
  }

  return (
    <div className="flex-shrink-0 w-[280px] self-start mt-8">
      <div className="bg-white border border-[var(--gray-200)] rounded-xl p-4 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-[var(--gray-700)]">Nova coluna</p>
        <input
          ref={inputRef}
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setOpen(false) }}
          placeholder="Nome da coluna"
          className="w-full border border-[var(--gray-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <div>
          <p className="text-xs text-[var(--gray-500)] mb-1.5">Cor</p>
          <div className="flex flex-wrap gap-2">
            {COR_PADRAO.map(c => (
              <button
                key={c}
                onClick={() => setCor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${cor === c ? 'border-[var(--gray-900)] scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            disabled={saving || !nome.trim()}
            className="flex-1 bg-[var(--primary)] text-white px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Adicionar'}
          </button>
          <button
            onClick={() => { setOpen(false); setNome(''); setError('') }}
            className="px-3 py-2 border border-[var(--gray-200)] rounded-lg text-sm text-[var(--gray-500)] hover:bg-[var(--gray-50)]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function KanbanBoard({
  etapas: initialEtapas,
  clientes: initialClientes,
}: {
  etapas: CrmEtapa[]
  clientes: ClienteCard[]
}) {
  const [etapas, setEtapas] = useState(initialEtapas)
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

    let targetEtapaId: string | null = null

    if (overEtapaId === '__sem_etapa__') {
      targetEtapaId = null
    } else if (etapas.find(e => e.id === overEtapaId)) {
      targetEtapaId = overEtapaId
    } else {
      const targetCliente = clientes.find(c => c.id === overEtapaId)
      targetEtapaId = targetCliente?.crm_etapa_id ?? null
    }

    const activeCliente = clientes.find(c => c.id === activeClienteId)
    if (!activeCliente || activeCliente.crm_etapa_id === targetEtapaId) return

    const previousEtapaId = activeCliente.crm_etapa_id
    const previousEtapaNome = previousEtapaId
      ? etapas.find(e => e.id === previousEtapaId)?.nome ?? 'Sem etapa'
      : 'Sem etapa'
    const targetEtapaNome = targetEtapaId
      ? etapas.find(e => e.id === targetEtapaId)?.nome ?? 'Sem etapa'
      : 'Sem etapa'

    setClientes(prev =>
      prev.map(c => c.id === activeClienteId ? { ...c, crm_etapa_id: targetEtapaId ?? undefined } : c)
    )

    const supabase = createClient()
    const { error } = await supabase
      .from('clientes')
      .update({ crm_etapa_id: targetEtapaId })
      .eq('id', activeClienteId)

    if (error) {
      setClientes(prev =>
        prev.map(c => c.id === activeClienteId ? { ...c, crm_etapa_id: activeCliente.crm_etapa_id } : c)
      )
      showToast('error', 'Erro ao mover cliente')
    } else {
      showToast('success', `${activeCliente.nome}: ${previousEtapaNome} → ${targetEtapaNome}`, () => {
        // Undo action
        setClientes(prev =>
          prev.map(c => c.id === activeClienteId ? { ...c, crm_etapa_id: previousEtapaId } : c)
        )
        supabase.from('clientes').update({ crm_etapa_id: previousEtapaId ?? null }).eq('id', activeClienteId)
      })
    }
  }

  async function handleRename(id: string, nome: string) {
    const prev = etapas.find(e => e.id === id)
    setEtapas(prev => prev.map(e => e.id === id ? { ...e, nome } : e))
    const supabase = createClient()
    const { error } = await supabase.from('crm_etapas').update({ nome }).eq('id', id)
    if (error && prev) {
      setEtapas(p => p.map(e => e.id === id ? { ...e, nome: prev.nome } : e))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta coluna?')) return
    const removed = etapas.find(e => e.id === id)
    setEtapas(prev => prev.filter(e => e.id !== id))
    const supabase = createClient()
    const { error } = await supabase.from('crm_etapas').delete().eq('id', id)
    if (error && removed) {
      setEtapas(prev => [...prev, removed].sort((a, b) => a.ordem - b.ordem))
    }
  }

  function handleAdd(etapa: CrmEtapa) {
    setEtapas(prev => [...prev, etapa])
  }

  const activeCliente = activeId ? clientes.find(c => c.id === activeId) : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max items-start">
          {etapas.map(etapa => (
            <KanbanColumn
              key={etapa.id}
              etapa={etapa}
              clientes={getClientesByEtapa(etapa.id)}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
          {semEtapa.length > 0 && (
            <KanbanColumn
              etapa={{ id: '__sem_etapa__', nome: 'Sem etapa', cor: '#d1d5db', ordem: 999 }}
              clientes={semEtapa}
            />
          )}
          <NovaEtapaForm onAdd={handleAdd} />
        </div>
      </div>

      <DragOverlay>
        {activeCliente && <ClienteCardItem cliente={activeCliente} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}

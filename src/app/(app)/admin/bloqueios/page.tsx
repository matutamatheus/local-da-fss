'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, ShieldBan, Calendar } from 'lucide-react'
import { showToast } from '@/components/ui/toast'
import { logAudit } from '@/lib/audit'

interface Bloqueio {
  id: string
  data_inicio: string
  data_fim: string
  motivo: string
  created_at: string
}

export default function BloqueiosPage() {
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ data_inicio: '', data_fim: '', motivo: 'Manutenção' })

  useEffect(() => { loadBloqueios() }, [])

  async function loadBloqueios() {
    const supabase = createClient()
    const { data } = await supabase
      .from('bloqueios')
      .select('*')
      .order('data_inicio', { ascending: true })
    setBloqueios(data ?? [])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.data_inicio || !form.data_fim) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('bloqueios').insert({
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      motivo: form.motivo || 'Manutenção',
      criado_por: user?.id,
    })

    if (error) {
      showToast('error', 'Erro ao criar bloqueio')
    } else {
      if (user) {
        await logAudit(supabase, {
          userId: user.id,
          acao: 'criar_bloqueio',
          entidade: 'bloqueio',
          detalhes: { data_inicio: form.data_inicio, data_fim: form.data_fim, motivo: form.motivo },
        })
      }
      showToast('success', 'Bloqueio criado')
      setForm({ data_inicio: '', data_fim: '', motivo: 'Manutenção' })
      loadBloqueios()
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('bloqueios').delete().eq('id', id)
    if (user) {
      await logAudit(supabase, {
        userId: user.id,
        acao: 'remover_bloqueio',
        entidade: 'bloqueio',
        entidadeId: id,
      })
    }
    showToast('success', 'Bloqueio removido')
    loadBloqueios()
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--gray-900)] flex items-center gap-2">
          <ShieldBan size={24} /> Bloqueios de Calendário
        </h1>
        <p className="text-[var(--gray-500)] mt-1 text-sm">Bloqueie períodos para manutenção, feriados ou indisponibilidade. Datas bloqueadas aparecem em cinza no calendário e impedem novas reservas.</p>
      </div>

      {/* Formulário */}
      <Card className="mb-6">
        <CardContent>
          <p className="text-xs text-[var(--gray-500)] mb-3 font-medium">Novo bloqueio</p>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Data início"
                type="date"
                value={form.data_inicio}
                onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                min={today}
                required
              />
            </div>
            <div className="flex-1">
              <Input
                label="Data fim"
                type="date"
                value={form.data_fim}
                onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
                min={form.data_inicio || today}
                required
              />
            </div>
            <div className="flex-1">
              <Input
                label="Motivo"
                value={form.motivo}
                onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                placeholder="Ex: Manutenção"
              />
            </div>
            <Button type="submit" loading={loading}>
              <Plus size={16} /> Bloquear
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista */}
      <div className="space-y-3">
        {bloqueios.length === 0 ? (
          <p className="text-sm text-[var(--gray-400)] text-center py-8">Nenhum bloqueio ativo</p>
        ) : (
          bloqueios.map(b => {
            const isPast = b.data_fim < today
            return (
              <div
                key={b.id}
                className={`flex items-center gap-4 bg-white border border-[var(--gray-200)] rounded-xl px-4 py-3 ${isPast ? 'opacity-50' : ''}`}
              >
                <Calendar size={18} className="text-[var(--gray-400)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--gray-900)]">{b.motivo}</p>
                  <p className="text-xs text-[var(--gray-500)]">
                    {new Date(b.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')} — {new Date(b.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="p-2 rounded-lg text-[var(--gray-400)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

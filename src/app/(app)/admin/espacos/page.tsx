'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import type { Espaco } from '@/lib/types'

export default function EspacosPage() {
  const [espacos, setEspacos] = useState<Espaco[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingEspaco, setEditingEspaco] = useState<Espaco | null>(null)
  const [nome, setNome] = useState('')
  const [localizacao, setLocalizacao] = useState('')
  const [capacidade, setCapacidade] = useState('')
  const [descricao, setDescricao] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadEspacos()
  }, [])

  async function loadEspacos() {
    const supabase = createClient()
    const { data } = await supabase.from('espacos').select('*').order('nome')
    setEspacos(data || [])
  }

  function openNew() {
    setEditingEspaco(null)
    setNome('')
    setLocalizacao('')
    setCapacidade('')
    setDescricao('')
    setShowModal(true)
  }

  function openEdit(esp: Espaco) {
    setEditingEspaco(esp)
    setNome(esp.nome)
    setLocalizacao(esp.localizacao)
    setCapacidade(String(esp.capacidade))
    setDescricao(esp.descricao)
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    const payload = {
      nome,
      localizacao,
      capacidade: parseInt(capacidade) || 0,
      descricao,
    }

    if (editingEspaco) {
      await supabase.from('espacos').update(payload).eq('id', editingEspaco.id)
    } else {
      await supabase.from('espacos').insert(payload)
    }

    setShowModal(false)
    await loadEspacos()
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente excluir este espaço?')) return
    const supabase = createClient()
    await supabase.from('espacos').delete().eq('id', id)
    await loadEspacos()
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)]">Espaços</h1>
          <p className="text-[var(--gray-500)] mt-1">Gerencie os espaços disponíveis</p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} /> Novo Espaço
        </Button>
      </div>

      <div className="space-y-3">
        {espacos.map((esp) => (
          <Card key={esp.id}>
            <CardContent className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--gray-900)]">{esp.nome}</h3>
                <p className="text-xs text-[var(--gray-500)] mt-0.5">
                  {esp.localizacao} &middot; Capacidade: {esp.capacidade} pessoas
                </p>
                {esp.descricao && (
                  <p className="text-xs text-[var(--gray-400)] mt-1">{esp.descricao}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(esp)}>
                  <Edit2 size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(esp.id)}>
                  <Trash2 size={16} className="text-[var(--danger)]" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingEspaco ? 'Editar Espaço' : 'Novo Espaço'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nome *" value={nome} onChange={(e) => setNome(e.target.value)} required />
          <Input label="Localização" value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} />
          <Input label="Capacidade" type="number" min="0" value={capacidade} onChange={(e) => setCapacidade(e.target.value)} />
          <Textarea label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <div className="flex gap-3">
            <Button type="submit" loading={loading}>
              {editingEspaco ? 'Salvar' : 'Criar'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

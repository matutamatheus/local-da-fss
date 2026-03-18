'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { CrmEtapa } from '@/lib/types'

const produtoOptions = [
  { value: 'ia_full_sales', label: 'IA Full Sales' },
  { value: 'high_sales', label: 'High Sales' },
  { value: 'aceleracao', label: 'Programa de Aceleração' },
  { value: 'ativacao', label: 'Programa de Ativação' },
  { value: 'outro', label: 'Outro produto' },
]

export default function EditarClientePage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [etapas, setEtapas] = useState<CrmEtapa[]>([])

  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', empresa: '', site: '',
    cliente_full_sales: false, produto: '',
    proximo_evento_1: '', proximo_evento_1_pessoas: '',
    proximo_evento_2: '', proximo_evento_2_pessoas: '',
    observacoes: '', crm_etapa_id: '',
  })

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('clientes').select('*').eq('id', id).single(),
      supabase.from('crm_etapas').select('*').order('ordem'),
    ]).then(([{ data: c }, { data: et }]) => {
      if (c) {
        setForm({
          nome: c.nome ?? '',
          email: c.email ?? '',
          telefone: c.telefone ?? '',
          empresa: c.empresa ?? '',
          site: c.site ?? '',
          cliente_full_sales: c.cliente_full_sales ?? false,
          produto: c.produto ?? '',
          proximo_evento_1: c.proximo_evento_1 ?? '',
          proximo_evento_1_pessoas: c.proximo_evento_1_pessoas?.toString() ?? '',
          proximo_evento_2: c.proximo_evento_2 ?? '',
          proximo_evento_2_pessoas: c.proximo_evento_2_pessoas?.toString() ?? '',
          observacoes: c.observacoes ?? '',
          crm_etapa_id: c.crm_etapa_id ?? '',
        })
      }
      setEtapas(et ?? [])
      setFetching(false)
    })
  }, [id])

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    const { error: err } = await supabase.from('clientes').update({
      nome: form.nome.trim(),
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      empresa: form.empresa.trim() || null,
      site: form.site.trim() || null,
      cliente_full_sales: form.cliente_full_sales,
      produto: form.produto || null,
      proximo_evento_1: form.proximo_evento_1 || null,
      proximo_evento_1_pessoas: form.proximo_evento_1_pessoas ? Number(form.proximo_evento_1_pessoas) : null,
      proximo_evento_2: form.proximo_evento_2 || null,
      proximo_evento_2_pessoas: form.proximo_evento_2_pessoas ? Number(form.proximo_evento_2_pessoas) : null,
      observacoes: form.observacoes.trim() || null,
      crm_etapa_id: form.crm_etapa_id || null,
    }).eq('id', id)

    setLoading(false)
    if (err) { setError(err.message); return }
    router.push(`/clientes/${id}`)
  }

  if (fetching) return <p className="text-[var(--gray-500)]">Carregando...</p>

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/clientes/${id}`} className="flex items-center gap-2 text-sm text-[var(--gray-500)] hover:text-[var(--gray-700)] mb-4">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--gray-900)]">Editar Cliente</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><h2 className="font-semibold text-[var(--gray-900)]">Dados do Cliente</h2></CardHeader>
          <CardContent className="space-y-4">
            <Input label="Nome completo *" value={form.nome} onChange={e => set('nome', e.target.value)} required />
            <Input label="Empresa" value={form.empresa} onChange={e => set('empresa', e.target.value)} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="E-mail" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              <Input label="Telefone / WhatsApp" value={form.telefone} onChange={e => set('telefone', e.target.value)} />
            </div>
            <Input label="Site" type="url" value={form.site} onChange={e => set('site', e.target.value)} placeholder="https://..." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-[var(--gray-900)]">Relacionamento Full Sales</h2></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.cliente_full_sales} onChange={e => set('cliente_full_sales', e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium text-[var(--gray-700)]">Cliente Full Sales</span>
            </label>
            {form.cliente_full_sales && (
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">Produto</label>
                <select value={form.produto} onChange={e => set('produto', e.target.value)}
                  className="w-full border border-[var(--gray-200)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                  <option value="">Selecionar produto</option>
                  {produtoOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-[var(--gray-900)]">Próximos Eventos</h2></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Data do Evento 1" type="date" value={form.proximo_evento_1} onChange={e => set('proximo_evento_1', e.target.value)} />
              <Input label="Pessoas estimadas" type="number" min="1" value={form.proximo_evento_1_pessoas} onChange={e => set('proximo_evento_1_pessoas', e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Data do Evento 2" type="date" value={form.proximo_evento_2} onChange={e => set('proximo_evento_2', e.target.value)} />
              <Input label="Pessoas estimadas" type="number" min="1" value={form.proximo_evento_2_pessoas} onChange={e => set('proximo_evento_2_pessoas', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-[var(--gray-900)]">CRM & Observações</h2></CardHeader>
          <CardContent className="space-y-4">
            {etapas.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">Etapa do CRM</label>
                <select value={form.crm_etapa_id} onChange={e => set('crm_etapa_id', e.target.value)}
                  className="w-full border border-[var(--gray-200)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                  <option value="">Sem etapa</option>
                  {etapas.map(et => <option key={et.id} value={et.id}>{et.nome}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">Observações</label>
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
                rows={3}
                className="w-full border border-[var(--gray-200)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none" />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-[var(--danger)] bg-[var(--danger-light)] rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Salvar Alterações</Button>
          <Link href={`/clientes/${id}`}><Button type="button" variant="secondary">Cancelar</Button></Link>
        </div>
      </form>
    </div>
  )
}

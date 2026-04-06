'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ArrowLeft, AlertTriangle, CheckCircle, Mic, Calculator } from 'lucide-react'
import Link from 'next/link'
import { calcularPrecificacao, formatCurrency } from '@/lib/pricing'
import { logAudit } from '@/lib/audit'
import type { Cliente, Espaco, RegrasDiaria, MultiplicadorOcupacao, MultiplicadorProximidade } from '@/lib/types'

const statusOptions = [
  { value: 'aberta', label: 'Aberta', desc: 'Disponível, aguardando confirmação' },
  { value: 'pre_reservada', label: 'Pré-reservada', desc: 'Segurada temporariamente' },
  { value: 'agendada', label: 'Agendada', desc: 'Confirmada' },
]

function NovaReservaForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clienteIdParam = searchParams.get('cliente')
  const dataParam = searchParams.get('data')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [conflito, setConflito] = useState(false)
  const [minimoError, setMinimoError] = useState<string | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [espacos, setEspacos] = useState<Espaco[]>([])
  const [regrasDiarias, setRegrasDiarias] = useState<RegrasDiaria[]>([])
  const [multOcupacao, setMultOcupacao] = useState<MultiplicadorOcupacao[]>([])
  const [multProximidade, setMultProximidade] = useState<MultiplicadorProximidade[]>([])
  const [busca, setBusca] = useState('')
  const [datasAlternativas, setDatasAlternativas] = useState<{ entrada: string; saida: string }[]>([])


  const [form, setForm] = useState({
    cliente_id: clienteIdParam ?? '',
    espaco_id: '',
    data_entrada: dataParam ?? '',
    data_saida: '',
    num_participantes: '1',
    audiovisual: false,
    observacoes: '',
    status: 'aberta',
    desconto_aplicado: '0',
    descritivo: '',
  })

  const pricing = form.data_entrada && form.data_saida && form.data_saida > form.data_entrada
    ? calcularPrecificacao(
        {
          dataEntrada: new Date(form.data_entrada),
          dataSaida: new Date(form.data_saida),
          numParticipantes: Number(form.num_participantes) || 1,
          descontoPercent: Number(form.desconto_aplicado) || 0,
        },
        regrasDiarias,
        multOcupacao,
        multProximidade
      )
    : null

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('clientes').select('id, nome, empresa').order('nome'),
      supabase.from('espacos').select('*'),
      supabase.from('regras_diarias').select('*').order('dia_semana'),
      supabase.from('multiplicadores_ocupacao').select('*').order('ordem'),
      supabase.from('multiplicadores_proximidade').select('*').order('ordem'),
    ]).then(([c, e, rd, mo, mp]) => {
      setClientes((c.data ?? []) as Cliente[])
      setEspacos((e.data ?? []) as Espaco[])
      setRegrasDiarias(rd.data ?? [])
      setMultOcupacao(mo.data ?? [])
      setMultProximidade(mp.data ?? [])
      if (e.data?.length && !form.espaco_id) {
        setForm(f => ({ ...f, espaco_id: e.data![0].id }))
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkConflito = useCallback(async (entrada: string, saida: string, status: string) => {
    if (!entrada || !saida) return
    const supabase = createClient()
    const { data } = await supabase
      .from('reservas')
      .select('id')
      .lte('data_entrada', saida)
      .gte('data_saida', entrada)
      .eq('status', 'agendada')
    const hasConflict = (data?.length ?? 0) > 0 && status === 'agendada'
    setConflito(hasConflict)
    if (hasConflict && entrada && saida) {
      findAlternativas(entrada, saida)
    } else {
      setDatasAlternativas([])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const findAlternativas = useCallback(async (entrada: string, saida: string) => {
    const duracao = Math.ceil((new Date(saida).getTime() - new Date(entrada).getTime()) / 86400000)
    if (duracao <= 0) return
    const supabase = createClient()
    const alt: { entrada: string; saida: string }[] = []
    const baseDate = new Date(entrada)

    for (let offset = 1; offset <= 30 && alt.length < 3; offset++) {
      const tryStart = new Date(baseDate)
      tryStart.setDate(tryStart.getDate() + offset)
      const tryEnd = new Date(tryStart)
      tryEnd.setDate(tryEnd.getDate() + duracao)
      const s = tryStart.toISOString().slice(0, 10)
      const e = tryEnd.toISOString().slice(0, 10)

      const { data: conflicts } = await supabase
        .from('reservas')
        .select('id')
        .lte('data_entrada', e)
        .gte('data_saida', s)
        .eq('status', 'agendada')
        .limit(1)

      if (!conflicts?.length) {
        alt.push({ entrada: s, saida: e })
      }
    }
    setDatasAlternativas(alt)
  }, [])

  const checkMinimosDiarias = useCallback((entrada: string, saida: string) => {
    if (!entrada || !saida || saida <= entrada || regrasDiarias.length === 0) {
      setMinimoError(null)
      return
    }
    const cursor = new Date(entrada)
    const end = new Date(saida)
    let maxMinimo = 1
    const diasComMinimo2 = []
    while (cursor < end) {
      const dia = cursor.getDay()
      const regra = regrasDiarias.find(r => r.dia_semana === dia)
      const min = regra?.minimo_diarias ?? 1
      if (min > maxMinimo) maxMinimo = min
      if (min >= 2) diasComMinimo2.push(regra?.nome_dia ?? '')
      cursor.setDate(cursor.getDate() + 1)
    }
    const numDias = Math.floor((end.getTime() - new Date(entrada).getTime()) / 86400000)
    if (numDias < maxMinimo) {
      const dias = [...new Set(diasComMinimo2)].join(', ')
      setMinimoError(`Mínimo de ${maxMinimo} diária(s) necessárias para reservas que incluem ${dias}.`)
    } else {
      setMinimoError(null)
    }
  }, [regrasDiarias])

  useEffect(() => {
    checkConflito(form.data_entrada, form.data_saida, form.status)
    checkMinimosDiarias(form.data_entrada, form.data_saida)
  }, [form.data_entrada, form.data_saida, form.status, checkConflito, checkMinimosDiarias])

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const clientesFiltrados = busca.length >= 2
    ? clientes.filter(c =>
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (c.empresa ?? '').toLowerCase().includes(busca.toLowerCase())
      )
    : clientes.slice(0, 10)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (conflito) { setError('Conflito de datas com uma reserva agendada.'); return }
    if (minimoError) { setError(minimoError); return }
    if (!form.cliente_id) { setError('Selecione um cliente.'); return }
    if (form.data_saida <= form.data_entrada) { setError('Data de saída deve ser após a entrada.'); return }
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Não autenticado'); setLoading(false); return }

    const { data: reserva, error: err } = await supabase.from('reservas').insert({
      cliente_id: form.cliente_id,
      espaco_id: form.espaco_id || null,
      data_entrada: form.data_entrada,
      data_saida: form.data_saida,
      num_participantes: Number(form.num_participantes) || 1,
      audiovisual: form.audiovisual,
      observacoes: form.observacoes || null,
      status: form.status,
      valor_diaria: pricing ? pricing.diariasDetalhes[0]?.valorFinal ?? null : null,
      valor_total: pricing ? pricing.total : null,
      desconto_aplicado: Number(form.desconto_aplicado) || 0,
      criado_por: user.id,
    }).select().single()

    if (err) { setError(err.message); setLoading(false); return }

    // Audit log
    await logAudit(supabase, {
      userId: user.id,
      acao: 'criar_reserva',
      entidade: 'reserva',
      entidadeId: reserva.id,
      detalhes: { cliente_id: form.cliente_id, status: form.status, data_entrada: form.data_entrada, data_saida: form.data_saida },
    })

    // Create proposta if descritivo provided
    if (form.descritivo.trim() && reserva) {
      await supabase.from('propostas').insert({
        reserva_id: reserva.id,
        cliente_id: form.cliente_id,
        valor_total: pricing?.total ?? 0,
        descritivo: form.descritivo.trim(),
        criado_por: user.id,
      })
      await logAudit(supabase, {
        userId: user.id,
        acao: 'gerar_proposta',
        entidade: 'proposta',
        entidadeId: reserva.id,
        detalhes: { cliente_id: form.cliente_id, valor: pricing?.total },
      })
    }

    setLoading(false)
    router.push(`/reservas/${reserva.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/clientes" className="flex items-center gap-2 text-sm text-[var(--gray-500)] hover:text-[var(--gray-700)] mb-4">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--gray-900)]">Bookar Data</h1>
        <p className="text-[var(--gray-500)] mt-1 text-sm">Preencha os dados abaixo para reservar o espaço. Os campos com * são obrigatórios.</p>
      </div>

      {/* Guia de passos */}
      <div className="flex items-center gap-2 text-xs text-[var(--gray-400)] mb-2">
        <span className={`px-2 py-1 rounded-full font-medium ${form.cliente_id ? 'bg-[var(--success-light)] text-[#1e8449]' : 'bg-[var(--primary-light)] text-[var(--primary)]'}`}>1. Cliente</span>
        <span className="text-[var(--gray-300)]">→</span>
        <span className={`px-2 py-1 rounded-full font-medium ${form.data_entrada && form.data_saida ? 'bg-[var(--success-light)] text-[#1e8449]' : 'bg-[var(--gray-100)] text-[var(--gray-500)]'}`}>2. Datas</span>
        <span className="text-[var(--gray-300)]">→</span>
        <span className={`px-2 py-1 rounded-full font-medium ${form.num_participantes !== '1' || form.audiovisual ? 'bg-[var(--success-light)] text-[#1e8449]' : 'bg-[var(--gray-100)] text-[var(--gray-500)]'}`}>3. Detalhes</span>
        <span className="text-[var(--gray-300)]">→</span>
        <span className="px-2 py-1 rounded-full font-medium bg-[var(--gray-100)] text-[var(--gray-500)]">4. Confirmar</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Passo 1: Cliente */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-[var(--gray-900)]">1. Selecione o cliente *</h2>
                <p className="text-xs text-[var(--gray-400)] mt-0.5">Busque pelo nome ou empresa. Caso não encontre, cadastre um novo.</p>
              </div>
              <Link href="/clientes/novo" className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">+ Novo cliente</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="text"
              placeholder="Buscar cliente pelo nome ou empresa..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full border border-[var(--gray-200)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <div className="max-h-40 overflow-y-auto border border-[var(--gray-200)] rounded-lg divide-y divide-[var(--gray-100)]">
              {clientesFiltrados.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { set('cliente_id', c.id); setBusca(c.nome) }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--gray-50)] transition-colors ${form.cliente_id === c.id ? 'bg-[var(--primary-light)] text-[var(--primary)] font-medium' : ''}`}
                >
                  {c.nome}{c.empresa ? ` — ${c.empresa}` : ''}
                </button>
              ))}
              {clientesFiltrados.length === 0 && (
                <p className="px-3 py-2 text-sm text-[var(--gray-400)]">Nenhum cliente encontrado</p>
              )}
            </div>
            {form.cliente_id && (
              <p className="text-xs text-green-700 flex items-center gap-1">
                <CheckCircle size={12} /> Cliente selecionado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Passo 2: Datas */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-[var(--gray-900)]">2. Período da reserva *</h2>
            <p className="text-xs text-[var(--gray-400)] mt-0.5">Selecione a data de entrada e saída. O sistema verifica conflitos automaticamente.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Data de entrada *" type="date" value={form.data_entrada}
                onChange={e => set('data_entrada', e.target.value)} required />
              <Input label="Data de saída *" type="date" value={form.data_saida}
                onChange={e => set('data_saida', e.target.value)} required
                min={form.data_entrada} />
            </div>

            {conflito && (
              <div className="bg-[var(--danger-light)] border border-[var(--danger)] rounded-lg px-3 py-2 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-[var(--danger)] shrink-0" />
                  <p className="text-sm text-[#922b21]">Conflito! Há uma reserva <strong>agendada</strong> nesse período.</p>
                </div>
                {datasAlternativas.length > 0 && (
                  <div className="pl-6">
                    <p className="text-xs text-[#922b21] font-medium mb-1">Datas alternativas disponíveis:</p>
                    <div className="flex flex-wrap gap-2">
                      {datasAlternativas.map((alt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            set('data_entrada', alt.entrada)
                            set('data_saida', alt.saida)
                          }}
                          className="text-xs bg-white border border-[var(--gray-200)] rounded-lg px-2.5 py-1.5 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                        >
                          {new Date(alt.entrada + 'T12:00:00').toLocaleDateString('pt-BR')} — {new Date(alt.saida + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {minimoError && (
              <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                <AlertTriangle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">{minimoError}</p>
              </div>
            )}

            {espacos.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">Espaço</label>
                <select value={form.espaco_id} onChange={e => set('espaco_id', e.target.value)}
                  className="w-full border border-[var(--gray-200)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                  {espacos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Passo 3: Detalhes */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-[var(--gray-900)]">3. Detalhes do evento</h2>
            <p className="text-xs text-[var(--gray-400)] mt-0.5">Informe o número de participantes e selecione o status inicial da reserva.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Número de participantes" type="number" min="1"
              value={form.num_participantes} onChange={e => set('num_participantes', e.target.value)} />

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.audiovisual}
                onChange={e => set('audiovisual', e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium text-[var(--gray-700)] flex items-center gap-2">
                <Mic size={15} /> Áudio visual incluso
              </span>
            </label>

            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">Status da reserva</label>
              <div className="grid sm:grid-cols-3 gap-2">
                {statusOptions.map(s => (
                  <button key={s.value} type="button"
                    onClick={() => set('status', s.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${form.status === s.value ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-[var(--gray-200)] hover:border-[var(--gray-300)]'}`}
                  >
                    <p className={`text-sm font-medium ${form.status === s.value ? 'text-[var(--primary)]' : 'text-[var(--gray-800)]'}`}>{s.label}</p>
                    <p className="text-xs text-[var(--gray-400)] mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">Observações do evento</label>
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
                rows={3} placeholder="Detalhes específicos do evento..."
                className="w-full border border-[var(--gray-200)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none" />
            </div>
          </CardContent>
        </Card>

        {/* Precificação */}
        {pricing && pricing.numDiarias > 0 && (
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-[var(--gray-900)] flex items-center gap-2">
                <Calculator size={18} className="text-[var(--primary)]" /> Precificação
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-[var(--gray-50)] rounded-lg p-4 space-y-2">
                <p className="text-xs text-[var(--gray-500)] font-medium uppercase tracking-wide mb-3">Detalhamento por dia</p>
                {pricing.diariasDetalhes.map((d, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-[var(--gray-600)]">{d.nomeDia} ({d.data.toLocaleDateString('pt-BR')})</span>
                    <span className="font-medium">{formatCurrency(d.valorFinal)}</span>
                  </div>
                ))}
                <div className="border-t border-[var(--gray-200)] pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-sm text-[var(--gray-500)]">
                    <span>Mult. Ocupação ({pricing.multOcupacaoLabel})</span>
                    <span>×{pricing.multOcupacaoAplicado.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-[var(--gray-500)]">
                    <span>Mult. Proximidade ({pricing.multProximidadeLabel})</span>
                    <span>×{pricing.multProximidadeAplicado.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Input
                label={`Desconto (máx. configurável) — atual: ${form.desconto_aplicado}%`}
                type="number" min="0" max="100" step="0.5"
                value={form.desconto_aplicado}
                onChange={e => set('desconto_aplicado', e.target.value)}
              />

              <div className="bg-[var(--primary-light)] rounded-lg p-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--gray-600)]">Subtotal ({pricing.numDiarias} diária(s))</span>
                  <span>{formatCurrency(pricing.subtotal)}</span>
                </div>
                {pricing.descontoValor > 0 && (
                  <div className="flex justify-between text-sm mb-1 text-red-600">
                    <span>Desconto ({form.desconto_aplicado}%)</span>
                    <span>− {formatCurrency(pricing.descontoValor)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-[var(--primary)] mt-2 pt-2 border-t border-[var(--primary)]">
                  <span>Total</span>
                  <span>{formatCurrency(pricing.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Passo 4: Proposta */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-[var(--gray-900)]">4. Proposta (opcional)</h2>
            <p className="text-xs text-[var(--gray-400)] mt-0.5">Preencha para gerar um PDF de proposta junto com a reserva. Você também pode gerar depois.</p>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                Escopo do evento — um item por linha
              </label>
              <textarea value={form.descritivo} onChange={e => set('descritivo', e.target.value)}
                rows={4} placeholder="• Locação do espaço principal&#10;• Infraestrutura básica inclusa&#10;• Estacionamento&#10;• Coffee break para 50 pessoas"
                className="w-full border border-[var(--gray-200)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none font-mono" />
              <p className="text-xs text-[var(--gray-400)] mt-1">Cada linha vira um bullet na proposta PDF. Deixe em branco para não gerar agora.</p>
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-[var(--danger)] bg-[var(--danger-light)] rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" loading={loading} disabled={conflito || !!minimoError}>
            {form.descritivo.trim() ? 'Criar Reserva + Proposta' : 'Criar Reserva'}
          </Button>
          <Link href="/clientes"><Button type="button" variant="secondary">Cancelar</Button></Link>
        </div>
        <p className="text-xs text-[var(--gray-400)] text-center">
          Ao criar, a reserva aparecerá no calendário e no histórico do cliente.
          {form.descritivo.trim() ? ' Uma proposta PDF será gerada automaticamente.' : ''}
        </p>
      </form>
    </div>
  )
}

export default function NovaReservaPage() {
  return (
    <Suspense fallback={<p className="text-[var(--gray-500)]">Carregando...</p>}>
      <NovaReservaForm />
    </Suspense>
  )
}

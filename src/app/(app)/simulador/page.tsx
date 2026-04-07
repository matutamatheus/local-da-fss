'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Calculator, CalendarPlus, Info } from 'lucide-react'
import { calcularPrecificacao, formatCurrency } from '@/lib/pricing'
import type { RegrasDiaria, MultiplicadorOcupacao, MultiplicadorProximidade } from '@/lib/types'
import Link from 'next/link'

export default function SimuladorPage() {
  const [regrasDiarias, setRegrasDiarias] = useState<RegrasDiaria[]>([])
  const [multOcupacao, setMultOcupacao] = useState<MultiplicadorOcupacao[]>([])
  const [multProximidade, setMultProximidade] = useState<MultiplicadorProximidade[]>([])
  const [loaded, setLoaded] = useState(false)

  const [dataEntrada, setDataEntrada] = useState('')
  const [dataSaida, setDataSaida] = useState('')
  const [participantes, setParticipantes] = useState('50')
  const [desconto, setDesconto] = useState('0')

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('regras_diarias').select('*').order('dia_semana'),
      supabase.from('multiplicadores_ocupacao').select('*').order('ordem'),
      supabase.from('multiplicadores_proximidade').select('*').order('ordem'),
    ]).then(([rd, mo, mp]) => {
      setRegrasDiarias(rd.data ?? [])
      setMultOcupacao(mo.data ?? [])
      setMultProximidade(mp.data ?? [])
      setLoaded(true)
    })
  }, [])

  const pricing = dataEntrada && dataSaida && dataSaida > dataEntrada
    ? calcularPrecificacao(
        {
          dataEntrada: new Date(dataEntrada),
          dataSaida: new Date(dataSaida),
          numParticipantes: Number(participantes) || 1,
          descontoPercent: Number(desconto) || 0,
        },
        regrasDiarias,
        multOcupacao,
        multProximidade
      )
    : null

  const today = new Date().toISOString().slice(0, 10)

  if (!loaded) {
    return <p className="text-[var(--gray-500)]">Carregando...</p>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--gray-900)] flex items-center gap-2">
          <Calculator size={24} className="text-[var(--primary)]" /> Simulador de Preço
        </h1>
        <p className="text-[var(--gray-500)] mt-1 text-sm">
          Simule o valor de uma reserva antes de criar. Nenhum dado é salvo — é apenas uma estimativa.
        </p>
      </div>

      {/* Guia rápido */}
      <div className="bg-[var(--primary-light)] rounded-xl p-4 mb-6 flex gap-3">
        <Info size={18} className="text-[var(--primary)] shrink-0 mt-0.5" />
        <div className="text-xs text-[var(--gray-600)] leading-relaxed">
          <p className="font-semibold text-[var(--primary)] mb-1">Como funciona?</p>
          <p>Selecione as datas e o número de participantes. O sistema calcula automaticamente com base nas regras de preço configuradas (valor por dia da semana, multiplicadores de ocupação e proximidade).</p>
        </div>
      </div>

      {/* Inputs */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-semibold text-[var(--gray-900)]">Dados da simulação</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Data de entrada"
              type="date"
              value={dataEntrada}
              onChange={e => setDataEntrada(e.target.value)}
              min={today}
            />
            <Input
              label="Data de saída"
              type="date"
              value={dataSaida}
              onChange={e => setDataSaida(e.target.value)}
              min={dataEntrada || today}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Número de participantes"
              type="number"
              min="1"
              value={participantes}
              onChange={e => setParticipantes(e.target.value)}
            />
            <Input
              label="Desconto (%)"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={desconto}
              onChange={e => setDesconto(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {pricing && pricing.numDiarias > 0 ? (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="font-semibold text-[var(--gray-900)]">Resultado da simulação</h2>
            <p className="text-xs text-[var(--gray-400)] mt-0.5">Valores calculados automaticamente com base nas regras vigentes.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Detalhamento por dia */}
            <div className="bg-[var(--gray-50)] rounded-lg p-4 space-y-2">
              <p className="text-xs text-[var(--gray-500)] font-medium uppercase tracking-wide mb-3">Detalhamento por dia</p>
              {pricing.diariasDetalhes.map((d, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-[var(--gray-600)]">
                    {d.nomeDia} ({d.data.toLocaleDateString('pt-BR')})
                  </span>
                  <span className="font-medium font-mono">{formatCurrency(d.valorFinal)}</span>
                </div>
              ))}
              <div className="border-t border-[var(--gray-200)] pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-xs text-[var(--gray-500)]">
                  <span>Valor base por dia</span>
                  <span>Varia por dia da semana</span>
                </div>
                <div className="flex justify-between text-xs text-[var(--gray-500)]">
                  <span>Mult. Ocupação ({pricing.multOcupacaoLabel})</span>
                  <span className="font-mono">×{pricing.multOcupacaoAplicado.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-[var(--gray-500)]">
                  <span>Mult. Proximidade ({pricing.multProximidadeLabel})</span>
                  <span className="font-mono">×{pricing.multProximidadeAplicado.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Resumo */}
            <div className="bg-[var(--primary-light)] rounded-lg p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--gray-600)]">Subtotal ({pricing.numDiarias} diária(s))</span>
                <span className="font-mono">{formatCurrency(pricing.subtotal)}</span>
              </div>
              {pricing.descontoValor > 0 && (
                <div className="flex justify-between text-sm mb-1 text-[#C0392B]">
                  <span>Desconto ({desconto}%)</span>
                  <span className="font-mono">− {formatCurrency(pricing.descontoValor)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg text-[var(--primary)] mt-2 pt-2 border-t border-[var(--primary)]">
                <span>Valor estimado</span>
                <span className="font-mono">{formatCurrency(pricing.total)}</span>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center pt-2">
              <p className="text-xs text-[var(--gray-400)] mb-3">Gostou do valor? Crie uma reserva com esses dados.</p>
              <Link
                href={`/reservas/nova?data=${dataEntrada}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
              >
                <CalendarPlus size={16} /> Criar Reserva com Essas Datas
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : dataEntrada && dataSaida ? (
        <Card className="mb-6">
          <CardContent>
            <p className="text-sm text-[var(--gray-400)] text-center py-6">
              {dataSaida <= dataEntrada
                ? 'A data de saída deve ser após a data de entrada.'
                : 'Preencha as datas para ver a simulação.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardContent>
            <div className="text-center py-8 text-[var(--gray-400)]">
              <Calculator size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Preencha as datas acima para simular o valor</p>
              <p className="text-xs mt-1">O cálculo é feito em tempo real conforme você preenche</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

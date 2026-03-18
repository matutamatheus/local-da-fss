'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, Info } from 'lucide-react'
import type { RegrasDiaria, MultiplicadorOcupacao, MultiplicadorProximidade, RegrasComerciais } from '@/lib/types'

const diasSemana = [
  { dia: 1, nome: 'Segunda-feira' },
  { dia: 2, nome: 'Terça-feira' },
  { dia: 3, nome: 'Quarta-feira' },
  { dia: 4, nome: 'Quinta-feira' },
  { dia: 5, nome: 'Sexta-feira' },
  { dia: 6, nome: 'Sábado' },
  { dia: 0, nome: 'Domingo' },
]

export default function RegrasForm({
  regrasDiarias: initialDiarias,
  regrasComerciais: initialComerciais,
  multOcupacao: initialOcupacao,
  multProximidade: initialProximidade,
}: {
  regrasDiarias: RegrasDiaria[]
  regrasComerciais: RegrasComerciais | null
  multOcupacao: MultiplicadorOcupacao[]
  multProximidade: MultiplicadorProximidade[]
}) {
  const [diarias, setDiarias] = useState(
    diasSemana.map(d => {
      const regra = initialDiarias.find(r => r.dia_semana === d.dia)
      return { dia_semana: d.dia, nome_dia: d.nome, valor: regra?.valor ?? 40000, minimo_diarias: regra?.minimo_diarias ?? 1 }
    })
  )
  const [descontoMax, setDescontoMax] = useState(initialComerciais?.desconto_max_gestor?.toString() ?? '10')
  const [regrasTexto, setRegrasTexto] = useState(initialComerciais?.regras_texto ?? '')
  const [ocupacao, setOcupacao] = useState<MultiplicadorOcupacao[]>(initialOcupacao)
  const [proximidade, setProximidade] = useState<MultiplicadorProximidade[]>(initialProximidade)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function updateDiaria(diaSemana: number, field: 'valor' | 'minimo_diarias', value: string) {
    setDiarias(prev => prev.map(d =>
      d.dia_semana === diaSemana ? { ...d, [field]: Number(value) } : d
    ))
  }

  function updateOcupacao(id: string, field: keyof MultiplicadorOcupacao, value: string) {
    setOcupacao(prev => prev.map(m => m.id === id ? { ...m, [field]: Number(value) } : m))
  }

  function updateProximidade(id: string, field: keyof MultiplicadorProximidade, value: string | number | null) {
    setProximidade(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const supabase = createClient()

    try {
      // Upsert regras diárias
      await supabase.from('regras_diarias').upsert(
        diarias.map(d => ({ dia_semana: d.dia_semana, nome_dia: d.nome_dia, valor: d.valor, minimo_diarias: d.minimo_diarias })),
        { onConflict: 'dia_semana' }
      )

      // Upsert regras comerciais (singleton id=1)
      await supabase.from('regras_comerciais').upsert({
        id: 1,
        desconto_max_gestor: Number(descontoMax),
        regras_texto: regrasTexto,
      }, { onConflict: 'id' })

      // Update each multiplicador individually
      for (const m of ocupacao) {
        await supabase.from('multiplicadores_ocupacao')
          .update({ faixa_min: m.faixa_min, faixa_max: m.faixa_max, multiplicador: m.multiplicador })
          .eq('id', m.id)
      }

      for (const m of proximidade) {
        await supabase.from('multiplicadores_proximidade')
          .update({ dias_min: m.dias_min, dias_max: m.dias_max, multiplicador: m.multiplicador, label: m.label })
          .eq('id', m.id)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError('Erro ao salvar. Tente novamente.')
    }

    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Diárias por dia da semana */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-[var(--gray-900)]">Valores por Dia da Semana</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {diarias.map(d => (
              <div key={d.dia_semana} className="grid grid-cols-3 gap-3 items-end">
                <div className="col-span-1">
                  <p className="text-sm font-medium text-[var(--gray-700)]">{d.nome_dia}</p>
                  <p className="text-xs text-[var(--gray-400)]">
                    {[5, 6, 0].includes(d.dia_semana) ? 'Fim de semana' : 'Dia de semana'}
                  </p>
                </div>
                <Input
                  label="Valor (R$)"
                  type="number"
                  min="0"
                  step="100"
                  value={d.valor.toString()}
                  onChange={e => updateDiaria(d.dia_semana, 'valor', e.target.value)}
                />
                <Input
                  label="Mín. diárias"
                  type="number"
                  min="1"
                  max="7"
                  value={d.minimo_diarias.toString()}
                  onChange={e => updateDiaria(d.dia_semana, 'minimo_diarias', e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-[var(--gray-50)] rounded-lg flex gap-2">
            <Info size={14} className="text-[var(--gray-400)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--gray-500)]">
              Fórmula: <code className="font-mono bg-white px-1 rounded">Diária Final = Valor Base × Mult. Ocupação × Mult. Proximidade</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Desconto máximo */}
      <Card>
        <CardHeader><h2 className="font-semibold text-[var(--gray-900)]">Desconto Máximo Autorizado</h2></CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Input
              label="Desconto máximo (%)"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={descontoMax}
              onChange={e => setDescontoMax(e.target.value)}
            />
          </div>
          <p className="text-xs text-[var(--gray-400)] mt-2">
            &ldquo;Nunca há desconto agressivo porque o preço base já está corretamente majorado.&rdquo;
          </p>
        </CardContent>
      </Card>

      {/* Multiplicador por Ocupação */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-[var(--gray-900)]">Multiplicador por Ocupação</h2>
          <p className="text-xs text-[var(--gray-500)] mt-0.5">Baseado na quantidade de participantes</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-xs text-[var(--gray-400)] font-medium px-1">
              <span>Mín. pessoas</span>
              <span>Máx. pessoas</span>
              <span>Multiplicador</span>
              <span></span>
            </div>
            {ocupacao.map(m => (
              <div key={m.id} className="grid grid-cols-4 gap-2 items-end">
                <Input type="number" min="0" value={m.faixa_min.toString()}
                  onChange={e => updateOcupacao(m.id, 'faixa_min', e.target.value)} />
                <Input type="number" min="0" value={m.faixa_max.toString()}
                  onChange={e => updateOcupacao(m.id, 'faixa_max', e.target.value)} />
                <Input type="number" min="0.5" max="2" step="0.05" value={m.multiplicador.toString()}
                  onChange={e => updateOcupacao(m.id, 'multiplicador', e.target.value)} />
                <span className="text-xs text-[var(--gray-500)] pb-2.5">×{m.multiplicador.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Multiplicador por Proximidade */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-[var(--gray-900)]">Multiplicador por Proximidade</h2>
          <p className="text-xs text-[var(--gray-500)] mt-0.5">Baseado em dias de antecedência ao evento</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-2 text-xs text-[var(--gray-400)] font-medium px-1">
              <span>Dias mín.</span>
              <span>Dias máx.</span>
              <span className="col-span-2">Rótulo</span>
              <span>Mult.</span>
            </div>
            {proximidade.map(m => (
              <div key={m.id} className="grid grid-cols-5 gap-2 items-end">
                <Input type="number" min="0" value={m.dias_min.toString()}
                  onChange={e => updateProximidade(m.id, 'dias_min', e.target.value)} />
                <input type="number" min="0"
                  value={m.dias_max?.toString() ?? ''}
                  placeholder="∞"
                  onChange={e => updateProximidade(m.id, 'dias_max', e.target.value ? Number(e.target.value) : null)}
                  className="border border-[var(--gray-200)] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
                <input type="text" value={m.label}
                  onChange={e => updateProximidade(m.id, 'label', e.target.value)}
                  className="col-span-2 border border-[var(--gray-200)] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
                <Input type="number" min="0.5" max="2" step="0.05" value={m.multiplicador.toString()}
                  onChange={e => updateProximidade(m.id, 'multiplicador', e.target.value)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regras comerciais */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-[var(--gray-900)]">Regras Comerciais (aparece na proposta PDF)</h2>
        </CardHeader>
        <CardContent>
          <textarea
            value={regrasTexto}
            onChange={e => setRegrasTexto(e.target.value)}
            rows={10}
            className="w-full border border-[var(--gray-200)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] font-mono resize-y"
            placeholder="Digite as regras comerciais que aparecem em todas as propostas..."
          />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-[var(--danger)] bg-[var(--danger-light)] rounded-lg px-3 py-2">{error}</p>}
      {saved && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">✓ Regras salvas com sucesso!</p>}

      <Button onClick={handleSave} loading={saving} className="w-full sm:w-auto">
        <Save size={16} /> Salvar Todas as Regras
      </Button>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart3, Calendar, DollarSign, TrendingUp, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/pricing'

export default async function RelatoriosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const today = new Date()

  // Gerar dados dos últimos 6 meses
  const meses: {
    label: string
    reservas: number
    agendadas: number
    receita: number
    ocupacao: number
  }[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const mesInicio = d.toISOString().slice(0, 10)
    const mesFim = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const mesFimStr = mesFim.toISOString().slice(0, 10)
    const diasNoMes = mesFim.getDate()

    const { data: reservasMes } = await supabase
      .from('reservas')
      .select('data_entrada, data_saida, status, valor_total')
      .gte('data_saida', mesInicio)
      .lte('data_entrada', mesFimStr)
      .not('status', 'eq', 'cancelada')

    let diasOcupados = 0
    let receita = 0
    let agendadas = 0

    if (reservasMes) {
      for (const r of reservasMes) {
        receita += Number(r.valor_total ?? 0)
        if (r.status === 'agendada') agendadas++
        const entrada = new Date(r.data_entrada)
        const saida = new Date(r.data_saida)
        const start = entrada < d ? d : entrada
        const end = saida > mesFim ? mesFim : saida
        diasOcupados += Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000))
      }
    }

    const nomesMes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    meses.push({
      label: `${nomesMes[d.getMonth()]}/${d.getFullYear()}`,
      reservas: reservasMes?.length ?? 0,
      agendadas,
      receita,
      ocupacao: Math.round((diasOcupados / diasNoMes) * 100),
    })
  }

  const totalReceita = meses.reduce((a, m) => a + m.receita, 0)
  const totalReservas = meses.reduce((a, m) => a + m.reservas, 0)
  const mediaOcupacao = Math.round(meses.reduce((a, m) => a + m.ocupacao, 0) / meses.length)
  const maxReceita = Math.max(...meses.map(m => m.receita), 1)
  const maxOcupacao = Math.max(...meses.map(m => m.ocupacao), 1)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--gray-900)] flex items-center gap-2">
          <BarChart3 size={24} /> Relatórios
        </h1>
        <p className="text-[var(--gray-500)] mt-1 text-sm">Ocupação e receita dos últimos 6 meses</p>
      </div>

      {/* KPIs totais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-[var(--success-light)]">
              <DollarSign size={24} className="text-[#1e8449]" />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--gray-900)]">{formatCurrency(totalReceita)}</p>
              <p className="text-sm text-[var(--gray-500)]">Receita total (6 meses)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-[var(--primary-light)]">
              <Calendar size={24} className="text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--gray-900)]">{totalReservas}</p>
              <p className="text-sm text-[var(--gray-500)]">Total de reservas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-[var(--warning-light)]">
              <TrendingUp size={24} className="text-[#b7770a]" />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--gray-900)]">{mediaOcupacao}%</p>
              <p className="text-sm text-[var(--gray-500)]">Ocupação média</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de receita */}
      <Card className="mb-6">
        <CardContent>
          <h3 className="text-sm font-semibold text-[var(--gray-700)] mb-6 flex items-center gap-2">
            <DollarSign size={16} /> Receita por Mês
          </h3>
          <div className="flex items-end gap-2 h-48">
            {meses.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-[var(--gray-500)] font-mono">
                  {m.receita > 0 ? formatCurrency(m.receita) : '—'}
                </span>
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${Math.max((m.receita / maxReceita) * 140, 4)}px`,
                    backgroundColor: 'var(--primary)',
                    opacity: 0.7 + (i / meses.length) * 0.3,
                  }}
                />
                <span className="text-xs text-[var(--gray-400)]">{m.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de ocupação */}
      <Card className="mb-6">
        <CardContent>
          <h3 className="text-sm font-semibold text-[var(--gray-700)] mb-6 flex items-center gap-2">
            <BarChart3 size={16} /> Ocupação por Mês (%)
          </h3>
          <div className="flex items-end gap-2 h-48">
            {meses.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-[var(--gray-500)] font-mono">{m.ocupacao}%</span>
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${Math.max((m.ocupacao / maxOcupacao) * 140, 4)}px`,
                    backgroundColor: '#27AE60',
                    opacity: 0.7 + (i / meses.length) * 0.3,
                  }}
                />
                <span className="text-xs text-[var(--gray-400)]">{m.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabela detalhada */}
      <Card>
        <CardContent>
          <h3 className="text-sm font-semibold text-[var(--gray-700)] mb-4">Detalhamento Mensal</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--gray-500)] border-b border-[var(--gray-200)]">
                  <th className="pb-3 font-medium">Mês</th>
                  <th className="pb-3 font-medium text-right">Reservas</th>
                  <th className="pb-3 font-medium text-right">Agendadas</th>
                  <th className="pb-3 font-medium text-right">Ocupação</th>
                  <th className="pb-3 font-medium text-right">Receita</th>
                </tr>
              </thead>
              <tbody>
                {meses.map((m, i) => (
                  <tr key={i} className="border-b border-[var(--gray-100)]">
                    <td className="py-3 font-medium text-[var(--gray-900)]">{m.label}</td>
                    <td className="py-3 text-right text-[var(--gray-600)]">{m.reservas}</td>
                    <td className="py-3 text-right text-[var(--gray-600)]">{m.agendadas}</td>
                    <td className="py-3 text-right">
                      <span className={`font-mono ${m.ocupacao >= 80 ? 'text-[#C0392B] font-semibold' : 'text-[var(--gray-600)]'}`}>
                        {m.ocupacao}%
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-[var(--gray-900)]">
                      {formatCurrency(m.receita)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="pt-3 text-[var(--gray-900)]">Total</td>
                  <td className="pt-3 text-right text-[var(--gray-900)]">{totalReservas}</td>
                  <td className="pt-3 text-right text-[var(--gray-900)]">{meses.reduce((a, m) => a + m.agendadas, 0)}</td>
                  <td className="pt-3 text-right text-[var(--gray-900)] font-mono">{mediaOcupacao}%</td>
                  <td className="pt-3 text-right text-[var(--primary)] font-mono">{formatCurrency(totalReceita)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

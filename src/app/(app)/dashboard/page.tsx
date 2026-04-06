import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import {
  ClipboardList, CheckCircle, Clock, XCircle, Calendar,
  Users, CalendarPlus, TrendingUp, DollarSign, BarChart3,
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/pricing'
import { RESERVA_STATUS_HEX } from '@/lib/status-colors'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'solicitante'

  // Solicitante-only dashboard
  if (role === 'solicitante') {
    return <SolicitanteDashboard userId={user.id} />
  }

  // Admin redirect
  if (role === 'admin') redirect('/admin')

  // Comercial / Parceiro dashboard
  const today = new Date().toISOString().slice(0, 10)

  // Próxima reserva
  const { data: proximaReserva } = await supabase
    .from('reservas')
    .select('id, data_entrada, data_saida, status, num_participantes, cliente:clientes(nome)')
    .gte('data_entrada', today)
    .not('status', 'eq', 'cancelada')
    .order('data_entrada', { ascending: true })
    .limit(1)
    .single()

  // Stats do mês
  const mesInicio = new Date()
  mesInicio.setDate(1)
  const mesFim = new Date(mesInicio.getFullYear(), mesInicio.getMonth() + 1, 0)
  const diasNoMes = mesFim.getDate()

  const { data: reservasMes } = await supabase
    .from('reservas')
    .select('data_entrada, data_saida, status, valor_total')
    .gte('data_saida', mesInicio.toISOString().slice(0, 10))
    .lte('data_entrada', mesFim.toISOString().slice(0, 10))
    .not('status', 'eq', 'cancelada')

  let diasOcupados = 0
  let receitaMes = 0
  const statusCount: Record<string, number> = { agendada: 0, pre_reservada: 0, aberta: 0 }

  if (reservasMes) {
    for (const r of reservasMes) {
      statusCount[r.status] = (statusCount[r.status] ?? 0) + 1
      receitaMes += Number(r.valor_total ?? 0)
      const entrada = new Date(r.data_entrada)
      const saida = new Date(r.data_saida)
      const start = entrada < mesInicio ? mesInicio : entrada
      const end = saida > mesFim ? mesFim : saida
      diasOcupados += Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000))
    }
  }

  const ocupacaoPercent = Math.round((diasOcupados / diasNoMes) * 100)

  // Clientes recentes
  const { count: totalClientes } = await supabase
    .from('clientes')
    .select('id', { count: 'exact', head: true })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Dashboard</h1>
        <p className="text-[var(--gray-500)] mt-1">Visão geral do espaço e vendas</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-[var(--primary-light)]">
              <BarChart3 size={24} className="text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--gray-900)]">{ocupacaoPercent}%</p>
              <p className="text-sm text-[var(--gray-500)]">Ocupação do mês</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-[var(--success-light)]">
              <DollarSign size={24} className="text-[#1e8449]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--gray-900)]">{formatCurrency(receitaMes)}</p>
              <p className="text-sm text-[var(--gray-500)]">Receita do mês</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-[var(--warning-light)]">
              <Calendar size={24} className="text-[#b7770a]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--gray-900)]">{reservasMes?.length ?? 0}</p>
              <p className="text-sm text-[var(--gray-500)]">Reservas no mês</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-[#d6e4f7]">
              <Users size={24} className="text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--gray-900)]">{totalClientes ?? 0}</p>
              <p className="text-sm text-[var(--gray-500)]">Clientes cadastrados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Próxima reserva + Status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Próxima reserva */}
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-[var(--gray-700)] mb-4 flex items-center gap-2">
              <CalendarPlus size={16} /> Próxima Reserva
            </h3>
            {proximaReserva ? (
              <Link href={`/reservas/${proximaReserva.id}`} className="block hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-3">
                  <div
                    className="w-1 h-14 rounded-full"
                    style={{ backgroundColor: RESERVA_STATUS_HEX[proximaReserva.status] }}
                  />
                  <div>
                    <p className="font-semibold text-[var(--gray-900)]">
                      {(proximaReserva.cliente as any)?.nome ?? '—'}
                    </p>
                    <p className="text-sm text-[var(--gray-500)]">
                      {new Date(proximaReserva.data_entrada + 'T12:00:00').toLocaleDateString('pt-BR')} — {new Date(proximaReserva.data_saida + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-xs text-[var(--gray-400)] mt-0.5">
                      {proximaReserva.num_participantes} participantes
                    </p>
                  </div>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-[var(--gray-400)]">Nenhuma reserva futura</p>
            )}
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-[var(--gray-700)] mb-4 flex items-center gap-2">
              <TrendingUp size={16} /> Reservas por Status (mês)
            </h3>
            <div className="space-y-3">
              {[
                { key: 'agendada', label: 'Agendadas' },
                { key: 'pre_reservada', label: 'Pré-reservadas' },
                { key: 'aberta', label: 'Abertas' },
              ].map(s => (
                <div key={s.key} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: RESERVA_STATUS_HEX[s.key] }} />
                  <span className="text-sm text-[var(--gray-600)] flex-1">{s.label}</span>
                  <span className="text-sm font-semibold text-[var(--gray-900)]">{statusCount[s.key] ?? 0}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/reservas/nova"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
        >
          <CalendarPlus size={16} /> Bookar Data
        </Link>
        <Link
          href="/clientes/novo"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[var(--gray-700)] border border-[var(--gray-300)] rounded-lg text-sm font-medium hover:bg-[var(--gray-50)] transition-colors"
        >
          <Users size={16} /> Novo Cliente
        </Link>
        <Link
          href="/calendario"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[var(--gray-700)] border border-[var(--gray-300)] rounded-lg text-sm font-medium hover:bg-[var(--gray-50)] transition-colors"
        >
          <Calendar size={16} /> Calendário
        </Link>
      </div>
    </div>
  )
}

// Solicitante dashboard (original)
async function SolicitanteDashboard({ userId }: { userId: string }) {
  const supabase = await createClient()

  const { data: solicitacoes } = await supabase
    .from('solicitacoes')
    .select('status')
    .eq('solicitante_id', userId)

  const total = solicitacoes?.length || 0
  const pendentes = solicitacoes?.filter(s => s.status === 'pendente').length || 0
  const aprovadas = solicitacoes?.filter(s => s.status === 'aprovado').length || 0
  const recusadas = solicitacoes?.filter(s => s.status === 'recusado').length || 0

  const stats = [
    { label: 'Total', value: total, icon: ClipboardList, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary-light)]' },
    { label: 'Pendentes', value: pendentes, icon: Clock, color: 'text-[#b7770a]', bg: 'bg-[var(--warning-light)]' },
    { label: 'Aprovadas', value: aprovadas, icon: CheckCircle, color: 'text-[#1e8449]', bg: 'bg-[var(--success-light)]' },
    { label: 'Recusadas', value: recusadas, icon: XCircle, color: 'text-[#922b21]', bg: 'bg-[var(--danger-light)]' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Início</h1>
        <p className="text-[var(--gray-500)] mt-1">Acompanhe suas solicitações de eventos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon size={24} className={stat.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--gray-900)]">{stat.value}</p>
                <p className="text-sm text-[var(--gray-500)]">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/solicitacoes/nova"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
        >
          Nova Solicitação
        </Link>
        <Link
          href="/solicitacoes"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[var(--gray-700)] border border-[var(--gray-300)] rounded-lg text-sm font-medium hover:bg-[var(--gray-50)] transition-colors"
        >
          Ver Solicitações
        </Link>
      </div>
    </div>
  )
}

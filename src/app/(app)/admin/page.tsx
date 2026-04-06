import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import {
  ClipboardList, CheckCircle, Clock, Users,
  Calendar, CalendarPlus, DollarSign, BarChart3, TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/pricing'
import { RESERVA_STATUS_HEX } from '@/lib/status-colors'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Solicitações
  const { data: solicitacoes } = await supabase
    .from('solicitacoes')
    .select('status')

  const pendentes = solicitacoes?.filter(s => s.status === 'pendente').length || 0
  const aprovadas = solicitacoes?.filter(s => s.status === 'aprovado').length || 0

  // Usuários
  const { count: totalUsuarios } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  // Clientes
  const { count: totalClientes } = await supabase
    .from('clientes')
    .select('id', { count: 'exact', head: true })

  // Ocupação e receita do mês
  const today = new Date()
  const mesInicio = new Date(today.getFullYear(), today.getMonth(), 1)
  const mesFim = new Date(today.getFullYear(), today.getMonth() + 1, 0)
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

  // Próxima reserva
  const { data: proximaReserva } = await supabase
    .from('reservas')
    .select('id, data_entrada, data_saida, status, num_participantes, cliente:clientes(nome)')
    .gte('data_entrada', today.toISOString().slice(0, 10))
    .not('status', 'eq', 'cancelada')
    .order('data_entrada', { ascending: true })
    .limit(1)
    .single()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Painel Administrativo</h1>
        <p className="text-[var(--gray-500)] mt-1">Visão geral do sistema e operação</p>
      </div>

      {/* Alerta pendentes */}
      {pendentes > 0 && (
        <Link href="/admin/solicitacoes?status=pendente">
          <div className="bg-[var(--warning-light)] border border-[#F39C12] rounded-xl p-4 mb-6 hover:opacity-90 transition-opacity">
            <p className="text-sm text-[#b7770a] font-medium">
              {pendentes} solicitação(ões) pendente(s) aguardando aprovação →
            </p>
          </div>
        </Link>
      )}

      {/* KPI Row 1 — Operação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

        <Link href="/admin/usuarios">
          <Card className="hover:border-[var(--primary)] transition-colors cursor-pointer h-full">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#d6e4f7]">
                <Users size={24} className="text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--gray-900)]">{totalUsuarios ?? 0}</p>
                <p className="text-sm text-[var(--gray-500)]">Usuários</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/clientes">
          <Card className="hover:border-[var(--primary)] transition-colors cursor-pointer h-full">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[var(--warning-light)]">
                <Calendar size={24} className="text-[#b7770a]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--gray-900)]">{totalClientes ?? 0}</p>
                <p className="text-sm text-[var(--gray-500)]">Clientes</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Row 2 — Próxima reserva + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                    <p className="text-xs text-[var(--gray-400)] mt-0.5">{proximaReserva.num_participantes} participantes</p>
                  </div>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-[var(--gray-400)]">Nenhuma reserva futura</p>
            )}
          </CardContent>
        </Card>

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

      {/* KPI Row 3 — Solicitações */}
      <h3 className="text-sm font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-3">Solicitações</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link href="/admin/solicitacoes?status=pendente">
          <Card className="hover:border-[var(--primary)] transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[var(--warning-light)]">
                <Clock size={24} className="text-[#b7770a]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--gray-900)]">{pendentes}</p>
                <p className="text-sm text-[var(--gray-500)]">Pendentes</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/solicitacoes?status=aprovado">
          <Card className="hover:border-[var(--primary)] transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[var(--success-light)]">
                <CheckCircle size={24} className="text-[#1e8449]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--gray-900)]">{aprovadas}</p>
                <p className="text-sm text-[var(--gray-500)]">Aprovadas</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/solicitacoes">
          <Card className="hover:border-[var(--primary)] transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[var(--primary-light)]">
                <ClipboardList size={24} className="text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--gray-900)]">{solicitacoes?.length ?? 0}</p>
                <p className="text-sm text-[var(--gray-500)]">Total</p>
              </div>
            </CardContent>
          </Card>
        </Link>
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
          href="/admin/calendario"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[var(--gray-700)] border border-[var(--gray-300)] rounded-lg text-sm font-medium hover:bg-[var(--gray-50)] transition-colors"
        >
          <Calendar size={16} /> Calendário
        </Link>
        <Link
          href="/crm"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[var(--gray-700)] border border-[var(--gray-300)] rounded-lg text-sm font-medium hover:bg-[var(--gray-50)] transition-colors"
        >
          <TrendingUp size={16} /> CRM
        </Link>
      </div>
    </div>
  )
}

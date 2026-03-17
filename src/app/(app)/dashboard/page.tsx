import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { ClipboardList, CheckCircle, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') redirect('/admin')

  const { data: solicitacoes } = await supabase
    .from('solicitacoes')
    .select('status')
    .eq('solicitante_id', user.id)

  const total = solicitacoes?.length || 0
  const pendentes = solicitacoes?.filter(s => s.status === 'pendente').length || 0
  const aprovadas = solicitacoes?.filter(s => s.status === 'aprovado').length || 0
  const recusadas = solicitacoes?.filter(s => s.status === 'recusado').length || 0

  const stats = [
    { label: 'Total', value: total, icon: ClipboardList, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary-light)]' },
    { label: 'Pendentes', value: pendentes, icon: Clock, color: 'text-amber-600', bg: 'bg-[var(--warning-light)]' },
    { label: 'Aprovadas', value: aprovadas, icon: CheckCircle, color: 'text-green-600', bg: 'bg-[var(--success-light)]' },
    { label: 'Recusadas', value: recusadas, icon: XCircle, color: 'text-red-600', bg: 'bg-[var(--danger-light)]' },
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

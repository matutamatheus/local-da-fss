import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { ClipboardList, CheckCircle, Clock, XCircle, Users, MapPin } from 'lucide-react'
import Link from 'next/link'

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

  const { data: solicitacoes } = await supabase
    .from('solicitacoes')
    .select('status')

  const { count: totalUsuarios } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const total = solicitacoes?.length || 0
  const pendentes = solicitacoes?.filter(s => s.status === 'pendente').length || 0
  const aprovadas = solicitacoes?.filter(s => s.status === 'aprovado').length || 0
  const recusadas = solicitacoes?.filter(s => s.status === 'recusado').length || 0

  const stats = [
    { label: 'Pendentes', value: pendentes, icon: Clock, color: 'text-amber-600', bg: 'bg-[var(--warning-light)]', href: '/admin/solicitacoes?status=pendente' },
    { label: 'Aprovadas', value: aprovadas, icon: CheckCircle, color: 'text-green-600', bg: 'bg-[var(--success-light)]', href: '/admin/solicitacoes?status=aprovado' },
    { label: 'Recusadas', value: recusadas, icon: XCircle, color: 'text-red-600', bg: 'bg-[var(--danger-light)]', href: '/admin/solicitacoes?status=recusado' },
    { label: 'Usuários', value: totalUsuarios || 0, icon: Users, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary-light)]', href: '/admin/usuarios' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Painel Administrativo</h1>
        <p className="text-[var(--gray-500)] mt-1">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:border-[var(--primary)] transition-colors cursor-pointer">
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
          </Link>
        ))}
      </div>

      {pendentes > 0 && (
        <div className="bg-[var(--warning-light)] border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800 font-medium">
            Você tem {pendentes} solicitação(ões) pendente(s) aguardando aprovação.
          </p>
          <Link href="/admin/solicitacoes?status=pendente" className="text-sm text-amber-900 underline mt-1 inline-block">
            Ver solicitações pendentes
          </Link>
        </div>
      )}
    </div>
  )
}

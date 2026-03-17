import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { EventStatus } from '@/lib/types'

export default async function SolicitacoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: solicitacoes } = await supabase
    .from('solicitacoes')
    .select('*, espaco:espacos(*)')
    .eq('solicitante_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-[var(--gray-900)]">Minhas Solicitações</h1>
          <p className="text-[var(--gray-500)] mt-1 text-sm">Acompanhe o status dos seus pedidos</p>
        </div>
        <Link
          href="/solicitacoes/nova"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
        >
          Nova Solicitação
        </Link>
      </div>

      {!solicitacoes?.length ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-[var(--gray-500)]">Você ainda não tem solicitações.</p>
            <Link href="/solicitacoes/nova" className="text-[var(--primary)] hover:underline text-sm mt-2 inline-block">
              Criar primeira solicitação
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {solicitacoes.map((sol) => (
            <Link key={sol.id} href={`/solicitacoes/${sol.id}`}>
              <Card className="hover:border-[var(--primary)] transition-colors cursor-pointer">
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--gray-900)] truncate">{sol.titulo}</h3>
                    <p className="text-xs text-[var(--gray-500)] mt-1">
                      {format(new Date(sol.data_inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {' — '}
                      {sol.espaco?.nome || 'Espaço não definido'}
                    </p>
                    {sol.motivo_recusa && (
                      <p className="text-xs text-[var(--danger)] mt-1">Motivo: {sol.motivo_recusa}</p>
                    )}
                  </div>
                  <StatusBadge status={sol.status as EventStatus} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

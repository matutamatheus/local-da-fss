import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Edit, Mail, Phone, Globe, Building, Users, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const produtoLabel: Record<string, string> = {
  ia_full_sales: 'IA Full Sales',
  high_sales: 'High Sales',
  aceleracao: 'Programa de Aceleração',
  ativacao: 'Programa de Ativação',
  outro: 'Outro produto',
}

const reservaStatusLabel: Record<string, string> = {
  aberta: 'Aberta',
  pre_reservada: 'Pré-reservada',
  agendada: 'Agendada',
  cancelada: 'Cancelada',
}

const reservaStatusColor: Record<string, string> = {
  aberta: 'bg-blue-100 text-blue-700',
  pre_reservada: 'bg-purple-100 text-purple-700',
  agendada: 'bg-green-100 text-green-700',
  cancelada: 'bg-gray-100 text-gray-500',
}

function formatDate(d?: string | null) {
  if (!d) return '—'
  return format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
}

function formatCurrency(v?: number | null) {
  if (v === undefined || v === null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const [{ data: cliente }, { data: reservas }, { data: propostas }] = await Promise.all([
    supabase
      .from('clientes')
      .select('*, crm_etapa:crm_etapas(id, nome, cor)')
      .eq('id', id)
      .single(),
    supabase
      .from('reservas')
      .select('*, espaco:espacos(nome)')
      .eq('cliente_id', id)
      .order('data_entrada', { ascending: false }),
    supabase
      .from('propostas')
      .select('*')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!cliente) notFound()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/clientes" className="flex items-center gap-2 text-sm text-[var(--gray-500)] hover:text-[var(--gray-700)] mb-4">
          <ArrowLeft size={16} /> Voltar para Clientes
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-[var(--gray-900)]">{cliente.nome}</h1>
            {cliente.empresa && (
              <p className="text-[var(--gray-500)] mt-0.5 flex items-center gap-1.5">
                <Building size={14} /> {cliente.empresa}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/reservas/nova?cliente=${id}`}
              className="flex items-center gap-2 bg-[var(--primary)] text-white px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Calendar size={15} /> Bookar Data
            </Link>
            <Link
              href={`/clientes/${id}/editar`}
              className="flex items-center gap-2 bg-white border border-[var(--gray-200)] text-[var(--gray-700)] px-3 py-2 rounded-lg text-sm font-medium hover:bg-[var(--gray-50)]"
            >
              <Edit size={15} /> Editar
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Dados */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--gray-900)]">Informações</h2>
              {cliente.crm_etapa && (
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium text-white"
                  style={{ backgroundColor: cliente.crm_etapa.cor }}
                >
                  {cliente.crm_etapa.nome}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {cliente.email && (
                <div>
                  <dt className="text-xs text-[var(--gray-500)] flex items-center gap-1"><Mail size={11} /> E-mail</dt>
                  <dd className="text-sm text-[var(--gray-900)] mt-0.5">{cliente.email}</dd>
                </div>
              )}
              {cliente.telefone && (
                <div>
                  <dt className="text-xs text-[var(--gray-500)] flex items-center gap-1"><Phone size={11} /> Telefone</dt>
                  <dd className="text-sm text-[var(--gray-900)] mt-0.5">{cliente.telefone}</dd>
                </div>
              )}
              {cliente.site && (
                <div>
                  <dt className="text-xs text-[var(--gray-500)] flex items-center gap-1"><Globe size={11} /> Site</dt>
                  <dd className="text-sm text-[var(--gray-900)] mt-0.5 truncate">{cliente.site}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-[var(--gray-500)]">Cliente Full Sales</dt>
                <dd className="text-sm mt-0.5">
                  {cliente.cliente_full_sales ? (
                    <span className="text-[var(--primary)] font-medium">
                      Sim{cliente.produto ? ` — ${produtoLabel[cliente.produto]}` : ''}
                    </span>
                  ) : 'Não'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--gray-500)]">Cadastrado em</dt>
                <dd className="text-sm text-[var(--gray-900)] mt-0.5">{formatDate(cliente.created_at)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Próximos eventos */}
        {(cliente.proximo_evento_1 || cliente.proximo_evento_2) && (
          <Card>
            <CardHeader><h2 className="font-semibold text-[var(--gray-900)]">Próximos Eventos</h2></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cliente.proximo_evento_1 && (
                  <div className="flex items-center justify-between bg-[var(--gray-50)] rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={15} className="text-[var(--primary)]" />
                      <span className="text-sm font-medium">{formatDate(cliente.proximo_evento_1)}</span>
                    </div>
                    {cliente.proximo_evento_1_pessoas && (
                      <span className="text-xs text-[var(--gray-500)] flex items-center gap-1">
                        <Users size={11} /> {cliente.proximo_evento_1_pessoas} pessoas
                      </span>
                    )}
                  </div>
                )}
                {cliente.proximo_evento_2 && (
                  <div className="flex items-center justify-between bg-[var(--gray-50)] rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={15} className="text-[var(--gray-400)]" />
                      <span className="text-sm font-medium">{formatDate(cliente.proximo_evento_2)}</span>
                    </div>
                    {cliente.proximo_evento_2_pessoas && (
                      <span className="text-xs text-[var(--gray-500)] flex items-center gap-1">
                        <Users size={11} /> {cliente.proximo_evento_2_pessoas} pessoas
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        {cliente.observacoes && (
          <Card>
            <CardHeader><h2 className="font-semibold text-[var(--gray-900)]">Observações</h2></CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--gray-700)] whitespace-pre-wrap">{cliente.observacoes}</p>
            </CardContent>
          </Card>
        )}

        {/* Reservas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--gray-900)]">Reservas ({reservas?.length ?? 0})</h2>
              <Link
                href={`/reservas/nova?cliente=${id}`}
                className="text-xs text-[var(--primary)] hover:underline"
              >
                + Nova reserva
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!reservas?.length ? (
              <p className="text-sm text-[var(--gray-400)]">Nenhuma reserva ainda.</p>
            ) : (
              <div className="space-y-2">
                {reservas.map(r => (
                  <Link key={r.id} href={`/reservas/${r.id}`}
                    className="flex items-center justify-between bg-[var(--gray-50)] rounded-lg p-3 hover:bg-[var(--gray-100)] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{formatDate(r.data_entrada)} → {formatDate(r.data_saida)}</p>
                      <p className="text-xs text-[var(--gray-500)]">{r.espaco?.nome ?? 'Espaço não definido'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.valor_total && <span className="text-xs font-medium text-[var(--gray-700)]">{formatCurrency(r.valor_total)}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${reservaStatusColor[r.status]}`}>
                        {reservaStatusLabel[r.status]}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Propostas */}
        <Card>
          <CardHeader><h2 className="font-semibold text-[var(--gray-900)]">Propostas ({propostas?.length ?? 0})</h2></CardHeader>
          <CardContent>
            {!propostas?.length ? (
              <p className="text-sm text-[var(--gray-400)]">Nenhuma proposta gerada ainda.</p>
            ) : (
              <div className="space-y-2">
                {propostas.map(p => (
                  <Link key={p.id} href={`/propostas/${p.id}/imprimir`} target="_blank"
                    className="flex items-center justify-between bg-[var(--gray-50)] rounded-lg p-3 hover:bg-[var(--gray-100)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="text-[var(--gray-400)]" />
                      <span className="text-sm">Proposta gerada em {formatDate(p.created_at)}</span>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(p.valor_total)}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

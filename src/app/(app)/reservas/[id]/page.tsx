import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Users, Mic, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import ReservaStatusEdit from './status-edit'
import GerarProposta from './gerar-proposta'

const statusLabel: Record<string, string> = {
  aberta: 'Aberta',
  pre_reservada: 'Pré-reservada',
  agendada: 'Agendada',
  cancelada: 'Cancelada',
}

const statusColor: Record<string, string> = {
  aberta: 'bg-blue-100 text-blue-700',
  pre_reservada: 'bg-yellow-100 text-yellow-700',
  agendada: 'bg-green-100 text-green-700',
  cancelada: 'bg-gray-100 text-gray-500',
}

function formatDate(d?: string | null) {
  if (!d) return '—'
  return format(new Date(d + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

function formatCurrency(v?: number | null) {
  if (v === undefined || v === null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export default async function ReservaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const [{ data: reserva }, { data: propostas }] = await Promise.all([
    supabase
      .from('reservas')
      .select('*, cliente:clientes(id, nome, empresa, email, telefone), espaco:espacos(nome)')
      .eq('id', id)
      .single(),
    supabase
      .from('propostas')
      .select('*')
      .eq('reserva_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!reserva) notFound()

  const cliente = reserva.cliente as { id: string; nome: string; empresa?: string; email?: string; telefone?: string } | null

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={cliente?.id ? `/clientes/${cliente.id}` : '/clientes'}
          className="flex items-center gap-2 text-sm text-[var(--gray-500)] hover:text-[var(--gray-700)] mb-4">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-[var(--gray-900)]">Reserva</h1>
            <p className="text-[var(--gray-500)] mt-0.5 text-sm">
              {cliente?.nome ?? 'Cliente não encontrado'}
              {cliente?.empresa ? ` — ${cliente.empresa}` : ''}
            </p>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full font-medium shrink-0 ${statusColor[reserva.status]}`}>
            {statusLabel[reserva.status]}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><h2 className="font-semibold text-[var(--gray-900)]">Detalhes</h2></CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex gap-2">
                <Calendar size={16} className="text-[var(--gray-400)] mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs text-[var(--gray-500)]">Período</dt>
                  <dd className="text-sm font-medium mt-0.5">
                    {formatDate(reserva.data_entrada)} → {formatDate(reserva.data_saida)}
                  </dd>
                </div>
              </div>
              <div className="flex gap-2">
                <Users size={16} className="text-[var(--gray-400)] mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs text-[var(--gray-500)]">Participantes</dt>
                  <dd className="text-sm mt-0.5">{reserva.num_participantes} pessoa(s)</dd>
                </div>
              </div>
              <div className="flex gap-2">
                <Mic size={16} className="text-[var(--gray-400)] mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs text-[var(--gray-500)]">Áudio visual</dt>
                  <dd className="text-sm mt-0.5">{reserva.audiovisual ? 'Incluso' : 'Não incluso'}</dd>
                </div>
              </div>
              {(reserva.espaco as any)?.nome && (
                <div>
                  <dt className="text-xs text-[var(--gray-500)]">Espaço</dt>
                  <dd className="text-sm mt-0.5">{(reserva.espaco as any).nome}</dd>
                </div>
              )}
              {reserva.observacoes && (
                <div>
                  <dt className="text-xs text-[var(--gray-500)]">Observações</dt>
                  <dd className="text-sm mt-0.5 whitespace-pre-wrap">{reserva.observacoes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {(reserva.valor_total != null) && (
          <Card>
            <CardHeader><h2 className="font-semibold text-[var(--gray-900)]">Valores</h2></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reserva.valor_diaria != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--gray-500)]">Diária base</span>
                    <span>{formatCurrency(reserva.valor_diaria)}</span>
                  </div>
                )}
                {reserva.desconto_aplicado > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Desconto ({reserva.desconto_aplicado}%)</span>
                    <span>— {formatCurrency((reserva.valor_total ?? 0) / (1 - reserva.desconto_aplicado / 100) * (reserva.desconto_aplicado / 100))}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t border-[var(--gray-200)] pt-2 mt-2">
                  <span>Total da reserva</span>
                  <span className="text-[var(--primary)]">{formatCurrency(reserva.valor_total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-[var(--gray-900)]">Propostas ({propostas?.length ?? 0})</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {propostas && propostas.length > 0 && (
              <div className="space-y-2">
                {propostas.map(p => (
                  <a key={p.id} href={`/propostas/${p.id}/imprimir`} target="_blank"
                    className="flex items-center justify-between bg-[var(--gray-50)] rounded-lg p-3 hover:bg-[var(--gray-100)] transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="text-[var(--gray-400)]" />
                      <span className="text-sm">
                        {format(new Date(p.created_at), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatCurrency(p.valor_total)}</span>
                      <span className="text-xs text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                        Abrir PDF →
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}

            <GerarProposta
              reservaId={id}
              clienteId={reserva.cliente_id}
              valorTotal={reserva.valor_total}
              clienteEmail={cliente?.email}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 flex-wrap">
          {cliente?.id && (
            <Link href={`/clientes/${cliente.id}`}>
              <button className="flex items-center gap-2 px-4 py-2 border border-[var(--gray-200)] rounded-lg text-sm hover:bg-[var(--gray-50)] transition-colors">
                <Users size={15} /> Ver Cliente
              </button>
            </Link>
          )}
          <ReservaStatusEdit reservaId={id} currentStatus={reserva.status} />
        </div>
      </div>
    </div>
  )
}

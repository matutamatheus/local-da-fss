import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import PrintButton from './print-button'

function formatDate(d?: string | null) {
  if (!d) return '—'
  return format(new Date(d + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

function formatCurrency(v?: number | null) {
  if (v === undefined || v === null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export default async function ImprimirPropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const [{ data: proposta }, { data: regrasComerciais }] = await Promise.all([
    supabase
      .from('propostas')
      .select(`
        *,
        reserva:reservas(*, espaco:espacos(nome)),
        cliente:clientes(nome, empresa, email, telefone)
      `)
      .eq('id', id)
      .single(),
    supabase.from('regras_comerciais').select('*').single(),
  ])

  if (!proposta) notFound()

  const reserva = proposta.reserva as {
    data_entrada: string
    data_saida: string
    num_participantes: number
    audiovisual: boolean
    valor_diaria?: number
    valor_total?: number
    desconto_aplicado: number
    espaco?: { nome: string }
  }

  const cliente = proposta.cliente as {
    nome: string
    empresa?: string
    email?: string
    telefone?: string
  }

  const descritivo = proposta.descritivo
    ? proposta.descritivo
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean)
    : []

  const valorTotal = proposta.valor_total ?? reserva?.valor_total ?? 0
  const valorDiaria = reserva?.valor_diaria
  const desconto = reserva?.desconto_aplicado ?? 0
  const subtotal = desconto > 0 ? valorTotal / (1 - desconto / 100) : valorTotal

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Proposta — Full Sales</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; background: #fff; }
          .page { max-width: 800px; margin: 0 auto; padding: 48px 40px; }
          .header { border-bottom: 3px solid #6c5ce7; padding-bottom: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start; }
          .brand { }
          .brand-name { font-size: 28px; font-weight: 900; color: #6c5ce7; letter-spacing: -0.5px; }
          .brand-sub { font-size: 12px; color: #666; margin-top: 2px; }
          .proposta-title { text-align: right; }
          .proposta-title h1 { font-size: 13px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 1px; }
          .proposta-title p { font-size: 20px; font-weight: 800; color: #1a1a2e; margin-top: 4px; }
          .section { margin-bottom: 28px; }
          .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #6c5ce7; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .field label { font-size: 10px; font-weight: 600; color: #999; text-transform: uppercase; }
          .field p { font-size: 14px; color: #1a1a2e; margin-top: 2px; }
          .descritivo-list { list-style: none; space-y: 4px; }
          .descritivo-list li { font-size: 13px; color: #374151; padding: 4px 0; padding-left: 16px; position: relative; }
          .descritivo-list li::before { content: '•'; position: absolute; left: 0; color: #6c5ce7; font-weight: bold; }
          .pricing-table { width: 100%; border-collapse: collapse; }
          .pricing-table td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
          .pricing-table .label { color: #6b7280; }
          .pricing-table .value { text-align: right; font-weight: 500; }
          .pricing-total { background: #f5f3ff; }
          .pricing-total td { font-size: 16px; font-weight: 800; color: #6c5ce7; padding: 12px 12px; border-bottom: none; }
          .regras-block { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
          .regras-block p { font-size: 11px; color: #374151; line-height: 1.6; white-space: pre-wrap; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; }
          .footer p { font-size: 11px; color: #9ca3af; }
          .no-print { }
          .print-bar { background: #6c5ce7; color: white; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; gap-16; position: sticky; top: 0; z-index: 100; }
          .print-bar p { font-size: 14px; font-weight: 500; }
          @media print {
            .no-print { display: none !important; }
            .page { padding: 0; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        `}</style>
      </head>
      <body>
        {/* Print bar */}
        <div className="print-bar no-print">
          <p>Proposta — {cliente.nome}</p>
          <PrintButton />
        </div>

        <div className="page">
          {/* Header */}
          <div className="header">
            <div className="brand">
              <div className="brand-name">FULL SALES</div>
              <div className="brand-sub">Locação de Espaço para Eventos</div>
            </div>
            <div className="proposta-title">
              <h1>Documento</h1>
              <p>PROPOSTA COMERCIAL</p>
            </div>
          </div>

          {/* Dados do evento */}
          <div className="section">
            <div className="section-title">Dados do Evento</div>
            <div className="grid-2">
              <div className="field">
                <label>Espaço</label>
                <p>{reserva?.espaco?.nome ?? 'FULL SALES — Espaço de Eventos'}</p>
              </div>
              <div className="field">
                <label>Período</label>
                <p>{formatDate(reserva?.data_entrada)} até {formatDate(reserva?.data_saida)}</p>
              </div>
            </div>
          </div>

          {/* Dados do cliente */}
          <div className="section">
            <div className="section-title">Cliente</div>
            <div className="grid-2">
              <div className="field">
                <label>Nome</label>
                <p>{cliente.nome}</p>
              </div>
              {cliente.empresa && (
                <div className="field">
                  <label>Empresa</label>
                  <p>{cliente.empresa}</p>
                </div>
              )}
              {cliente.email && (
                <div className="field">
                  <label>E-mail</label>
                  <p>{cliente.email}</p>
                </div>
              )}
              {cliente.telefone && (
                <div className="field">
                  <label>Telefone</label>
                  <p>{cliente.telefone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Descritivo */}
          {descritivo.length > 0 && (
            <div className="section">
              <div className="section-title">Escopo do Evento</div>
              <ul className="descritivo-list">
                {descritivo.map((item: string, i: number) => (
                  <li key={i}>{item.replace(/^[•\-]\s*/, '')}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Precificação */}
          <div className="section">
            <div className="section-title">Valores</div>
            <table className="pricing-table">
              <tbody>
                {valorDiaria != null && (
                  <tr>
                    <td className="label">Valor da diária</td>
                    <td className="value">{formatCurrency(valorDiaria)}</td>
                  </tr>
                )}
                {desconto > 0 && (
                  <>
                    <tr>
                      <td className="label">Subtotal</td>
                      <td className="value">{formatCurrency(subtotal)}</td>
                    </tr>
                    <tr>
                      <td className="label">Desconto ({desconto}%)</td>
                      <td className="value" style={{ color: '#dc2626' }}>− {formatCurrency(subtotal - valorTotal)}</td>
                    </tr>
                  </>
                )}
                <tr className="pricing-total">
                  <td>VALOR TOTAL DA RESERVA</td>
                  <td className="value" style={{ textAlign: 'right' }}>{formatCurrency(valorTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Regras comerciais */}
          {regrasComerciais?.regras_texto && (
            <div className="section">
              <div className="section-title">Regras Comerciais</div>
              <div className="regras-block">
                <p>{regrasComerciais.regras_texto}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <p>Proposta gerada em {format(new Date(proposta.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} · Full Sales © {new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
    </html>
  )
}

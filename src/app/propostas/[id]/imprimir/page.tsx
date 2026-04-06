import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
          body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; color: #2C3E50; background: #fff; }
          .page { max-width: 800px; margin: 0 auto; padding: 48px 40px; }
          .header { border-bottom: 3px solid #0B3D91; padding-bottom: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start; }
          .brand-name { font-size: 28px; font-weight: 900; color: #0B3D91; letter-spacing: -0.5px; }
          .brand-sub { font-size: 12px; color: #4a5568; margin-top: 2px; }
          .proposta-title h1 { font-size: 13px; font-weight: 700; color: #6b7a8d; text-transform: uppercase; letter-spacing: 1px; text-align: right; }
          .proposta-title p { font-size: 20px; font-weight: 800; color: #2C3E50; margin-top: 4px; text-align: right; }
          .section { margin-bottom: 28px; }
          .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #0B3D91; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #dce1e8; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .field label { font-size: 10px; font-weight: 600; color: #8d99a8; text-transform: uppercase; }
          .field p { font-size: 14px; color: #2C3E50; margin-top: 2px; }
          .descritivo-list { list-style: none; }
          .descritivo-list li { font-size: 13px; color: #374151; padding: 4px 0; padding-left: 16px; position: relative; }
          .descritivo-list li::before { content: '•'; position: absolute; left: 0; color: #0B3D91; font-weight: bold; }
          .pricing-table { width: 100%; border-collapse: collapse; }
          .pricing-table td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #ebeef2; }
          .pricing-table .label { color: #6b7a8d; }
          .pricing-table .value { text-align: right; font-weight: 500; }
          .pricing-total { background: #d6e4f7; }
          .pricing-total td { font-size: 16px; font-weight: 800; color: #0B3D91; padding: 12px 12px; border-bottom: none; }
          .regras-block { background: #F4F6F8; border: 1px solid #dce1e8; border-radius: 8px; padding: 16px; }
          .regras-block p { font-size: 11px; color: #374151; line-height: 1.6; white-space: pre-wrap; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #dce1e8; text-align: center; }
          .footer p { font-size: 11px; color: #8d99a8; }
          .print-bar { background: #0B3D91; color: white; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
          .print-bar p { font-size: 14px; font-weight: 500; }
          @media print {
            .no-print { display: none !important; }
            .page { padding: 0; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        `}</style>
      </head>
      <body>
        <div className="print-bar no-print">
          <p>Proposta — {cliente.nome}</p>
          <PrintButton />
        </div>

        <div className="page">
          <div className="header">
            <div>
              <div className="brand-name">FULL SALES</div>
              <div className="brand-sub">Locação de Espaço para Eventos</div>
            </div>
            <div className="proposta-title">
              <h1>Documento</h1>
              <p>PROPOSTA COMERCIAL</p>
            </div>
          </div>

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
                      <td className="value" style={{ color: '#C0392B' }}>− {formatCurrency(subtotal - valorTotal)}</td>
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

          {regrasComerciais?.regras_texto && (
            <div className="section">
              <div className="section-title">Regras Comerciais</div>
              <div className="regras-block">
                <p>{regrasComerciais.regras_texto}</p>
              </div>
            </div>
          )}

          <div className="footer">
            <p>Proposta gerada em {format(new Date(proposta.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} · Full Sales © {new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
    </html>
  )
}

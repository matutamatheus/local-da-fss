import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { propostaId, clienteEmail, clienteNome, propostaUrl } = await request.json()

    if (!propostaId || !clienteEmail) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar proposta
    const { data: proposta } = await supabase
      .from('propostas')
      .select('id, valor_total, descritivo, reserva:reservas(data_entrada, data_saida)')
      .eq('id', propostaId)
      .single()

    if (!proposta) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
    }

    const reserva = proposta.reserva as any

    // Verificar se RESEND_API_KEY está configurada
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      // Fallback: retornar link mailto
      const subject = encodeURIComponent(`Proposta de Locação — FULL SALES`)
      const body = encodeURIComponent(
        `Olá ${clienteNome || ''},\n\nSegue a proposta de locação do espaço FULL SALES.\n\n` +
        `Período: ${reserva?.data_entrada ?? '—'} a ${reserva?.data_saida ?? '—'}\n` +
        `Valor total: R$ ${Number(proposta.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
        `Acesse a proposta completa em: ${propostaUrl}\n\n` +
        `Atenciosamente,\nEquipe FULL SALES`
      )
      return NextResponse.json({
        sent: false,
        mailto: `mailto:${clienteEmail}?subject=${subject}&body=${body}`,
        message: 'RESEND_API_KEY não configurada. Use o link mailto.',
      })
    }

    // Enviar via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Local da FSS <noreply@fullsales.com.br>',
        to: [clienteEmail],
        subject: `Proposta de Locação — FULL SALES`,
        html: `
          <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0B3D91; padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 20px;">FULL SALES</h1>
              <p style="color: #d6e4f7; margin: 4px 0 0; font-size: 13px;">Proposta de Locação de Espaço</p>
            </div>
            <div style="padding: 32px 24px; background: #fff;">
              <p style="color: #2C3E50; margin: 0 0 16px;">Olá <strong>${clienteNome || ''}</strong>,</p>
              <p style="color: #4a5568; margin: 0 0 24px;">Segue a proposta de locação do espaço FULL SALES conforme conversado.</p>
              <div style="background: #F4F6F8; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                <p style="color: #6b7a8d; margin: 0 0 8px; font-size: 13px;">Período</p>
                <p style="color: #2C3E50; margin: 0 0 16px; font-weight: 600;">${reserva?.data_entrada ?? '—'} a ${reserva?.data_saida ?? '—'}</p>
                <p style="color: #6b7a8d; margin: 0 0 8px; font-size: 13px;">Valor Total</p>
                <p style="color: #0B3D91; margin: 0; font-size: 24px; font-weight: 700;">R$ ${Number(proposta.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <a href="${propostaUrl}" style="display: inline-block; background: #0B3D91; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Ver Proposta Completa</a>
            </div>
            <div style="padding: 16px 24px; background: #F4F6F8; text-align: center;">
              <p style="color: #8d99a8; margin: 0; font-size: 12px;">Equipe FULL SALES • Este é um email automático</p>
            </div>
          </div>
        `,
      }),
    })

    if (!emailRes.ok) {
      const errData = await emailRes.json()
      return NextResponse.json({ error: errData.message || 'Erro ao enviar email' }, { status: 500 })
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      acao: 'enviar_proposta_email',
      entidade: 'proposta',
      entidade_id: propostaId,
      detalhes: { clienteEmail, clienteNome },
    })

    return NextResponse.json({ sent: true, message: 'Email enviado com sucesso' })
  } catch (err) {
    console.error('enviar-email error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    // Buscar proposta com pdf_path
    const { data: proposta } = await supabase
      .from('propostas')
      .select('id, valor_total, descritivo, pdf_path, reserva:reservas(data_entrada, data_saida)')
      .eq('id', propostaId)
      .single()

    if (!proposta) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
    }

    const reserva = proposta.reserva as any

    // Verificar se RESEND_API_KEY está configurada
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
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

    // Baixar PDF do Storage se existir
    let pdfAttachment: { filename: string; content: string } | undefined
    if (proposta.pdf_path) {
      const adminClient = createAdminClient()
      const { data: fileData } = await adminClient.storage
        .from('propostas')
        .download(proposta.pdf_path)

      if (fileData) {
        const buffer = Buffer.from(await fileData.arrayBuffer())
        pdfAttachment = {
          filename: `Proposta_FullSales_${clienteNome?.replace(/\s+/g, '_') || 'cliente'}.pdf`,
          content: buffer.toString('base64'),
        }
      }
    }

    // Enviar via Resend
    const emailPayload: Record<string, unknown> = {
      from: process.env.EMAIL_FROM || 'Local da FSS <noreply@fullsales.com.br>',
      to: [clienteEmail],
      subject: `Proposta de Locação — FULL SALES`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0B3D91; padding: 28px 24px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">FULL SALES</h1>
            <p style="color: #d6e4f7; margin: 4px 0 0; font-size: 13px;">Proposta de Locação de Espaço</p>
          </div>
          <div style="padding: 32px 24px; background: #fff; border: 1px solid #dce1e8; border-top: none;">
            <p style="color: #2C3E50; margin: 0 0 16px; font-size: 15px;">Olá <strong>${clienteNome || ''}</strong>,</p>
            <p style="color: #4a5568; margin: 0 0 24px; font-size: 14px; line-height: 1.6;">Segue a proposta de locação do espaço FULL SALES conforme conversado.${pdfAttachment ? ' O PDF está anexado a este email.' : ''}</p>
            <div style="background: #F4F6F8; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
              <p style="color: #8d99a8; margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Período</p>
              <p style="color: #2C3E50; margin: 0 0 16px; font-weight: 600; font-size: 15px;">${reserva?.data_entrada ?? '—'} a ${reserva?.data_saida ?? '—'}</p>
              <p style="color: #8d99a8; margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Valor Total</p>
              <p style="color: #0B3D91; margin: 0; font-size: 26px; font-weight: 700;">R$ ${Number(proposta.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <a href="${propostaUrl}" style="display: inline-block; background: #0B3D91; color: white; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">Ver Proposta Completa</a>
          </div>
          <div style="padding: 20px 24px; background: #F4F6F8; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #dce1e8; border-top: none;">
            <p style="color: #8d99a8; margin: 0; font-size: 11px;">Equipe FULL SALES · Este é um email automático</p>
          </div>
        </div>
      `,
    }

    if (pdfAttachment) {
      emailPayload.attachments = [{
        filename: pdfAttachment.filename,
        content: pdfAttachment.content,
      }]
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify(emailPayload),
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
      detalhes: { clienteEmail, clienteNome, comPdf: !!pdfAttachment },
    })

    return NextResponse.json({ sent: true, message: 'Email enviado com sucesso' })
  } catch (err) {
    console.error('enviar-email error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

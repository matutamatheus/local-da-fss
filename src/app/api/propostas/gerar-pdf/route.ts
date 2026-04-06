import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ReactPDF from '@react-pdf/renderer'
import { PropostaPDF } from '@/lib/proposta-pdf'

export async function POST(request: NextRequest) {
  try {
    const { propostaId } = await request.json()
    if (!propostaId) {
      return NextResponse.json({ error: 'propostaId obrigatório' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar dados da proposta
    const { data: proposta } = await supabase
      .from('propostas')
      .select(`
        *,
        reserva:reservas(*, espaco:espacos(nome)),
        cliente:clientes(nome, empresa, email, telefone)
      `)
      .eq('id', propostaId)
      .single()

    if (!proposta) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
    }

    // Buscar regras comerciais
    const { data: regrasComerciais } = await supabase
      .from('regras_comerciais')
      .select('*')
      .single()

    const reserva = proposta.reserva as any
    const cliente = proposta.cliente as any

    // Gerar PDF
    const pdfData = {
      clienteNome: cliente?.nome ?? '—',
      clienteEmpresa: cliente?.empresa ?? null,
      clienteEmail: cliente?.email ?? null,
      clienteTelefone: cliente?.telefone ?? null,
      espacoNome: reserva?.espaco?.nome ?? 'FULL SALES — Espaço de Eventos',
      dataEntrada: reserva?.data_entrada ?? '',
      dataSaida: reserva?.data_saida ?? '',
      numParticipantes: reserva?.num_participantes ?? 0,
      audiovisual: reserva?.audiovisual ?? false,
      valorDiaria: reserva?.valor_diaria ?? null,
      valorTotal: proposta.valor_total ?? reserva?.valor_total ?? 0,
      descontoAplicado: reserva?.desconto_aplicado ?? 0,
      descritivo: proposta.descritivo ?? '',
      regrasTexto: regrasComerciais?.regras_texto ?? '',
      criadoEm: proposta.created_at,
    }

    const pdfStream = await ReactPDF.renderToStream(PropostaPDF(pdfData))

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of pdfStream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    const pdfBuffer = Buffer.concat(chunks)

    // Upload to Supabase Storage
    const adminClient = createAdminClient()
    const fileName = `proposta_${propostaId}.pdf`
    const storagePath = `${proposta.cliente_id}/${fileName}`

    const { error: uploadError } = await adminClient.storage
      .from('propostas')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Erro ao salvar PDF' }, { status: 500 })
    }

    // Atualizar proposta com o path
    await supabase
      .from('propostas')
      .update({ pdf_path: storagePath })
      .eq('id', propostaId)

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      acao: 'gerar_proposta',
      entidade: 'proposta',
      entidade_id: propostaId,
      detalhes: { cliente_id: proposta.cliente_id, valor: pdfData.valorTotal, pdf_path: storagePath },
    })

    return NextResponse.json({ success: true, pdf_path: storagePath })
  } catch (err) {
    console.error('gerar-pdf error:', err)
    return NextResponse.json({ error: 'Erro interno ao gerar PDF' }, { status: 500 })
  }
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FileText, Send, Download, Loader2 } from 'lucide-react'
import { showToast } from '@/components/ui/toast'

export default function GerarProposta({
  reservaId,
  clienteId,
  clienteNome,
  valorTotal,
  clienteEmail,
}: {
  reservaId: string
  clienteId: string
  clienteNome?: string | null
  valorTotal?: number | null
  clienteEmail?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [descritivo, setDescritivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [error, setError] = useState('')
  const [propostaId, setPropostaId] = useState<string | null>(null)
  const [pdfPath, setPdfPath] = useState<string | null>(null)
  const router = useRouter()

  async function handleGerar() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Não autenticado'); setLoading(false); return }

    // 1. Criar proposta no DB
    const { data, error: err } = await supabase.from('propostas').insert({
      reserva_id: reservaId,
      cliente_id: clienteId,
      valor_total: valorTotal ?? 0,
      descritivo: descritivo.trim(),
      criado_por: user.id,
    }).select().single()

    if (err) {
      setError('Erro ao gerar proposta. Tente novamente.')
      setLoading(false)
      return
    }

    if (data) {
      setPropostaId(data.id)

      // 2. Gerar PDF server-side e salvar no Storage
      try {
        const pdfRes = await fetch('/api/propostas/gerar-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propostaId: data.id }),
        })
        const pdfData = await pdfRes.json()
        if (pdfData.success) {
          setPdfPath(pdfData.pdf_path)
          showToast('success', 'Proposta gerada e PDF salvo!')
        } else {
          showToast('warning', 'Proposta criada, mas erro ao gerar PDF. Use a versão web.')
        }
      } catch {
        showToast('warning', 'Proposta criada, mas erro ao gerar PDF.')
      }

      router.refresh()
    }
    setLoading(false)
  }

  async function handleDownloadPdf() {
    if (!pdfPath) return
    const supabase = createClient()
    const { data } = await supabase.storage.from('propostas').createSignedUrl(pdfPath, 3600)
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  async function handleEnviarEmail() {
    if (!propostaId || !clienteEmail) return
    setSendingEmail(true)

    const propostaUrl = `${window.location.origin}/propostas/${propostaId}/imprimir`

    const res = await fetch('/api/propostas/enviar-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propostaId,
        clienteEmail,
        clienteNome: clienteNome ?? '',
        propostaUrl,
      }),
    })

    const data = await res.json()
    setSendingEmail(false)

    if (data.sent) {
      showToast('success', `Email enviado para ${clienteEmail}`)
    } else if (data.mailto) {
      window.open(data.mailto, '_blank')
      showToast('warning', 'Abrindo cliente de email (Resend não configurado)')
    } else {
      showToast('error', data.error || 'Erro ao enviar email')
    }
  }

  if (propostaId) {
    return (
      <div className="flex flex-wrap gap-2">
        <a
          href={`/propostas/${propostaId}/imprimir`}
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <FileText size={15} /> Ver Proposta
        </a>
        {pdfPath && (
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--gray-200)] rounded-lg text-sm hover:bg-[var(--gray-50)] transition-colors"
          >
            <Download size={15} /> Download PDF
          </button>
        )}
        {clienteEmail && (
          <button
            onClick={handleEnviarEmail}
            disabled={sendingEmail}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--gray-200)] rounded-lg text-sm hover:bg-[var(--gray-50)] transition-colors disabled:opacity-50"
          >
            {sendingEmail ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {sendingEmail ? 'Enviando...' : 'Enviar Email'}
          </button>
        )}
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <FileText size={15} /> Gerar Proposta
      </button>
    )
  }

  return (
    <div className="bg-white border border-[var(--gray-200)] rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-[var(--gray-900)]">Gerar Proposta PDF</p>
      <p className="text-xs text-[var(--gray-400)]">Descreva o que está incluso no evento. Cada linha vira um bullet na proposta. Os valores e regras comerciais são adicionados automaticamente.</p>
      <textarea
        value={descritivo}
        onChange={e => setDescritivo(e.target.value)}
        rows={4}
        placeholder="• Locação do espaço principal&#10;• Infraestrutura básica inclusa&#10;• Estacionamento para 30 veículos&#10;• Coffee break para 50 pessoas"
        className="w-full border border-[var(--gray-200)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none font-mono"
      />
      {error && (
        <p className="text-sm text-[#922b21] bg-[var(--danger-light)] border border-[var(--danger)] rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleGerar}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
          {loading ? 'Gerando...' : 'Gerar PDF'}
        </button>
        <button
          onClick={() => { setOpen(false); setError('') }}
          className="px-4 py-2 border border-[var(--gray-200)] rounded-lg text-sm hover:bg-[var(--gray-50)]"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FileText, Send } from 'lucide-react'

export default function GerarProposta({
  reservaId,
  clienteId,
  valorTotal,
  clienteEmail,
}: {
  reservaId: string
  clienteId: string
  valorTotal?: number | null
  clienteEmail?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [descritivo, setDescritivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [propostaId, setPropostaId] = useState<string | null>(null)
  const router = useRouter()

  async function handleGerar() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Não autenticado'); setLoading(false); return }

    const { data, error: err } = await supabase.from('propostas').insert({
      reserva_id: reservaId,
      cliente_id: clienteId,
      valor_total: valorTotal ?? 0,
      descritivo: descritivo.trim(),
      criado_por: user.id,
    }).select().single()

    setLoading(false)
    if (err) {
      setError('Erro ao gerar proposta. Tente novamente.')
      return
    }
    if (data) {
      setPropostaId(data.id)
      router.refresh()
    }
  }

  if (propostaId) {
    return (
      <div className="flex gap-2">
        <a
          href={`/propostas/${propostaId}/imprimir`}
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <FileText size={15} /> Abrir Proposta PDF
        </a>
        {clienteEmail && (
          <a
            href={`mailto:${clienteEmail}?subject=Proposta - Full Sales&body=Segue em anexo a proposta de locação do espaço.`}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--gray-200)] rounded-lg text-sm hover:bg-[var(--gray-50)] transition-colors"
          >
            <Send size={15} /> Enviar E-mail
          </a>
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
      <textarea
        value={descritivo}
        onChange={e => setDescritivo(e.target.value)}
        rows={4}
        placeholder="• Locação do espaço principal&#10;• Infraestrutura básica&#10;• Estacionamento..."
        className="w-full border border-[var(--gray-200)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none font-mono"
      />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleGerar}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <FileText size={15} /> {loading ? 'Gerando...' : 'Gerar PDF'}
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

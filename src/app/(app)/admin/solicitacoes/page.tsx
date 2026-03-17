'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, X, Eye, Download, FileText, Film, ImageIcon, Undo2 } from 'lucide-react'
import type { Solicitacao, EventStatus, Anexo } from '@/lib/types'

export default function AdminSolicitacoesPage() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [loading, setLoading] = useState(true)
  const [selectedSol, setSelectedSol] = useState<Solicitacao | null>(null)
  const [anexos, setAnexos] = useState<(Anexo & { url?: string })[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showRecusaModal, setShowRecusaModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [motivoRecusa, setMotivoRecusa] = useState('')
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadSolicitacoes()
    // Ler filtro da URL se existir
    const params = new URLSearchParams(window.location.search)
    const status = params.get('status')
    if (status) setFiltroStatus(status)
  }, [])

  async function loadSolicitacoes() {
    const supabase = createClient()
    const { data } = await supabase
      .from('solicitacoes')
      .select('*, espaco:espacos(*), solicitante:profiles(*)')
      .order('created_at', { ascending: false })

    setSolicitacoes(data || [])
    setLoading(false)
  }

  async function openDetail(sol: Solicitacao) {
    setSelectedSol(sol)
    setShowModal(true)
    const supabase = createClient()
    const { data: anx } = await supabase
      .from('anexos')
      .select('*')
      .eq('solicitacao_id', sol.id)

    const withUrls = await Promise.all(
      (anx || []).map(async (a) => {
        const { data } = await supabase.storage.from('anexos').createSignedUrl(a.storage_path, 3600)
        return { ...a, url: data?.signedUrl }
      })
    )
    setAnexos(withUrls)
  }

  async function handleAprovar(sol: Solicitacao) {
    setActionLoading(true)
    const supabase = createClient()
    await supabase
      .from('solicitacoes')
      .update({ status: 'aprovado' })
      .eq('id', sol.id)

    setShowModal(false)
    await loadSolicitacoes()
    setActionLoading(false)
  }

  async function handleRecusar() {
    if (!selectedSol) return
    setActionLoading(true)
    const supabase = createClient()
    await supabase
      .from('solicitacoes')
      .update({ status: 'recusado', motivo_recusa: motivoRecusa || null })
      .eq('id', selectedSol.id)

    setShowRecusaModal(false)
    setShowModal(false)
    setMotivoRecusa('')
    await loadSolicitacoes()
    setActionLoading(false)
  }

  async function handleCancelar() {
    if (!selectedSol) return
    setActionLoading(true)
    const supabase = createClient()
    await supabase
      .from('solicitacoes')
      .update({ status: 'cancelado', motivo_recusa: motivoCancelamento ? `Cancelado: ${motivoCancelamento}` : 'Cancelado pelo administrador' })
      .eq('id', selectedSol.id)

    setShowCancelModal(false)
    setShowModal(false)
    setMotivoCancelamento('')
    await loadSolicitacoes()
    setActionLoading(false)
  }

  async function handleVoltarPendente(sol: Solicitacao) {
    setActionLoading(true)
    const supabase = createClient()
    await supabase
      .from('solicitacoes')
      .update({ status: 'pendente', motivo_recusa: null })
      .eq('id', sol.id)

    setShowModal(false)
    await loadSolicitacoes()
    setActionLoading(false)
  }

  const filtered = filtroStatus === 'todos'
    ? solicitacoes
    : solicitacoes.filter(s => s.status === filtroStatus)

  function getFileIcon(type: string) {
    if (type.startsWith('image/')) return ImageIcon
    if (type.startsWith('video/')) return Film
    return FileText
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)]">Solicitações</h1>
          <p className="text-[var(--gray-500)] mt-1">Gerencie os pedidos de eventos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {['todos', 'pendente', 'aprovado', 'recusado', 'cancelado'].map((status) => (
          <button
            key={status}
            onClick={() => setFiltroStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtroStatus === status
                ? 'bg-[var(--primary)] text-white'
                : 'bg-white text-[var(--gray-600)] border border-[var(--gray-300)] hover:bg-[var(--gray-50)]'
            }`}
          >
            {status === 'todos' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'todos' && (
              <span className="ml-1.5 text-xs">
                ({solicitacoes.filter(s => status === 'todos' || s.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[var(--gray-500)]">Carregando...</p>
      ) : !filtered.length ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-[var(--gray-500)]">Nenhuma solicitação encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((sol) => (
            <Card key={sol.id} className="hover:border-[var(--primary)] transition-colors">
              <CardContent className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-[var(--gray-900)] truncate">{sol.titulo}</h3>
                    <StatusBadge status={sol.status as EventStatus} />
                  </div>
                  <p className="text-xs text-[var(--gray-500)] mt-1">
                    {(sol.solicitante as any)?.nome || 'Usuário'} &middot;{' '}
                    {format(new Date(sol.data_inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    {' &middot; '}
                    {(sol.espaco as any)?.nome || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="ghost" size="sm" onClick={() => openDetail(sol)}>
                    <Eye size={16} />
                  </Button>
                  {sol.status === 'pendente' && (
                    <>
                      <Button variant="success" size="sm" onClick={() => { setSelectedSol(sol); handleAprovar(sol) }}>
                        <Check size={16} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => { setSelectedSol(sol); setShowRecusaModal(true) }}>
                        <X size={16} />
                      </Button>
                    </>
                  )}
                  {sol.status === 'aprovado' && (
                    <Button variant="danger" size="sm" onClick={() => { setSelectedSol(sol); setShowCancelModal(true) }} title="Cancelar aprovação">
                      <Undo2 size={16} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de detalhes */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Detalhes da Solicitação" maxWidth="max-w-2xl">
        {selectedSol && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{selectedSol.titulo}</h3>
              <StatusBadge status={selectedSol.status as EventStatus} />
            </div>

            {selectedSol.descricao && (
              <div>
                <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Descrição</p>
                <p className="text-sm mt-1">{selectedSol.descricao}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Solicitante</p>
                <p className="mt-1">{(selectedSol.solicitante as any)?.nome}</p>
                <p className="text-xs text-[var(--gray-400)]">{(selectedSol.solicitante as any)?.email}</p>
                {(selectedSol.solicitante as any)?.telefone && (
                  <a
                    href={`https://wa.me/55${(selectedSol.solicitante as any).telefone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:underline"
                  >
                    WhatsApp: {(selectedSol.solicitante as any).telefone}
                  </a>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Espaço</p>
                <p className="mt-1">{(selectedSol.espaco as any)?.nome || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Início</p>
                <p className="mt-1">{format(new Date(selectedSol.data_inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Término</p>
                <p className="mt-1">{format(new Date(selectedSol.data_fim), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Participantes</p>
                <p className="mt-1">{selectedSol.num_participantes}</p>
              </div>
            </div>

            {selectedSol.recursos_adicionais && (
              <div>
                <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Recursos adicionais</p>
                <p className="text-sm mt-1">{selectedSol.recursos_adicionais}</p>
              </div>
            )}

            {selectedSol.observacoes && (
              <div>
                <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Observações</p>
                <p className="text-sm mt-1">{selectedSol.observacoes}</p>
              </div>
            )}

            {/* Anexos */}
            {anexos.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--gray-500)] uppercase mb-2">Anexos</p>
                <ul className="space-y-2">
                  {anexos.map((anexo) => {
                    const Icon = getFileIcon(anexo.tipo_arquivo)
                    return (
                      <li key={anexo.id} className="flex items-center gap-3 bg-[var(--gray-50)] rounded-lg px-3 py-2">
                        <Icon size={16} className="text-[var(--gray-500)]" />
                        <span className="text-sm truncate flex-1">{anexo.nome_arquivo}</span>
                        <span className="text-xs text-[var(--gray-400)]">{formatFileSize(anexo.tamanho)}</span>
                        {anexo.url && (
                          <a href={anexo.url} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)]">
                            <Download size={16} />
                          </a>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {selectedSol.motivo_recusa && (
              <div className="bg-[var(--danger-light)] rounded-lg p-3">
                <p className="text-xs font-medium text-red-800 uppercase">Motivo da recusa</p>
                <p className="text-sm text-red-700 mt-1">{selectedSol.motivo_recusa}</p>
              </div>
            )}

            {selectedSol.status === 'pendente' && (
              <div className="flex gap-3 pt-2 border-t border-[var(--gray-200)]">
                <Button variant="success" onClick={() => handleAprovar(selectedSol)} loading={actionLoading}>
                  <Check size={16} /> Aprovar
                </Button>
                <Button variant="danger" onClick={() => setShowRecusaModal(true)} loading={actionLoading}>
                  <X size={16} /> Recusar
                </Button>
              </div>
            )}

            {selectedSol.status === 'aprovado' && (
              <div className="flex gap-3 pt-2 border-t border-[var(--gray-200)]">
                <Button variant="danger" onClick={() => setShowCancelModal(true)} loading={actionLoading}>
                  <Undo2 size={16} /> Cancelar Aprovação
                </Button>
                <Button variant="ghost" onClick={() => handleVoltarPendente(selectedSol)} loading={actionLoading}>
                  Voltar para Pendente
                </Button>
              </div>
            )}

            {(selectedSol.status === 'recusado' || selectedSol.status === 'cancelado') && (
              <div className="flex gap-3 pt-2 border-t border-[var(--gray-200)]">
                <Button variant="ghost" onClick={() => handleVoltarPendente(selectedSol)} loading={actionLoading}>
                  <Undo2 size={16} /> Reabrir como Pendente
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de recusa */}
      <Modal open={showRecusaModal} onClose={() => setShowRecusaModal(false)} title="Recusar Solicitação">
        <div className="space-y-4">
          <p className="text-sm text-[var(--gray-600)]">
            Deseja recusar a solicitação <strong>&ldquo;{selectedSol?.titulo}&rdquo;</strong>?
          </p>
          <Textarea
            label="Motivo da recusa (opcional)"
            value={motivoRecusa}
            onChange={(e) => setMotivoRecusa(e.target.value)}
            placeholder="Informe o motivo da recusa..."
          />
          <div className="flex gap-3">
            <Button variant="danger" onClick={handleRecusar} loading={actionLoading}>
              Confirmar Recusa
            </Button>
            <Button variant="secondary" onClick={() => setShowRecusaModal(false)}>
              Voltar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de cancelamento */}
      <Modal open={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancelar Solicitação Aprovada">
        <div className="space-y-4">
          <div className="bg-[var(--warning-light)] border border-amber-300 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              Você está cancelando uma solicitação que já foi <strong>aprovada</strong>. O evento será removido do calendário.
            </p>
          </div>
          <p className="text-sm text-[var(--gray-600)]">
            Solicitação: <strong>&ldquo;{selectedSol?.titulo}&rdquo;</strong>
          </p>
          <Textarea
            label="Motivo do cancelamento (opcional)"
            value={motivoCancelamento}
            onChange={(e) => setMotivoCancelamento(e.target.value)}
            placeholder="Informe o motivo do cancelamento..."
          />
          <div className="flex gap-3">
            <Button variant="danger" onClick={handleCancelar} loading={actionLoading}>
              Confirmar Cancelamento
            </Button>
            <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
              Voltar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, Film, ImageIcon, Download } from 'lucide-react'
import Link from 'next/link'
import { EventStatus } from '@/lib/types'

export default async function SolicitacaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: solicitacao } = await supabase
    .from('solicitacoes')
    .select('*, espaco:espacos(*), solicitante:profiles(*)')
    .eq('id', id)
    .single()

  if (!solicitacao) notFound()

  const { data: anexos } = await supabase
    .from('anexos')
    .select('*')
    .eq('solicitacao_id', id)
    .order('created_at')

  // Gerar URLs públicas para anexos
  const anexosComUrl = await Promise.all(
    (anexos || []).map(async (anexo) => {
      const { data } = await supabase.storage
        .from('anexos')
        .createSignedUrl(anexo.storage_path, 3600) // 1h
      return { ...anexo, url: data?.signedUrl }
    })
  )

  function getFileIcon(type: string) {
    if (type.startsWith('image/')) return 'image'
    if (type.startsWith('video/')) return 'video'
    return 'file'
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/solicitacoes" className="text-[var(--gray-500)] hover:text-[var(--gray-700)] text-sm">
          &larr; Voltar
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--gray-900)]">{solicitacao.titulo}</h1>
          <StatusBadge status={solicitacao.status as EventStatus} />
        </CardHeader>
        <CardContent className="space-y-4">
          {solicitacao.descricao && (
            <div>
              <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Descrição</p>
              <p className="text-sm text-[var(--gray-700)] mt-1">{solicitacao.descricao}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Início</p>
              <p className="text-sm text-[var(--gray-700)] mt-1">
                {format(new Date(solicitacao.data_inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Término</p>
              <p className="text-sm text-[var(--gray-700)] mt-1">
                {format(new Date(solicitacao.data_fim), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Espaço</p>
              <p className="text-sm text-[var(--gray-700)] mt-1">{solicitacao.espaco?.nome || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Participantes</p>
              <p className="text-sm text-[var(--gray-700)] mt-1">{solicitacao.num_participantes}</p>
            </div>
          </div>

          {solicitacao.recursos_adicionais && (
            <div>
              <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Recursos adicionais</p>
              <p className="text-sm text-[var(--gray-700)] mt-1">{solicitacao.recursos_adicionais}</p>
            </div>
          )}

          {solicitacao.observacoes && (
            <div>
              <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Observações</p>
              <p className="text-sm text-[var(--gray-700)] mt-1">{solicitacao.observacoes}</p>
            </div>
          )}

          {solicitacao.motivo_recusa && (
            <div className="bg-[var(--danger-light)] rounded-lg p-3">
              <p className="text-xs font-medium text-red-800 uppercase">Motivo da recusa</p>
              <p className="text-sm text-red-700 mt-1">{solicitacao.motivo_recusa}</p>
            </div>
          )}

          {/* Anexos */}
          {anexosComUrl.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--gray-500)] uppercase mb-2">Anexos</p>
              <ul className="space-y-2">
                {anexosComUrl.map((anexo) => (
                  <li key={anexo.id} className="flex items-center gap-3 bg-[var(--gray-50)] rounded-lg px-3 py-2">
                    {getFileIcon(anexo.tipo_arquivo) === 'image' && <ImageIcon size={16} className="text-[var(--gray-500)]" />}
                    {getFileIcon(anexo.tipo_arquivo) === 'video' && <Film size={16} className="text-[var(--gray-500)]" />}
                    {getFileIcon(anexo.tipo_arquivo) === 'file' && <FileText size={16} className="text-[var(--gray-500)]" />}
                    <span className="text-sm text-[var(--gray-700)] truncate flex-1">{anexo.nome_arquivo}</span>
                    <span className="text-xs text-[var(--gray-400)]">{formatFileSize(anexo.tamanho)}</span>
                    {anexo.url && (
                      <a href={anexo.url} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:text-[var(--primary-hover)]">
                        <Download size={16} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2 text-xs text-[var(--gray-400)]">
            Criado em {format(new Date(solicitacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

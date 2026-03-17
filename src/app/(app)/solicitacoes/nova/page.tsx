'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Upload, X, FileText, Film, ImageIcon } from 'lucide-react'
import type { Espaco } from '@/lib/types'

export default function NovaSolicitacaoPage() {
  const [espacos, setEspacos] = useState<Espaco[]>([])
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [espacoId, setEspacoId] = useState('')
  const [numParticipantes, setNumParticipantes] = useState('')
  const [recursosAdicionais, setRecursosAdicionais] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [arquivos, setArquivos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadEspacos() {
      const supabase = createClient()
      const { data } = await supabase.from('espacos').select('*').order('nome')
      if (data) {
        setEspacos(data)
        if (data.length === 1) setEspacoId(data[0].id)
      }
    }
    loadEspacos()
  }, [])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setArquivos(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  function removeFile(index: number) {
    setArquivos(prev => prev.filter((_, i) => i !== index))
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sessão expirada.'); setLoading(false); return }

    // Criar solicitação
    const { data: solicitacao, error: solError } = await supabase
      .from('solicitacoes')
      .insert({
        titulo,
        descricao,
        data_inicio: new Date(dataInicio).toISOString(),
        data_fim: new Date(dataFim).toISOString(),
        espaco_id: espacoId || null,
        solicitante_id: user.id,
        num_participantes: parseInt(numParticipantes) || 1,
        recursos_adicionais: recursosAdicionais || null,
        observacoes: observacoes || null,
      })
      .select()
      .single()

    if (solError) {
      setError('Erro ao criar solicitação: ' + solError.message)
      setLoading(false)
      return
    }

    // Upload de arquivos
    for (const arquivo of arquivos) {
      const filePath = `${solicitacao.id}/${Date.now()}-${arquivo.name}`
      const { error: uploadError } = await supabase.storage
        .from('anexos')
        .upload(filePath, arquivo)

      if (!uploadError) {
        await supabase.from('anexos').insert({
          solicitacao_id: solicitacao.id,
          nome_arquivo: arquivo.name,
          tipo_arquivo: arquivo.type,
          tamanho: arquivo.size,
          storage_path: filePath,
        })
      }
    }

    router.push('/solicitacoes')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Nova Solicitação</h1>
        <p className="text-[var(--gray-500)] mt-1">Preencha os dados do evento desejado</p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            <Input
              label="Título do evento *"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Reunião de planejamento"
              required
            />

            <Textarea
              label="Descrição"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o evento..."
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Início *"
                type="datetime-local"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
              />
              <Input
                label="Término *"
                type="datetime-local"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">Espaço *</label>
                <select
                  value={espacoId}
                  onChange={(e) => setEspacoId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-[var(--primary)]"
                  required
                >
                  <option value="">Selecione...</option>
                  {espacos.map((esp) => (
                    <option key={esp.id} value={esp.id}>
                      {esp.nome} (cap. {esp.capacidade})
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Nº de participantes *"
                type="number"
                min="1"
                value={numParticipantes}
                onChange={(e) => setNumParticipantes(e.target.value)}
                placeholder="Ex: 50"
                required
              />
            </div>

            <Textarea
              label="Recursos adicionais"
              value={recursosAdicionais}
              onChange={(e) => setRecursosAdicionais(e.target.value)}
              placeholder="Ex: Projetor, microfone, sistema de som..."
              rows={2}
            />

            <Textarea
              label="Observações"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais..."
              rows={2}
            />

            {/* Upload de arquivos */}
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                Anexos (imagens, PDFs, vídeos)
              </label>
              <div
                className="border-2 border-dashed border-[var(--gray-300)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--primary)] transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto mb-2 text-[var(--gray-400)]" size={24} />
                <p className="text-sm text-[var(--gray-500)]">Clique para selecionar arquivos</p>
                <p className="text-xs text-[var(--gray-400)] mt-1">Imagens, PDFs e vídeos</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {arquivos.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {arquivos.map((arq, i) => {
                    const Icon = getFileIcon(arq.type)
                    return (
                      <li key={i} className="flex items-center gap-3 bg-[var(--gray-50)] rounded-lg px-3 py-2">
                        <Icon size={16} className="text-[var(--gray-500)] shrink-0" />
                        <span className="text-sm text-[var(--gray-700)] truncate flex-1">{arq.name}</span>
                        <span className="text-xs text-[var(--gray-400)]">{formatFileSize(arq.size)}</span>
                        <button type="button" onClick={() => removeFile(i)} className="text-[var(--gray-400)] hover:text-[var(--danger)]">
                          <X size={16} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {error && (
              <p className="text-sm text-[var(--danger)] bg-[var(--danger-light)] rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading}>
                Enviar Solicitação
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

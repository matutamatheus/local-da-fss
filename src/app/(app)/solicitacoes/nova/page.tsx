'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Upload, X, FileText, Film, ImageIcon, AlertTriangle, Calendar } from 'lucide-react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Espaco } from '@/lib/types'

interface EventoAprovado {
  id: string
  titulo: string
  data_inicio: string
  data_fim: string
  espaco_id: string
  espaco?: { nome: string }
}

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
  const [eventosAprovados, setEventosAprovados] = useState<EventoAprovado[]>([])
  const [conflito, setConflito] = useState<EventoAprovado | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const [espacosRes, eventosRes] = await Promise.all([
        supabase.from('espacos').select('*').order('nome'),
        supabase.from('solicitacoes').select('*, espaco:espacos(nome)').in('status', ['aprovado', 'pendente']),
      ])
      if (espacosRes.data) {
        setEspacos(espacosRes.data)
        if (espacosRes.data.length === 1) setEspacoId(espacosRes.data[0].id)
      }
      if (eventosRes.data) setEventosAprovados(eventosRes.data)
    }
    loadData()
  }, [])

  // Verificar conflito quando datas ou espaço mudam
  const verificarConflito = useCallback(() => {
    if (!dataInicio || !dataFim || !espacoId) {
      setConflito(null)
      return
    }
    const inicio = new Date(dataInicio)
    const fim = new Date(dataFim)

    const eventoConflitante = eventosAprovados.find((ev) => {
      if (ev.espaco_id !== espacoId) return false
      const evInicio = new Date(ev.data_inicio)
      const evFim = new Date(ev.data_fim)
      // Sobreposição: inicio < evFim && fim > evInicio
      return inicio < evFim && fim > evInicio
    })

    setConflito(eventoConflitante || null)
  }, [dataInicio, dataFim, espacoId, eventosAprovados])

  useEffect(() => {
    verificarConflito()
  }, [verificarConflito])

  // Eventos para o calendário
  const calendarEvents = eventosAprovados.map((ev) => ({
    id: ev.id,
    title: ev.titulo,
    start: ev.data_inicio,
    end: ev.data_fim,
    backgroundColor: ev.espaco_id === espacoId ? 'var(--primary)' : 'var(--gray-400)',
    borderColor: ev.espaco_id === espacoId ? 'var(--primary)' : 'var(--gray-400)',
  }))

  function handleDateSelect(info: any) {
    const start = info.start as Date
    const end = info.end as Date

    // Formatar para datetime-local input
    const pad = (n: number) => String(n).padStart(2, '0')
    const formatLocal = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

    setDataInicio(formatLocal(start))
    // Se veio do dayGrid (dia inteiro), colocar horário padrão
    if (start.getHours() === 0 && end.getHours() === 0) {
      const defaultStart = new Date(start)
      defaultStart.setHours(8, 0)
      const defaultEnd = new Date(start)
      defaultEnd.setHours(17, 0)
      setDataInicio(formatLocal(defaultStart))
      setDataFim(formatLocal(defaultEnd))
    } else {
      setDataFim(formatLocal(end))
    }
  }

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
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Nova Solicitação</h1>
        <p className="text-[var(--gray-500)] mt-1">Preencha os dados do evento desejado</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendário de disponibilidade */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-[var(--gray-900)] flex items-center gap-2">
                <Calendar size={16} className="text-[var(--primary)]" />
                Disponibilidade — clique ou arraste para selecionar
              </h2>
            </CardHeader>
            <CardContent>
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek',
                }}
                locale="pt-br"
                buttonText={{
                  today: 'Hoje',
                  month: 'Mês',
                  week: 'Semana',
                }}
                events={calendarEvents}
                selectable={true}
                select={handleDateSelect}
                height="auto"
                editable={false}
              />
              <div className="flex items-center gap-4 mt-3 text-xs text-[var(--gray-500)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[var(--primary)]" /> Ocupado (espaço selecionado)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[var(--gray-400)]" /> Ocupado (outro espaço)
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulário */}
        <div className="lg:col-span-2">
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

                <div className="grid grid-cols-2 gap-3">
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

                {/* Aviso de conflito */}
                {conflito && (
                  <div className="flex items-start gap-3 bg-[var(--warning-light)] border border-amber-300 rounded-lg p-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Horário indisponível
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        O espaço já está reservado para <strong>&ldquo;{conflito.titulo}&rdquo;</strong> de{' '}
                        {format(new Date(conflito.data_inicio), "dd/MM 'às' HH:mm", { locale: ptBR })} até{' '}
                        {format(new Date(conflito.data_fim), "dd/MM 'às' HH:mm", { locale: ptBR })}.
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        Escolha outro horário ou data.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
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
                    label="Participantes *"
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
                    className="border-2 border-dashed border-[var(--gray-300)] rounded-lg p-4 text-center cursor-pointer hover:border-[var(--primary)] transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mx-auto mb-1 text-[var(--gray-400)]" size={20} />
                    <p className="text-xs text-[var(--gray-500)]">Clique para selecionar</p>
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
                    <ul className="mt-2 space-y-1.5">
                      {arquivos.map((arq, i) => {
                        const Icon = getFileIcon(arq.type)
                        return (
                          <li key={i} className="flex items-center gap-2 bg-[var(--gray-50)] rounded-lg px-3 py-1.5">
                            <Icon size={14} className="text-[var(--gray-500)] shrink-0" />
                            <span className="text-xs text-[var(--gray-700)] truncate flex-1">{arq.name}</span>
                            <span className="text-xs text-[var(--gray-400)]">{formatFileSize(arq.size)}</span>
                            <button type="button" onClick={() => removeFile(i)} className="text-[var(--gray-400)] hover:text-[var(--danger)]">
                              <X size={14} />
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
                  <Button type="submit" loading={loading} disabled={!!conflito}>
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
      </div>
    </div>
  )
}

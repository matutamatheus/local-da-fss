'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, CheckCircle, XCircle, RefreshCw, Unlink, ExternalLink } from 'lucide-react'

function ConfiguracoesContent() {
  const [isConnected, setIsConnected] = useState(false)
  const [syncEnabled, setSyncEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const searchParams = useSearchParams()

  const success = searchParams.get('success')
  const error = searchParams.get('error')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setIsAdmin(profile?.role === 'admin')

      const { data: token } = await supabase
        .from('google_tokens')
        .select('sync_enabled')
        .eq('user_id', user.id)
        .single()

      setIsConnected(!!token)
      setSyncEnabled(token?.sync_enabled || false)
      setLoading(false)
    }
    load()
  }, [])

  async function handleConnect() {
    window.location.href = '/api/google/connect'
  }

  async function handleDisconnect() {
    if (!confirm('Deseja desconectar o Google Calendar?')) return
    const res = await fetch('/api/google/disconnect', { method: 'POST' })
    if (res.ok) {
      setIsConnected(false)
      setSyncEnabled(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/google/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSyncResult(`${data.synced} evento(s) sincronizado(s) com sucesso!${data.errors ? ` (${data.errors} erro(s))` : ''}`)
      } else {
        setSyncResult(`Erro: ${data.error}`)
      }
    } catch {
      setSyncResult('Erro ao sincronizar.')
    }
    setSyncing(false)
  }

  async function handleToggleSync() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newValue = !syncEnabled
    await supabase
      .from('google_tokens')
      .update({ sync_enabled: newValue })
      .eq('user_id', user.id)

    setSyncEnabled(newValue)
  }

  if (loading) {
    return <p className="text-[var(--gray-500)]">Carregando...</p>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--gray-900)]">Configurações</h1>
        <p className="text-[var(--gray-500)] mt-1 text-sm">Gerencie suas integrações e preferências</p>
      </div>

      {/* Mensagens de retorno do OAuth */}
      {success === 'connected' && (
        <div className="bg-[var(--success-light)] border border-green-300 rounded-lg p-3 mb-6 flex items-center gap-2">
          <CheckCircle size={18} className="text-green-600" />
          <p className="text-sm text-green-800">Google Calendar conectado com sucesso!</p>
        </div>
      )}
      {error && (
        <div className="bg-[var(--danger-light)] border border-red-300 rounded-lg p-3 mb-6 flex items-center gap-2">
          <XCircle size={18} className="text-red-600" />
          <p className="text-sm text-red-800">
            Erro ao conectar: {error === 'missing_params' ? 'parâmetros ausentes' : error === 'no_tokens' ? 'não foi possível obter tokens' : 'falha na autenticação'}. Tente novamente.
          </p>
        </div>
      )}

      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[var(--gray-900)] flex items-center gap-2">
            <Calendar size={20} className="text-[var(--primary)]" />
            Google Calendar
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--gray-600)]">
            {isAdmin
              ? 'Conecte sua conta Google para sincronizar todos os eventos aprovados diretamente no seu Google Calendar.'
              : 'Conecte sua conta Google para sincronizar seus eventos aprovados diretamente no seu Google Calendar.'
            }
          </p>

          {!isConnected ? (
            <div className="bg-[var(--gray-50)] rounded-lg p-4 text-center">
              <Calendar size={32} className="mx-auto mb-2 text-[var(--gray-400)]" />
              <p className="text-sm text-[var(--gray-500)] mb-3">Google Calendar não conectado</p>
              <Button onClick={handleConnect}>
                <ExternalLink size={16} /> Conectar Google Calendar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[var(--success-light)] rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-600" />
                  <span className="text-sm font-medium text-green-800">Google Calendar conectado</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-red-600">
                  <Unlink size={16} /> Desconectar
                </Button>
              </div>

              {/* Toggle de sincronização */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--gray-700)]">Sincronização automática</p>
                  <p className="text-xs text-[var(--gray-500)]">
                    {isAdmin ? 'Sincronizar todos os eventos aprovados' : 'Sincronizar seus eventos aprovados'}
                  </p>
                </div>
                <button
                  onClick={handleToggleSync}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${syncEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--gray-300)]'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${syncEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              {/* Botão de sincronizar agora */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleSync} loading={syncing} disabled={!syncEnabled}>
                  <RefreshCw size={16} /> Sincronizar Agora
                </Button>
              </div>

              {syncResult && (
                <p className={`text-sm rounded-lg px-3 py-2 ${syncResult.startsWith('Erro') ? 'bg-[var(--danger-light)] text-red-800' : 'bg-[var(--success-light)] text-green-800'}`}>
                  {syncResult}
                </p>
              )}

              <div className="border-t border-[var(--gray-200)] pt-3">
                <p className="text-xs text-[var(--gray-400)]">
                  {isAdmin
                    ? 'Como administrador, a sincronização inclui todos os eventos aprovados do sistema.'
                    : 'Apenas seus eventos aprovados serão sincronizados.'
                  }
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ConfiguracoesPage() {
  return (
    <Suspense fallback={<p className="text-[var(--gray-500)]">Carregando...</p>}>
      <ConfiguracoesContent />
    </Suspense>
  )
}

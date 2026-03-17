'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Copy, Check, Link2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Convite {
  id: string
  token: string
  email?: string
  usado: boolean
  created_at: string
  expires_at: string
}

export default function ConvitesPage() {
  const [convites, setConvites] = useState<Convite[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    loadConvites()
  }, [])

  async function loadConvites() {
    const supabase = createClient()
    const { data } = await supabase
      .from('convites')
      .select('*')
      .order('created_at', { ascending: false })
    setConvites(data || [])
  }

  async function criarConvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('convites').insert({
      email: email || null,
      criado_por: user.id,
    })

    setEmail('')
    await loadConvites()
    setLoading(false)
  }

  async function deletarConvite(id: string) {
    const supabase = createClient()
    await supabase.from('convites').delete().eq('id', id)
    await loadConvites()
  }

  function getLink(token: string) {
    return `${window.location.origin}/registro?token=${token}`
  }

  function copiarLink(convite: Convite) {
    navigator.clipboard.writeText(getLink(convite.token))
    setCopiedId(convite.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function compartilharWhatsApp(convite: Convite) {
    const msg = encodeURIComponent(
      `Olá! Você foi convidado para o Local da FSS.\n\nCrie sua conta pelo link:\n${getLink(convite.token)}`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Convites</h1>
        <p className="text-[var(--gray-500)] mt-1">Gere links de convite para novos usuários</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-sm font-semibold text-[var(--gray-900)]">Novo Convite</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={criarConvite} className="flex gap-3">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail (opcional)"
              type="email"
            />
            <Button type="submit" loading={loading} className="shrink-0">
              <Link2 size={16} /> Gerar
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {convites.map((convite) => {
          const expirado = new Date(convite.expires_at) < new Date()
          return (
            <Card key={convite.id} className={expirado || convite.usado ? 'opacity-60' : ''}>
              <CardContent className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--gray-900)]">
                    {convite.email || 'Sem e-mail específico'}
                  </p>
                  <p className="text-xs text-[var(--gray-500)] mt-0.5">
                    {convite.usado ? 'Usado' : expirado ? 'Expirado' : `Expira em ${format(new Date(convite.expires_at), "dd/MM/yyyy", { locale: ptBR })}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {!convite.usado && !expirado && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => copiarLink(convite)} title="Copiar link">
                        {copiedId === convite.id ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => compartilharWhatsApp(convite)}
                        title="Enviar via WhatsApp"
                        className="text-green-600"
                      >
                        WhatsApp
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => deletarConvite(convite.id)}>
                    <Trash2 size={16} className="text-[var(--danger)]" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {convites.length === 0 && (
          <p className="text-sm text-[var(--gray-500)] text-center py-8">Nenhum convite gerado ainda.</p>
        )}
      </div>
    </div>
  )
}

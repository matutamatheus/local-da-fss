'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { UserProfile } from '@/lib/types'

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      setUsuarios(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Usuários</h1>
        <p className="text-[var(--gray-500)] mt-1">Lista de usuários cadastrados no sistema</p>
      </div>

      {loading ? (
        <p className="text-[var(--gray-500)]">Carregando...</p>
      ) : (
        <div className="space-y-3">
          {usuarios.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--gray-900)]">{user.nome}</p>
                  <p className="text-xs text-[var(--gray-500)]">{user.email}</p>
                  {user.telefone && (
                    <a
                      href={`https://wa.me/55${user.telefone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:underline"
                    >
                      {user.telefone}
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : user.role === 'comercial'
                      ? 'bg-blue-100 text-blue-800'
                      : user.role === 'parceiro'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-[var(--primary-light)] text-[var(--primary)]'
                  }`}>
                    {{ admin: 'Admin', comercial: 'Comercial', parceiro: 'Parceiro', solicitante: 'Solicitante' }[user.role] ?? user.role}
                  </span>
                  <p className="text-xs text-[var(--gray-400)] mt-1">
                    {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

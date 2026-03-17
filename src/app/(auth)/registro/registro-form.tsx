'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export default function RegistroForm() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tokenValido, setTokenValido] = useState<boolean | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setTokenValido(false)
      return
    }
    async function verificarToken() {
      const supabase = createClient()
      const { data } = await supabase
        .from('convites')
        .select('*')
        .eq('token', token)
        .eq('usado', false)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (data) {
        setTokenValido(true)
        if (data.email) setEmail(data.email)
      } else {
        setTokenValido(false)
      }
    }
    verificarToken()
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem.')
      return
    }
    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome,
          role: 'solicitante',
          telefone,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Marcar convite como usado
    if (token) {
      await supabase
        .from('convites')
        .update({ usado: true })
        .eq('token', token)
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (tokenValido === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--gray-50)]">
        <p className="text-[var(--gray-500)]">Verificando convite...</p>
      </div>
    )
  }

  if (tokenValido === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--gray-50)] px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-[var(--primary)] mb-4">Local da FSS</h1>
          <div className="bg-white rounded-xl border border-[var(--gray-200)] shadow-sm p-6">
            <h2 className="text-xl font-semibold text-[var(--gray-900)] mb-2">Convite inválido</h2>
            <p className="text-[var(--gray-500)] mb-4">
              O link de convite é inválido ou expirou. Solicite um novo convite ao administrador.
            </p>
            <Link href="/login">
              <Button variant="secondary">Voltar ao login</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gray-50)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--primary)]">Local da FSS</h1>
          <p className="text-[var(--gray-500)] mt-2">Criar sua conta</p>
        </div>

        <div className="bg-white rounded-xl border border-[var(--gray-200)] shadow-sm p-6">
          <h2 className="text-xl font-semibold text-[var(--gray-900)] mb-6">Registro</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              required
            />
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
            <Input
              label="Telefone (WhatsApp)"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
            <Input
              label="Senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
            <Input
              label="Confirmar senha"
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Repita a senha"
              required
            />

            {error && (
              <p className="text-sm text-[var(--danger)] bg-[var(--danger-light)] rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Criar conta
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--gray-500)] mt-4">
          Já tem conta?{' '}
          <Link href="/login" className="text-[var(--primary)] hover:underline font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

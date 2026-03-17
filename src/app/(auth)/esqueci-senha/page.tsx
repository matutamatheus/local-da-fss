'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, MessageCircle } from 'lucide-react'

type Step = 'email' | 'code' | 'password' | 'done'

export default function EsqueciSenhaPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [maskedPhone, setMaskedPhone] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/reset-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Erro ao processar solicitação')
      return
    }

    setMaskedPhone(data.masked)
    if (data.devCode) setDevCode(data.devCode)
    setStep('code')
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/reset-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Código inválido')
      return
    }

    setStep('password')
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Erro ao redefinir senha')
      return
    }

    setStep('done')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gray-50)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--primary)]">Local da FSS</h1>
          <p className="text-[var(--gray-500)] mt-2">Redefinição de senha</p>
        </div>

        <div className="bg-white rounded-xl border border-[var(--gray-200)] shadow-sm p-6">

          {/* Step 1: Email */}
          {step === 'email' && (
            <>
              <h2 className="text-xl font-semibold text-[var(--gray-900)] mb-2">Esqueci minha senha</h2>
              <p className="text-sm text-[var(--gray-500)] mb-6">
                Informe seu e-mail cadastrado. Enviaremos um código de verificação para o WhatsApp vinculado à sua conta.
              </p>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <Input
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />

                {error && (
                  <p className="text-sm text-[var(--danger)] bg-[var(--danger-light)] rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button type="submit" loading={loading} className="w-full">
                  <MessageCircle size={16} /> Enviar código por WhatsApp
                </Button>
              </form>
            </>
          )}

          {/* Step 2: Code */}
          {step === 'code' && (
            <>
              <h2 className="text-xl font-semibold text-[var(--gray-900)] mb-2">Confirmar código</h2>
              <p className="text-sm text-[var(--gray-500)] mb-6">
                Um código de 6 dígitos foi enviado para o WhatsApp com final <strong>{maskedPhone}</strong>. Insira o código abaixo.
              </p>

              {devCode && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-4">
                  <p className="text-xs text-yellow-700 font-medium">Modo desenvolvimento (sem API WhatsApp)</p>
                  <p className="text-sm text-yellow-900 font-mono mt-1">Código: <strong>{devCode}</strong></p>
                </div>
              )}

              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <Input
                  label="Código de verificação"
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                />

                {error && (
                  <p className="text-sm text-[var(--danger)] bg-[var(--danger-light)] rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button type="submit" loading={loading} className="w-full">
                  Verificar código
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); setCode('') }}
                  className="w-full text-sm text-[var(--gray-500)] hover:text-[var(--gray-700)] text-center"
                >
                  Tentar outro e-mail
                </button>
              </form>
            </>
          )}

          {/* Step 3: New password */}
          {step === 'password' && (
            <>
              <h2 className="text-xl font-semibold text-[var(--gray-900)] mb-2">Nova senha</h2>
              <p className="text-sm text-[var(--gray-500)] mb-6">
                Código confirmado! Defina sua nova senha.
              </p>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <Input
                  label="Nova senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <Input
                  label="Confirmar nova senha"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  required
                />

                {error && (
                  <p className="text-sm text-[var(--danger)] bg-[var(--danger-light)] rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button type="submit" loading={loading} className="w-full">
                  Redefinir senha
                </Button>
              </form>
            </>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="text-center py-4">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <h2 className="text-xl font-semibold text-[var(--gray-900)] mb-2">Senha redefinida!</h2>
              <p className="text-sm text-[var(--gray-500)] mb-6">
                Sua senha foi atualizada com sucesso. Faça login com a nova senha.
              </p>
              <Button onClick={() => router.push('/login')} className="w-full">
                Ir para o login
              </Button>
            </div>
          )}
        </div>

        {step !== 'done' && (
          <p className="text-center text-sm text-[var(--gray-500)] mt-4">
            Lembrou a senha?{' '}
            <Link href="/login" className="text-[var(--primary)] hover:underline font-medium">
              Voltar ao login
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

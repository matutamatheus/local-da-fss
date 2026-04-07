import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '****'
  return digits.slice(0, -4).replace(/./g, '*') + digits.slice(-4)
}

async function sendWhatsApp(phone: string, code: string): Promise<boolean> {
  const apiUrl = process.env.WHATSAPP_API_URL
  const apiKey = process.env.WHATSAPP_API_KEY

  if (!apiUrl) return false

  try {
    const digits = phone.replace(/\D/g, '')
    // Format: 55 + DDD + number (Brazil)
    const formatted = digits.startsWith('55') ? digits : `55${digits}`

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        phone: formatted,
        message: `Olá! Seu código de redefinição de senha do Local da FSS é: *${code}*\n\nEsse código expira em 15 minutos. Não compartilhe com ninguém.`,
      }),
    })

    return res.ok
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Find user and their phone via auth.users + profiles
    const { data: users } = await supabase.auth.admin.listUsers()
    const authUser = users?.users.find((u) => u.email === email)

    if (!authUser) {
      // Return success to avoid email enumeration
      return NextResponse.json({ success: true, masked: '****' })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('telefone')
      .eq('id', authUser.id)
      .single()

    if (!profile?.telefone) {
      // Same response as non-existent email to prevent enumeration
      return NextResponse.json({ success: true, masked: '****' })
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    await supabase.from('password_reset_codes').insert({
      email,
      telefone: profile.telefone,
      code,
      expires_at: expiresAt,
    })

    const sent = await sendWhatsApp(profile.telefone, code)

    return NextResponse.json({
      success: true,
      masked: maskPhone(profile.telefone),
      ...(!sent ? { devCode: code } : {}),
    })
  } catch (err) {
    console.error('reset-request error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

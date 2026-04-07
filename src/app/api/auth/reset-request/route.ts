import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Find user
    const { data: users } = await supabase.auth.admin.listUsers()
    const authUser = users?.users.find((u) => u.email === email)

    if (!authUser) {
      return NextResponse.json({ error: 'E-mail não encontrado' }, { status: 400 })
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    await supabase.from('password_reset_codes').insert({
      email,
      telefone: '',
      code,
      expires_at: expiresAt,
    })

    return NextResponse.json({
      success: true,
      devCode: code,
    })
  } catch (err) {
    console.error('reset-request error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

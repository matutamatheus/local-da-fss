import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { email, code, password } = await request.json()

    if (!email || !code || !password) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify code one more time
    const { data: resetCode } = await supabase
      .from('password_reset_codes')
      .select('id, expires_at, used')
      .eq('email', email)
      .eq('code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!resetCode || resetCode.used || new Date(resetCode.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 400 })
    }

    // Find user
    const { data: users } = await supabase.auth.admin.listUsers()
    const authUser = users?.users.find((u) => u.email === email)

    if (!authUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 400 })
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password,
    })

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao atualizar senha' }, { status: 500 })
    }

    // Mark code as used
    await supabase
      .from('password_reset_codes')
      .update({ used: true })
      .eq('id', resetCode.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('reset-password error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

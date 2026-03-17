import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data } = await supabase
      .from('password_reset_codes')
      .select('id, expires_at, used')
      .eq('email', email)
      .eq('code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!data) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    if (data.used) {
      return NextResponse.json({ error: 'Código já utilizado' }, { status: 400 })
    }

    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Código expirado. Solicite um novo.' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('reset-verify error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

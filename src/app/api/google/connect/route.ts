import { createClient } from '@/lib/supabase/server'
import { getAuthUrl } from '@/lib/google-calendar'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const authUrl = getAuthUrl(user.id)
  return NextResponse.redirect(authUrl)
}

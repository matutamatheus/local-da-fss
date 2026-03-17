import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  await supabase
    .from('google_tokens')
    .delete()
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}

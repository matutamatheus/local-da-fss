import { createClient } from '@/lib/supabase/server'
import { getOAuth2Client } from '@/lib/google-calendar'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const userId = searchParams.get('state')

  if (!code || !userId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/configuracoes?error=missing_params`)
  }

  try {
    const oauth2Client = getOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/configuracoes?error=no_tokens`)
    }

    const supabase = await createClient()

    // Upsert tokens
    const { error } = await supabase
      .from('google_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date || 0,
        sync_enabled: true,
      }, { onConflict: 'user_id' })

    if (error) {
      console.error('Erro ao salvar tokens:', error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/configuracoes?error=save_failed`)
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/configuracoes?success=connected`)
  } catch (err) {
    console.error('Erro no callback Google:', err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/configuracoes?error=auth_failed`)
  }
}

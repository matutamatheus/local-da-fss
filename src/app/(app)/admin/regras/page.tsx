import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import RegrasForm from './regras-form'

export default async function RegrasPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const [
    { data: regrasDiarias },
    { data: regrasComerciais },
    { data: multOcupacao },
    { data: multProximidade },
  ] = await Promise.all([
    supabase.from('regras_diarias').select('*').order('dia_semana'),
    supabase.from('regras_comerciais').select('*').single(),
    supabase.from('multiplicadores_ocupacao').select('*').order('ordem'),
    supabase.from('multiplicadores_proximidade').select('*').order('ordem'),
  ])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--gray-900)]">Regras de Diárias e Preços</h1>
        <p className="text-[var(--gray-500)] mt-1 text-sm">Configure valores, multiplicadores e regras comerciais</p>
      </div>

      <RegrasForm
        regrasDiarias={regrasDiarias ?? []}
        regrasComerciais={regrasComerciais}
        multOcupacao={multOcupacao ?? []}
        multProximidade={multProximidade ?? []}
      />
    </div>
  )
}

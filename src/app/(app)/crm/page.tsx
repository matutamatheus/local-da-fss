import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import KanbanBoard from './kanban-board'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'

export default async function CrmPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const [{ data: etapas }, { data: clientes }] = await Promise.all([
    supabase.from('crm_etapas').select('*').order('ordem'),
    supabase
      .from('clientes')
      .select('id, nome, empresa, email, telefone, cliente_full_sales, produto, crm_etapa_id, proximo_evento_1, proximo_evento_1_pessoas')
      .order('nome'),
  ])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-[var(--gray-900)]">CRM</h1>
          <p className="text-[var(--gray-500)] mt-1 text-sm">{clientes?.length ?? 0} cliente(s) no pipeline</p>
        </div>
        <Link
          href="/clientes/novo"
          className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <PlusCircle size={16} /> Novo Cliente
        </Link>
      </div>

      <KanbanBoard
        etapas={etapas ?? []}
        clientes={clientes ?? []}
      />
    </div>
  )
}

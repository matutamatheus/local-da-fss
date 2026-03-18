import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import KanbanBoard from './kanban-board'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; fs?: string; produto?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const [{ data: etapas }, { data: allClientes }] = await Promise.all([
    supabase.from('crm_etapas').select('*').order('ordem'),
    supabase
      .from('clientes')
      .select('id, nome, empresa, email, telefone, cliente_full_sales, produto, crm_etapa_id, proximo_evento_1, proximo_evento_1_pessoas')
      .order('nome'),
  ])

  let clientes = allClientes ?? []
  if (params.q) {
    const q = params.q.toLowerCase()
    clientes = clientes.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.telefone ?? '').toLowerCase().includes(q) ||
      (c.empresa ?? '').toLowerCase().includes(q)
    )
  }
  if (params.fs === '1') clientes = clientes.filter(c => c.cliente_full_sales)
  if (params.produto) clientes = clientes.filter(c => c.produto === params.produto)

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-[var(--gray-900)]">CRM</h1>
          <p className="text-[var(--gray-500)] mt-1 text-sm">{clientes.length} cliente(s) no pipeline</p>
        </div>
        <Link
          href="/clientes/novo"
          className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity w-fit"
        >
          <PlusCircle size={16} /> Novo Cliente
        </Link>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="Buscar por nome, e-mail, telefone..."
          className="flex-1 min-w-[200px] border border-[var(--gray-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <select name="produto" defaultValue={params.produto ?? ''}
          className="border border-[var(--gray-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
          <option value="">Todos os produtos</option>
          <option value="ia_full_sales">IA Full Sales</option>
          <option value="high_sales">High Sales</option>
          <option value="aceleracao">Aceleração</option>
          <option value="ativacao">Ativação</option>
          <option value="outro">Outro</option>
        </select>
        <label className="flex items-center gap-2 border border-[var(--gray-200)] rounded-lg px-3 py-2 text-sm cursor-pointer">
          <input type="checkbox" name="fs" value="1" defaultChecked={params.fs === '1'} className="w-4 h-4" />
          Cliente FS
        </label>
        <button type="submit" className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">
          Filtrar
        </button>
        {(params.q || params.fs || params.produto) && (
          <Link href="/crm" className="px-4 py-2 border border-[var(--gray-200)] rounded-lg text-sm hover:bg-[var(--gray-50)] text-[var(--gray-500)]">
            Limpar
          </Link>
        )}
      </form>

      <KanbanBoard etapas={etapas ?? []} clientes={clientes} />
    </div>
  )
}

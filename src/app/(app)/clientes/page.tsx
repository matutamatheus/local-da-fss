import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { PlusCircle, Search, Phone, Mail, Globe, Building, Users } from 'lucide-react'
import { Cliente } from '@/lib/types'

async function getClientes(search: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  let query = supabase
    .from('clientes')
    .select('*, crm_etapa:crm_etapas(id, nome, cor)')
    .order('nome')

  if (search) {
    query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%,telefone.ilike.%${search}%,empresa.ilike.%${search}%`)
  }

  const { data } = await query
  return (data ?? []) as Cliente[]
}

const produtoLabel: Record<string, string> = {
  ia_full_sales: 'IA Full Sales',
  high_sales: 'High Sales',
  aceleracao: 'Aceleração',
  ativacao: 'Ativação',
  outro: 'Outro',
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; fs?: string }>
}) {
  const params = await searchParams
  const search = params.q ?? ''
  const soFS = params.fs === '1'

  let clientes = await getClientes(search)
  if (soFS) clientes = clientes.filter(c => c.cliente_full_sales)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-[var(--gray-900)]">Clientes</h1>
          <p className="text-[var(--gray-500)] mt-1 text-sm">{clientes.length} cliente(s) cadastrado(s)</p>
        </div>
        <Link
          href="/clientes/novo"
          className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity w-fit"
        >
          <PlusCircle size={16} /> Novo Cliente
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)]" />
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Buscar por nome, e-mail, telefone ou empresa..."
            className="w-full pl-9 pr-4 py-2.5 border border-[var(--gray-200)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white"
          />
          {soFS && <input type="hidden" name="fs" value="1" />}
        </form>
        <div className="flex gap-2">
          <Link
            href={`/clientes${search ? `?q=${search}` : ''}${!soFS ? '?fs=1' : ''}`}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${soFS ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-white text-[var(--gray-600)] border-[var(--gray-200)] hover:bg-[var(--gray-50)]'}`}
          >
            Cliente FS
          </Link>
          {(search || soFS) && (
            <Link href="/clientes" className="px-3 py-2 rounded-lg text-sm text-[var(--gray-500)] border border-[var(--gray-200)] hover:bg-[var(--gray-50)]">
              Limpar
            </Link>
          )}
        </div>
      </div>

      {clientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--gray-100)] flex items-center justify-center mb-4">
            <Users size={28} className="text-[var(--gray-400)]" />
          </div>
          <p className="text-lg font-semibold text-[var(--gray-700)] mb-1">
            {search || soFS ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </p>
          <p className="text-sm text-[var(--gray-400)] mb-5">
            {search || soFS ? 'Tente ajustar os filtros de busca.' : 'Comece cadastrando o primeiro cliente da sua carteira.'}
          </p>
          {!search && !soFS && (
            <Link
              href="/clientes/novo"
              className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <PlusCircle size={16} /> Novo Cliente
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clientes.map((c) => (
            <Link
              key={c.id}
              href={`/clientes/${c.id}`}
              className="block bg-white border border-[var(--gray-200)] rounded-xl p-4 hover:border-[var(--primary)] hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-semibold text-[var(--gray-900)] truncate">{c.nome}</p>
                  {c.empresa && (
                    <p className="text-xs text-[var(--gray-500)] flex items-center gap-1 mt-0.5">
                      <Building size={11} /> {c.empresa}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {c.cliente_full_sales && (
                    <span className="text-xs bg-[var(--primary-light)] text-[var(--primary)] px-2 py-0.5 rounded-full font-medium">
                      Full Sales
                    </span>
                  )}
                  {c.crm_etapa && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                      style={{ backgroundColor: c.crm_etapa.cor }}
                    >
                      {c.crm_etapa.nome}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                {c.email && (
                  <p className="text-xs text-[var(--gray-500)] flex items-center gap-1.5">
                    <Mail size={12} /> {c.email}
                  </p>
                )}
                {c.telefone && (
                  <p className="text-xs text-[var(--gray-500)] flex items-center gap-1.5">
                    <Phone size={12} /> {c.telefone}
                  </p>
                )}
                {c.site && (
                  <p className="text-xs text-[var(--gray-500)] flex items-center gap-1.5">
                    <Globe size={12} /> {c.site}
                  </p>
                )}
              </div>

              {c.produto && (
                <div className="mt-3 pt-3 border-t border-[var(--gray-100)]">
                  <span className="text-xs bg-[var(--gray-100)] text-[var(--gray-600)] px-2 py-0.5 rounded">
                    {produtoLabel[c.produto] ?? c.produto}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

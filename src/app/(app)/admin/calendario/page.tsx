import { Calendario } from '@/components/calendario'

export default function AdminCalendarioPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Calendário</h1>
        <p className="text-[var(--gray-500)] mt-1">Todos os eventos e reservas do espaço</p>
      </div>
      <Calendario isAdmin />
    </div>
  )
}

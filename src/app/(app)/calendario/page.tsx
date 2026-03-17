import { Calendario } from '@/components/calendario'

export default function CalendarioPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Calendário</h1>
        <p className="text-[var(--gray-500)] mt-1">Eventos aprovados</p>
      </div>
      <Calendario />
    </div>
  )
}

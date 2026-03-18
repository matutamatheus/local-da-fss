import { Calendario } from '@/components/calendario'

export default function CalendarioPage() {
  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--gray-900)]">Calendário</h1>
        <p className="text-[var(--gray-500)] mt-1 text-sm">Visão completa de reservas e disponibilidade</p>
      </div>
      <Calendario />
    </div>
  )
}

import { EventStatus } from '@/lib/types'

const statusConfig: Record<EventStatus, { label: string; className: string }> = {
  pendente: {
    label: 'Pendente',
    className: 'bg-[var(--warning-light)] text-amber-800',
  },
  aprovado: {
    label: 'Aprovado',
    className: 'bg-[var(--success-light)] text-green-800',
  },
  recusado: {
    label: 'Recusado',
    className: 'bg-[var(--danger-light)] text-red-800',
  },
}

export function StatusBadge({ status }: { status: EventStatus }) {
  const config = statusConfig[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

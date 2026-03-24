// Cores de status padronizadas para uso em todo o sistema

export const RESERVA_STATUS_COLOR: Record<string, string> = {
  aberta: 'bg-blue-100 text-blue-700',
  pre_reservada: 'bg-yellow-100 text-yellow-700',
  agendada: 'bg-green-100 text-green-700',
  cancelada: 'bg-gray-100 text-gray-500',
}

export const RESERVA_STATUS_LABEL: Record<string, string> = {
  aberta: 'Aberta',
  pre_reservada: 'Pré-reservada',
  agendada: 'Agendada',
  cancelada: 'Cancelada',
}

// Cores hex para o FullCalendar (precisam de hex)
export const RESERVA_STATUS_HEX: Record<string, string> = {
  agendada: '#16a34a',
  pre_reservada: '#d97706',
  aberta: '#2563eb',
  cancelada: '#9ca3af',
}

export const SOLICITACAO_STATUS_COLOR: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  aprovado: 'bg-green-100 text-green-700',
  recusado: 'bg-red-100 text-red-700',
  cancelado: 'bg-gray-100 text-gray-500',
}

export const SOLICITACAO_STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  cancelado: 'Cancelado',
}

// Cores de status padronizadas — PRD palette

export const RESERVA_STATUS_COLOR: Record<string, string> = {
  aberta: 'bg-[#d4efdf] text-[#1e8449]',
  pre_reservada: 'bg-[#fdebd0] text-[#b7770a]',
  agendada: 'bg-[#f5d0cc] text-[#922b21]',
  cancelada: 'bg-[#e8eaeb] text-[#566573]',
  bloqueio: 'bg-[#e8eaeb] text-[#566573]',
}

export const RESERVA_STATUS_LABEL: Record<string, string> = {
  aberta: 'Aberta',
  pre_reservada: 'Pré-reservada',
  agendada: 'Agendada',
  cancelada: 'Cancelada',
  bloqueio: 'Bloqueio',
}

// Cores hex para o FullCalendar
export const RESERVA_STATUS_HEX: Record<string, string> = {
  agendada: '#C0392B',
  pre_reservada: '#F39C12',
  aberta: '#27AE60',
  cancelada: '#7F8C8D',
  bloqueio: '#7F8C8D',
}

export const SOLICITACAO_STATUS_COLOR: Record<string, string> = {
  pendente: 'bg-[#fdebd0] text-[#b7770a]',
  aprovado: 'bg-[#d4efdf] text-[#1e8449]',
  recusado: 'bg-[#f5d0cc] text-[#922b21]',
  cancelado: 'bg-[#e8eaeb] text-[#566573]',
}

export const SOLICITACAO_STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  cancelado: 'Cancelado',
}

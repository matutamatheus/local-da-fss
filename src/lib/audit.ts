import { SupabaseClient } from '@supabase/supabase-js'

export type AuditAcao =
  | 'criar_reserva'
  | 'editar_reserva'
  | 'cancelar_reserva'
  | 'alterar_status_reserva'
  | 'criar_cliente'
  | 'editar_cliente'
  | 'gerar_proposta'
  | 'enviar_proposta_email'
  | 'criar_bloqueio'
  | 'remover_bloqueio'
  | 'aprovar_solicitacao'
  | 'recusar_solicitacao'
  | 'criar_convite'
  | 'editar_regras'
  | 'mover_crm'

export type AuditEntidade =
  | 'reserva'
  | 'cliente'
  | 'proposta'
  | 'solicitacao'
  | 'bloqueio'
  | 'convite'
  | 'regras'
  | 'crm'

export async function logAudit(
  supabase: SupabaseClient,
  params: {
    userId: string
    userNome?: string
    acao: AuditAcao
    entidade: AuditEntidade
    entidadeId?: string
    detalhes?: Record<string, unknown>
  }
) {
  await supabase.from('audit_logs').insert({
    user_id: params.userId,
    user_nome: params.userNome ?? null,
    acao: params.acao,
    entidade: params.entidade,
    entidade_id: params.entidadeId ?? null,
    detalhes: params.detalhes ?? null,
  })
}

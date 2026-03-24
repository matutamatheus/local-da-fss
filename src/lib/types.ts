export type UserRole = 'admin' | 'solicitante' | 'comercial' | 'parceiro'

export type EventStatus = 'pendente' | 'aprovado' | 'recusado' | 'cancelado'

export type ReservaStatus = 'aberta' | 'pre_reservada' | 'agendada' | 'cancelada'

export type ProdutoTipo = 'ia_full_sales' | 'high_sales' | 'aceleracao' | 'ativacao' | 'outro'

export interface UserProfile {
  id: string
  email: string
  nome: string
  role: UserRole
  telefone?: string
  created_at: string
}

export interface Espaco {
  id: string
  nome: string
  localizacao: string
  capacidade: number
  descricao: string
  created_at: string
}

export interface Solicitacao {
  id: string
  titulo: string
  descricao: string
  data_inicio: string
  data_fim: string
  espaco_id: string
  solicitante_id: string
  num_participantes: number
  status: EventStatus
  recursos_adicionais?: string
  observacoes?: string
  motivo_recusa?: string
  created_at: string
  updated_at: string
  // Joined
  espaco?: Espaco
  solicitante?: UserProfile
  anexos?: Anexo[]
}

export interface Anexo {
  id: string
  solicitacao_id: string
  nome_arquivo: string
  tipo_arquivo: string
  tamanho: number
  storage_path: string
  url?: string
  created_at: string
}

export interface ConviteRegistro {
  id: string
  token: string
  email?: string
  role: UserRole
  usado: boolean
  criado_por: string
  created_at: string
  expires_at: string
}

// ===========================
// Módulo Comercial
// ===========================

export interface CrmEtapa {
  id: string
  nome: string
  cor: string
  ordem: number
  created_at: string
}

export interface Cliente {
  id: string
  nome: string
  email?: string
  telefone?: string
  site?: string
  empresa?: string
  cliente_full_sales: boolean
  produto?: ProdutoTipo
  proximo_evento_1?: string
  proximo_evento_1_pessoas?: number
  proximo_evento_2?: string
  proximo_evento_2_pessoas?: number
  observacoes?: string
  crm_etapa_id?: string
  criado_por?: string
  created_at: string
  updated_at: string
  // Joined
  crm_etapa?: CrmEtapa
}

export interface RegrasDiaria {
  dia_semana: number
  nome_dia: string
  valor: number
  minimo_diarias: number
}

export interface MultiplicadorOcupacao {
  id: string
  faixa_min: number
  faixa_max: number
  multiplicador: number
  ordem: number
}

export interface MultiplicadorProximidade {
  id: string
  dias_min: number
  dias_max: number | null
  multiplicador: number
  label: string
  ordem: number
}

export interface RegrasComerciais {
  id: 1
  desconto_max_gestor: number
  regras_texto: string
}

export interface Reserva {
  id: string
  cliente_id: string
  espaco_id?: string
  data_entrada: string
  data_saida: string
  num_participantes: number
  audiovisual: boolean
  observacoes?: string
  status: ReservaStatus
  valor_diaria?: number
  valor_total?: number
  desconto_aplicado: number
  criado_por?: string
  created_at: string
  updated_at: string
  // Joined
  cliente?: Cliente
  espaco?: Espaco
}

export interface Proposta {
  id: string
  reserva_id: string
  cliente_id: string
  valor_total: number
  descritivo: string
  criado_por?: string
  created_at: string
  updated_at: string
  // Joined
  reserva?: Reserva
  cliente?: Cliente
}

export type UserRole = 'admin' | 'solicitante'

export type EventStatus = 'pendente' | 'aprovado' | 'recusado'

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
  usado: boolean
  criado_por: string
  created_at: string
  expires_at: string
}

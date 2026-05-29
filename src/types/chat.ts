export type TipoCanal = 'processo' | 'setor' | 'plataforma' | 'dm'

export interface UsuarioChat {
  id: string
  nome_completo: string | null
  papel: string
  secretaria_id: string | null
}

export interface CanalChat {
  id: string
  organizacao_id: string
  tipo: TipoCanal
  referencia_id: string | null
  nome: string
  criado_em: string
}

export interface AutorMensagem {
  nome_completo: string | null
  papel: string
}

export interface MensagemChat {
  id: string
  canal_id: string
  autor_id: string
  conteudo: string
  respondendo_a: string | null
  editado_em: string | null
  criado_em: string
  autor?: AutorMensagem | null
}

export interface LeituraChat {
  usuario_id: string
  canal_id: string
  ultima_leitura: string
}

export interface MensagemAssistente {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface CanalComNaoLidos extends CanalChat {
  nao_lidos: number
}

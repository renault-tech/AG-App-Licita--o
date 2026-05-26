import { createServiceClient } from '@/lib/supabase/server'

export interface AuditoriaParams {
  organizacaoId: string
  usuarioId:     string
  nomeUsuario:   string
  papelUsuario:  string
  categoria:     'processo' | 'documento' | 'usuario' | 'organizacao'
  acao:          string
  recursoId?:    string
  recursoDesc?:  string
  detalhes?:     Record<string, unknown>
}

export async function registrarAuditoria(params: AuditoriaParams): Promise<void> {
  try {
    const supabase = await createServiceClient()
    await (supabase as any).from('audit_log').insert({
      organizacao_id: params.organizacaoId,
      usuario_id:     params.usuarioId,
      nome_usuario:   params.nomeUsuario,
      papel_usuario:  params.papelUsuario,
      categoria:      params.categoria,
      acao:           params.acao,
      recurso_id:     params.recursoId   ?? null,
      recurso_desc:   params.recursoDesc ?? null,
      detalhes:       params.detalhes    ?? null,
    })
  } catch (err) {
    console.error('[audit] falha ao registrar:', err)
  }
}

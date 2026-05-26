export const LABEL_ACAO: Record<string, string> = {
  'processo.criado':        'Processo criado',
  'processo.excluido':      'Processo excluido',
  'processo.acessado':      'Processo acessado',
  'processo.tramitado':     'Processo encaminhado',
  'dfd.editado':            'DFD editado',
  'etp.editado':            'ETP editado',
  'tr.editado':             'TR editado',
  'edital.editado':         'Edital editado',
  'parecer.editado':        'Parecer editado',
  'parecer.aprovado':       'Parecer aprovado',
  'parecer.devolvido':      'Parecer devolvido',
  'usuario.convidado':      'Usuario convidado',
  'usuario.papel_alterado': 'Papel de usuario alterado',
  'usuario.suspenso':       'Usuario suspenso',
  'usuario.ativado':        'Usuario reativado',
  'organizacao.atualizada': 'Configuracoes atualizadas',
}

export const LABEL_CATEGORIA: Record<string, string> = {
  processo:    'Processo',
  documento:   'Documento',
  usuario:     'Usuario',
  organizacao: 'Organizacao',
}

export function labelAcao(acao: string): string {
  return LABEL_ACAO[acao] ?? acao
}

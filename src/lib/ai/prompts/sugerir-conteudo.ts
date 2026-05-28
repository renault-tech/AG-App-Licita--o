// Prompt para o botao "Sugerir com IA" em campos vazios ou por solicitacao do usuario
// Gera conteudo original com base nos dados do processo — nunca inventa dados objetivos

export interface ContextoSugestao {
  nomeCampo: string
  documentoContexto: string
  artigo?: string
  dadosProcesso: {
    objeto: string
    modalidade?: string
    valorEstimado?: number
    secretaria?: string
    municipio?: string
    textoRelacionado?: string
  }
}

export function buildPromptSugerirConteudo(ctx: ContextoSugestao): string {
  const { nomeCampo, documentoContexto, artigo, dadosProcesso } = ctx
  const {
    objeto,
    modalidade,
    valorEstimado,
    secretaria,
    municipio,
    textoRelacionado,
  } = dadosProcesso

  return `<instrucoes>
Voce e um especialista em licitacoes publicas brasileiras com profundo conhecimento da Lei 14.133/21.
Sua tarefa e sugerir o conteudo de um campo especifico de um documento licitatorio, com base nas informacoes do processo.
Voce deve redigir o conteudo em linguagem institucional formal, adequado para a administracao publica brasileira.
</instrucoes>

<campo>
  <nome>${nomeCampo}</nome>
  <documento>${documentoContexto}</documento>
  ${artigo ? `<artigo_legal>${artigo}</artigo_legal>` : ''}
</campo>

<contexto_processo>
  <objeto>${objeto}</objeto>
  ${modalidade ? `<modalidade>${modalidade}</modalidade>` : ''}
  ${valorEstimado ? `<valor_estimado>R$ ${valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</valor_estimado>` : ''}
  ${secretaria ? `<secretaria_requisitante>${secretaria}</secretaria_requisitante>` : ''}
  ${municipio ? `<municipio>${municipio}</municipio>` : ''}
  ${textoRelacionado ? `<informacao_complementar>${textoRelacionado}</informacao_complementar>` : ''}
</contexto_processo>

<formato_saida>
Redija o conteudo para o campo "${nomeCampo}" com base exclusivamente nas informacoes fornecidas acima.

Regras obrigatorias:
- Use portugues institucional formal, adequado para documentos publicos
- Nao invente dados objetivos (CNPJ, valores especificos, nomes de fornecedores, datas) que nao foram fornecidos
- Nao use travessao (em dash); use virgulas, ponto e virgula ou parenteses
- Inclua referencia ao artigo da lei aplicavel quando relevante
- Mantenha o texto conciso e direto, sem enfeites desnecessarios
- Nao use palavras como "deveremos", "iremos" ou linguagem informal
- Responda APENAS com o texto do campo, sem titulos, sem explicacoes, sem aspas externas
</formato_saida>`
}

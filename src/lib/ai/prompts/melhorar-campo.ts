// Prompt para o botao "Melhorar com IA" em campos individuais do wizard
// Modelo: claude-sonnet-4-5 (rapido, campo a campo)

export interface ContextoCampo {
  nomeCampo: string
  documentoContexto: string
  artigo?: string
  textoAtual: string
  dadosProcesso?: {
    objeto?: string
    modalidade?: string
    valorEstimado?: number
    secretaria?: string
    municipio?: string
  }
}

export function buildPromptMelhorarCampo(ctx: ContextoCampo): string {
  return `<instrucoes>
Voce e um especialista em licitacoes publicas brasileiras com profundo conhecimento da Lei 14.133/21.
Sua tarefa e melhorar o texto de um campo especifico de um documento licitatorio, mantendo conformidade legal e linguagem institucional formal.
</instrucoes>

<campo>
  <nome>${ctx.nomeCampo}</nome>
  <documento>${ctx.documentoContexto}</documento>
  ${ctx.artigo ? `<artigo_legal>${ctx.artigo}</artigo_legal>` : ''}
</campo>

<contexto_processo>
  ${ctx.dadosProcesso?.objeto ? `<objeto>${ctx.dadosProcesso.objeto}</objeto>` : ''}
  ${ctx.dadosProcesso?.modalidade ? `<modalidade>${ctx.dadosProcesso.modalidade}</modalidade>` : ''}
  ${ctx.dadosProcesso?.valorEstimado ? `<valor_estimado>R$ ${ctx.dadosProcesso.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</valor_estimado>` : ''}
  ${ctx.dadosProcesso?.secretaria ? `<secretaria>${ctx.dadosProcesso.secretaria}</secretaria>` : ''}
  ${ctx.dadosProcesso?.municipio ? `<municipio>${ctx.dadosProcesso.municipio}</municipio>` : ''}
</contexto_processo>

<texto_original>
${ctx.textoAtual}
</texto_original>

<formato_saida>
Reescreva o texto original em linguagem formal e tecnica, conforme os padroes da administracao publica brasileira e da Lei 14.133/21.
- Use frases completas e objetivas
- Evite repeticao de palavras
- Mantenha todos os dados objetivos do texto original (valores, quantidades, datas, nomes proprios)
- Nao invente dados que nao estejam no texto original
- Nao use travessao (em dash), use virgulas ou ponto e virgula
- Responda APENAS com o texto melhorado, sem explicacoes, sem prefacios, sem aspas externas
</formato_saida>`
}

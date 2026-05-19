// Prompts para geracao simultanea de DFD, ETP e TR ao finalizar o wizard
// Modelo: claude-opus-4-7 (geracao completa de documentos longos)

export interface DadosWizard {
  objeto: string
  justificativaNecessidade: string
  modalidade: string
  valorEstimado?: number
  prazoExecucao?: string
  secretaria?: string
  municipio?: string
  estado?: string
  requisitosEspecificos?: string
  fonteRecurso?: string
  unidadeRequisitante?: string
  quantidadeItens?: number
  descricaoItens?: string
}

const CABECALHO_LEGAL = `
Voce e um especialista senior em licitacoes publicas brasileiras com 20 anos de experiencia.
Voce conhece profundamente a Lei 14.133/21 e sua aplicacao pratica.
Gere textos completos, detalhados, em linguagem formal e tecnica, conforme os padroes da administracao publica brasileira.
PROIBICOES ABSOLUTAS:
- Nao invente dados que nao foram fornecidos (CNPJ, nomes de fornecedores, valores nao informados, datas especificas nao mencionadas)
- Nao use travessao (em dash), use virgulas ou ponto e virgula
- Nao use placeholders como "[PREENCHER]", "[INSERIR]", "[DATA]"; se o dado nao foi fornecido, omita o trecho ou use linguagem generica adequada
`

export function buildPromptDFD(dados: DadosWizard): string {
  return `${CABECALHO_LEGAL}

<tarefa>Gere o Documento de Formalizacao da Demanda (DFD) conforme o Art. 6, X da Lei 14.133/21.</tarefa>

<dados_processo>
  <objeto>${dados.objeto}</objeto>
  <justificativa>${dados.justificativaNecessidade}</justificativa>
  <modalidade>${dados.modalidade}</modalidade>
  ${dados.valorEstimado ? `<valor_estimado>R$ ${dados.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</valor_estimado>` : ''}
  ${dados.prazoExecucao ? `<prazo>${dados.prazoExecucao}</prazo>` : ''}
  ${dados.secretaria ? `<secretaria_requisitante>${dados.secretaria}</secretaria_requisitante>` : ''}
  ${dados.municipio ? `<municipio>${dados.municipio}/${dados.estado ?? ''}</municipio>` : ''}
  ${dados.requisitosEspecificos ? `<requisitos>${dados.requisitosEspecificos}</requisitos>` : ''}
  ${dados.fonteRecurso ? `<fonte_recurso>${dados.fonteRecurso}</fonte_recurso>` : ''}
  ${dados.quantidadeItens ? `<quantidade_itens>${dados.quantidadeItens}</quantidade_itens>` : ''}
  ${dados.descricaoItens ? `<itens>${dados.descricaoItens}</itens>` : ''}
</dados_processo>

<estrutura_obrigatoria>
O DFD deve conter:
1. Identificacao: numero do documento, data, unidade requisitante
2. Objeto da contratacao: descricao completa e detalhada
3. Justificativa da necessidade: por que a contratacao e necessaria (Art. 6, X, 'a')
4. Estimativa de custo: valor estimado e base para a estimativa
5. Previsao no PCA: referencia ao Plano de Contratacoes Anual (se aplicavel)
6. Responsavel pela demanda: cargo e funcao (sem nome especifico nao informado)
7. Manifestacao da autoridade superior: espaco para assinatura
</estrutura_obrigatoria>

<formato_saida>
Gere o DFD completo em formato de documento oficial.
Use paragrafos numerados conforme a estrutura acima.
O documento deve ser pronto para revisao e assinatura, sem campos em branco visiveis.
</formato_saida>`
}

export function buildPromptETP(dados: DadosWizard): string {
  return `${CABECALHO_LEGAL}

<tarefa>Gere o Estudo Tecnico Preliminar (ETP) conforme o Art. 18 da Lei 14.133/21.</tarefa>

<dados_processo>
  <objeto>${dados.objeto}</objeto>
  <justificativa>${dados.justificativaNecessidade}</justificativa>
  <modalidade>${dados.modalidade}</modalidade>
  ${dados.valorEstimado ? `<valor_estimado>R$ ${dados.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</valor_estimado>` : ''}
  ${dados.prazoExecucao ? `<prazo>${dados.prazoExecucao}</prazo>` : ''}
  ${dados.secretaria ? `<secretaria>${dados.secretaria}</secretaria>` : ''}
  ${dados.municipio ? `<municipio>${dados.municipio}/${dados.estado ?? ''}</municipio>` : ''}
  ${dados.requisitosEspecificos ? `<requisitos>${dados.requisitosEspecificos}</requisitos>` : ''}
</dados_processo>

<estrutura_obrigatoria>
O ETP deve conter os elementos do Art. 18, par. 1:
I. Descricao da necessidade da contratacao
II. Estimativa das quantidades a serem contratadas
III. Levantamento de mercado: analise das alternativas possiveis
IV. Estimativas de precos ou custo, com base em ampla pesquisa
V. Descricao da solucao como um todo
VI. Justificativas para o parcelamento ou nao da solucao
VII. Resultados pretendidos com a contratacao
VIII. Providencias necessarias a implementacao
IX. Possibilidade de execucao por entes publicos
X. Contratacoes correlatas ou interdependentes
XI. Alinhamento com o PCA e PGC
</estrutura_obrigatoria>

<formato_saida>
Gere o ETP completo em formato de documento oficial.
Cada elemento deve ter titulo e texto substancial.
O documento deve demonstrar que a necessidade foi estudada tecnicamente antes da contratacao.
</formato_saida>`
}

export function buildPromptTR(dados: DadosWizard): string {
  return `${CABECALHO_LEGAL}

<tarefa>Gere o Termo de Referencia (TR) conforme o Art. 6, XXIII da Lei 14.133/21.</tarefa>

<dados_processo>
  <objeto>${dados.objeto}</objeto>
  <justificativa>${dados.justificativaNecessidade}</justificativa>
  <modalidade>${dados.modalidade}</modalidade>
  ${dados.valorEstimado ? `<valor_estimado>R$ ${dados.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</valor_estimado>` : ''}
  ${dados.prazoExecucao ? `<prazo>${dados.prazoExecucao}</prazo>` : ''}
  ${dados.secretaria ? `<secretaria>${dados.secretaria}</secretaria>` : ''}
  ${dados.municipio ? `<municipio>${dados.municipio}/${dados.estado ?? ''}</municipio>` : ''}
  ${dados.requisitosEspecificos ? `<requisitos_tecnicos>${dados.requisitosEspecificos}</requisitos_tecnicos>` : ''}
  ${dados.quantidadeItens ? `<quantidade_itens>${dados.quantidadeItens}</quantidade_itens>` : ''}
  ${dados.descricaoItens ? `<itens>${dados.descricaoItens}</itens>` : ''}
  ${dados.fonteRecurso ? `<fonte_recurso>${dados.fonteRecurso}</fonte_recurso>` : ''}
</dados_processo>

<estrutura_obrigatoria>
O TR deve conter os elementos do Art. 6, XXIII:
I. Descricao do objeto, incluindo a especificacao tecnica completa
II. Fundamentacao legal e motivacao
III. Requisitos da contratacao (qualificacao tecnica e economica)
IV. Modelo de execucao do objeto
V. Modelo de gestao do contrato
VI. Criterios de medicao e pagamento
VII. Forma e criterios de selecao do fornecedor
VIII. Estimativas de precos ou precos de referencia
IX. Requisitos de sustentabilidade ambiental (quando aplicavel)
X. Prazo de vigencia do contrato
XI. Garantias exigidas
XII. Obrigacoes da contratante e contratada
XIII. Sancoes aplicaveis
XIV. Gestor e fiscal do contrato
</estrutura_obrigatoria>

<formato_saida>
Gere o TR completo em formato de documento oficial, pronto para compor o processo licitatorio.
Cada seccao deve ser detalhada e especifica ao objeto descrito.
Nao deixe seccoes genericas; adapte cada uma ao objeto real informado.
</formato_saida>`
}

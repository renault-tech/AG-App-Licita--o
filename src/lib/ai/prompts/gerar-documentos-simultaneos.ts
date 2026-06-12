// Prompts para geracao simultanea de DFD, ETP e TR ao finalizar o wizard
// Os documentos sao gerados em cadeia: DFD -> ETP (recebe DFD) -> TR (recebe ETP),
// garantindo coerencia entre as etapas do processo licitatorio.

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
Voce conhece profundamente a Lei 14.133/21 e sua aplicacao pratica em municipios.
Gere textos completos, detalhados, em linguagem formal e tecnica, conforme os padroes da administracao publica brasileira.
PROIBICOES ABSOLUTAS:
- Nao invente dados que nao foram fornecidos (CNPJ, nomes de fornecedores, valores nao informados, datas especificas nao mencionadas)
- Nao use travessao (em dash), use virgulas ou ponto e virgula
- Nao use placeholders como "[PREENCHER]", "[INSERIR]", "[DATA]"; se o dado nao foi fornecido, omita o trecho ou use linguagem generica adequada
`

const DIRETRIZES_ESTILO = `
<diretrizes_estilo>
Adote o registro institucional da administracao publica brasileira. Exemplo do tom esperado:

Texto fraco: "Precisamos comprar computadores porque os atuais estao velhos."
Texto adequado: "A presente contratacao justifica-se pela necessidade de modernizacao do parque tecnologico da unidade requisitante, tendo em vista que os equipamentos atualmente em uso encontram-se em fim de vida util, comprometendo a continuidade e a eficiencia dos servicos publicos prestados a populacao, em observancia ao principio da eficiencia insculpido no art. 37 da Constituicao Federal."

Caracteristicas obrigatorias:
- Voz institucional impessoal ("a Administracao", "a unidade requisitante", nunca "nos" ou "eu")
- Citacao expressa dos dispositivos legais aplicaveis ao fundamentar cada secao
- Periodos completos e bem encadeados; evitar listas telegraficas em secoes dissertativas
- Numeros por extenso seguidos do numeral entre parenteses em valores relevantes: "dez (10) dias"
</diretrizes_estilo>
`

function blocoDadosProcesso(dados: DadosWizard): string {
  return `<dados_processo>
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
</dados_processo>`
}

// Trecho limitado do documento anterior para manter o prompt dentro de um custo razoavel
function resumirDocumento(texto: string, maxChars = 4000): string {
  if (texto.length <= maxChars) return texto
  return texto.slice(0, maxChars) + '\n[trecho truncado por limite de contexto]'
}

export function buildPromptDFD(dados: DadosWizard): string {
  return `${CABECALHO_LEGAL}

<tarefa>Gere o Documento de Formalizacao da Demanda (DFD) conforme o Art. 6, X da Lei 14.133/21.</tarefa>

<contexto_legal>
Art. 6, X da Lei 14.133/21: o DFD e o documento que evidencia e detalha a necessidade da contratacao, elaborado pelo setor requisitante.
O DFD inaugura a fase preparatoria do processo licitatorio (Art. 18, caput) e deve permitir a verificacao da compatibilidade da demanda com o planejamento da Administracao (Plano de Contratacoes Anual, Art. 12, VII).
</contexto_legal>

${blocoDadosProcesso(dados)}

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

${DIRETRIZES_ESTILO}

<formato_saida>
Gere o DFD completo em formato de documento oficial.
Use paragrafos numerados conforme a estrutura acima.
O documento deve ser pronto para revisao e assinatura, sem campos em branco visiveis.
</formato_saida>`
}

export function buildPromptETP(dados: DadosWizard, dfdGerado?: string): string {
  return `${CABECALHO_LEGAL}

<tarefa>Gere o Estudo Tecnico Preliminar (ETP) conforme o Art. 18 da Lei 14.133/21.</tarefa>

<contexto_legal>
Art. 18, par. 1 da Lei 14.133/21: o ETP evidencia o problema a ser resolvido e a melhor solucao, de modo a permitir a avaliacao da viabilidade tecnica e economica da contratacao.
Sao obrigatorios os incisos I, IV, VI, VIII e XIII (Art. 18, par. 2); os demais, quando nao contemplados, exigem justificativa.
</contexto_legal>

${blocoDadosProcesso(dados)}
${dfdGerado ? `
<documento_anterior tipo="DFD">
O DFD abaixo ja foi elaborado para este processo. O ETP deve ser COERENTE com ele: mesma necessidade, mesma justificativa de fundo, mesmos quantitativos. Nao contradiga nem reinvente o que o DFD estabeleceu; aprofunde tecnicamente.
${resumirDocumento(dfdGerado)}
</documento_anterior>` : ''}

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

${DIRETRIZES_ESTILO}

<formato_saida>
Gere o ETP completo em formato de documento oficial.
Cada elemento deve ter titulo e texto substancial.
O documento deve demonstrar que a necessidade foi estudada tecnicamente antes da contratacao.
</formato_saida>`
}

export function buildPromptTR(dados: DadosWizard, etpGerado?: string): string {
  return `${CABECALHO_LEGAL}

<tarefa>Gere o Termo de Referencia (TR) conforme o Art. 6, XXIII da Lei 14.133/21.</tarefa>

<contexto_legal>
Art. 6, XXIII da Lei 14.133/21: o TR e o documento necessario para a contratacao de bens e servicos, contendo os parametros e elementos descritivos listados nas alineas 'a' a 'j'.
O TR materializa as conclusoes do ETP em especificacoes contratuais exigiveis do futuro fornecedor.
</contexto_legal>

${blocoDadosProcesso(dados)}
${etpGerado ? `
<documento_anterior tipo="ETP">
O ETP abaixo ja foi elaborado para este processo. O TR deve TRADUZIR as conclusoes do ETP em especificacoes contratuais: a solucao escolhida no ETP vira o objeto detalhado; as estimativas do ETP fundamentam quantidades e precos de referencia; os requisitos do ETP viram exigencias de qualificacao. Nao contradiga o ETP.
${resumirDocumento(etpGerado)}
</documento_anterior>` : ''}

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

${DIRETRIZES_ESTILO}

<formato_saida>
Gere o TR completo em formato de documento oficial, pronto para compor o processo licitatorio.
Cada seccao deve ser detalhada e especifica ao objeto descrito.
Nao deixe seccoes genericas; adapte cada uma ao objeto real informado.
</formato_saida>`
}

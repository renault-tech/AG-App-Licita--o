# Wizard Inteligente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir `/processos/novo` por um wizard inteligente de 5 etapas que coleta dados suficientes para gerar DFD, ETP e TR automaticamente via templates + ajuste por IA.

**Architecture:** Motor de templates com substituicao de variaveis (custo zero) como base; camada opcional de IA (Gemini Flash, pre-configurado) para ajuste fino; sistema de aprendizado que armazena clausulas editadas pelo usuario para reutilizacao futura sem IA.

**Tech Stack:** Next.js 14 App Router, TypeScript estrito, Tailwind CSS, Supabase (Postgres + RLS), Zod, react-hook-form, Google Gemini Flash (gratuito)

---

## Mapa de Arquivos

### Novos
- `supabase/migrations/20260510000001_clausulas_padrao.sql`
- `supabase/migrations/20260510000002_clausulas_aprendidas.sql`
- `supabase/migrations/20260510000003_ia_config_processo.sql`
- `src/lib/motor-templates.ts` — selecao de template por prioridade + substituicao de variaveis
- `src/lib/actions/clausulas.ts` — server actions para clausulas_padrao e clausulas_aprendidas
- `src/lib/actions/gerar-documentos.ts` — orquestra geracao paralela DFD+ETP+TR
- `src/lib/ai/prompts/ajuste-documentos.ts` — prompts de ajuste fino por tipo de documento
- `src/app/(dashboard)/processos/novo/page.tsx` — SUBSTITUIDO: wizard container
- `src/app/(dashboard)/processos/novo/etapa-identificacao.tsx`
- `src/app/(dashboard)/processos/novo/etapa-objeto.tsx`
- `src/app/(dashboard)/processos/novo/etapa-requisitos.tsx`
- `src/app/(dashboard)/processos/novo/etapa-condicoes.tsx`
- `src/app/(dashboard)/processos/novo/etapa-revisao.tsx`
- `src/app/(dashboard)/processos/novo/tela-documentos-gerados.tsx`
- `src/app/(dashboard)/processos/novo/badge-origem.tsx`
- `src/app/(dashboard)/processos/novo/types.ts` — tipos compartilhados do wizard
- `src/data/clausulas-iniciais.ts` — seed de clausulas padrao para as modalidades principais

### Modificados
- `src/types/database.ts` — adicionar ClausulasPadraoRow, ClausulasAprendidasRow
- `src/lib/actions/processo.ts` — adicionar `criarProcessoComDocumentos()`
- `src/app/(dashboard)/processos/[id]/dfd/editor-dfd.tsx` — gatilho de aprendizado ao salvar
- `src/app/(dashboard)/processos/[id]/etp/editor-etp.tsx` — gatilho de aprendizado ao salvar
- `src/app/(dashboard)/processos/[id]/tr/editor-tr.tsx` — gatilho de aprendizado ao salvar

---

## Task 1: Migrations SQL

**Files:**
- Create: `supabase/migrations/20260510000001_clausulas_padrao.sql`
- Create: `supabase/migrations/20260510000002_clausulas_aprendidas.sql`
- Create: `supabase/migrations/20260510000003_ia_config_processo.sql`

- [ ] **Step 1: Criar migration clausulas_padrao**

```sql
-- supabase/migrations/20260510000001_clausulas_padrao.sql
CREATE TABLE clausulas_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_campo text NOT NULL,
  documento text NOT NULL CHECK (documento IN ('dfd','etp','tr')),
  modalidade text,
  categoria_objeto text,
  texto_template text NOT NULL,
  variaveis jsonb DEFAULT '[]'::jsonb,
  versao int DEFAULT 1,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX idx_clausulas_padrao_lookup
  ON clausulas_padrao (documento, tipo_campo, modalidade, categoria_objeto)
  WHERE ativo = true;
```

- [ ] **Step 2: Criar migration clausulas_aprendidas**

```sql
-- supabase/migrations/20260510000002_clausulas_aprendidas.sql
CREATE TABLE clausulas_aprendidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  tipo_campo text NOT NULL,
  documento text NOT NULL CHECK (documento IN ('dfd','etp','tr')),
  modalidade text,
  categoria_objeto text,
  texto_original text NOT NULL,
  texto_aprovado text NOT NULL,
  processos_referencia uuid[] DEFAULT '{}',
  uso_count int DEFAULT 1,
  score_qualidade numeric DEFAULT 1.0,
  ultima_vez_em timestamptz DEFAULT now(),
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX idx_clausulas_aprendidas_lookup
  ON clausulas_aprendidas (organizacao_id, documento, tipo_campo, modalidade, categoria_objeto);

ALTER TABLE clausulas_aprendidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_own" ON clausulas_aprendidas
  USING (organizacao_id = (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));
```

- [ ] **Step 3: Criar migration ia_config em processos**

```sql
-- supabase/migrations/20260510000003_ia_config_processo.sql
ALTER TABLE processos_licitatorios
  ADD COLUMN IF NOT EXISTS ia_config jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS categoria_objeto text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS secretaria_id uuid REFERENCES secretarias(id);
```

- [ ] **Step 4: Aplicar migrations**

```bash
npx supabase db push
```

Esperado: 3 migrations aplicadas sem erro.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260510000001_clausulas_padrao.sql
git add supabase/migrations/20260510000002_clausulas_aprendidas.sql
git add supabase/migrations/20260510000003_ia_config_processo.sql
git commit -m "feat(db): adicionar tabelas clausulas_padrao e clausulas_aprendidas"
```

---

## Task 2: Tipos TypeScript

**Files:**
- Modify: `src/types/database.ts`
- Create: `src/app/(dashboard)/processos/novo/types.ts`

- [ ] **Step 1: Adicionar tipos de banco em database.ts**

Adicionar ao final de `src/types/database.ts`:

```typescript
export interface ClausulaPadraoRow {
  id: string
  tipo_campo: string
  documento: 'dfd' | 'etp' | 'tr'
  modalidade: string | null
  categoria_objeto: string | null
  texto_template: string
  variaveis: string[]
  versao: number
  ativo: boolean
  criado_em: string
}

export interface ClausulaAprendidaRow {
  id: string
  organizacao_id: string
  tipo_campo: string
  documento: 'dfd' | 'etp' | 'tr'
  modalidade: string | null
  categoria_objeto: string | null
  texto_original: string
  texto_aprovado: string
  processos_referencia: string[]
  uso_count: number
  score_qualidade: number
  ultima_vez_em: string
  criado_em: string
}
```

- [ ] **Step 2: Criar types.ts do wizard**

```typescript
// src/app/(dashboard)/processos/novo/types.ts
import type { ModalidadeLicitacao } from '@/types/database'

export type CategoriaObjeto =
  | 'informatica'
  | 'mobiliario'
  | 'material_consumo'
  | 'veiculos'
  | 'obras'
  | 'servicos_continuados'
  | 'servicos_eventuais'
  | 'saude_medicamentos'
  | 'alimentacao'
  | 'outros'

export type OrigemClausula = 'aprendida' | 'template' | 'ia' | 'vazio'

export interface ItemWizard {
  descricao: string
  unidade: string
  quantidade: number
}

export interface DadosWizard {
  // Etapa 1
  secretaria_id: string
  modalidade: ModalidadeLicitacao
  categoria_objeto: CategoriaObjeto

  // Etapa 2
  objeto: string
  problema_atual: string
  impacto_sem_contratar: string
  solucao_proposta: string
  itens: ItemWizard[]
  prazo_dias: number

  // Etapa 3
  normas_aplicaveis: string[]
  especificacoes_minimas: string
  criterios_sustentabilidade: string[]

  // Etapa 4
  valor_estimado: number | null
  forma_pagamento: string
  garantia: string
  prazo_vigencia_meses: number
  sancoes: string

  // Etapa 5
  ia_modelo: 'gemini' | 'sem_ia' | 'anthropic'
  clarificacoes: Record<string, string>
}

export interface SecaoGerada {
  tipo_campo: string
  texto: string
  origem: OrigemClausula
  processos_referencia: Array<{
    id: string
    numero_processo: string | null
    objeto: string
    modalidade: string
  }>
}

export interface DocumentoGerado {
  secoes: SecaoGerada[]
}

export interface DocumentosGerados {
  dfd: DocumentoGerado
  etp: DocumentoGerado
  tr: DocumentoGerado
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/database.ts src/app/(dashboard)/processos/novo/types.ts
git commit -m "feat(types): adicionar tipos de clausulas e wizard"
```

---

## Task 3: Dados Iniciais de Clausulas

**Files:**
- Create: `src/data/clausulas-iniciais.ts`
- Create: `src/lib/actions/clausulas.ts`

- [ ] **Step 1: Criar clausulas-iniciais.ts**

```typescript
// src/data/clausulas-iniciais.ts
// Templates padrao para seed no banco. Variaveis: {{nome_entre_chaves}}

export const CLAUSULAS_INICIAIS = [
  // ── DFD ──────────────────────────────────────────────────────────
  {
    tipo_campo: 'objeto_dfd',
    documento: 'dfd' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `{{objeto_completo}}, conforme especificacoes e condicoes estabelecidas neste Documento de Formalizacao da Demanda, elaborado nos termos do art. 6o, inciso X, da Lei Federal no 14.133, de 1o de abril de 2021.`,
    variaveis: ['objeto_completo'],
  },
  {
    tipo_campo: 'justificativa_necessidade',
    documento: 'dfd' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `A presente contratacao justifica-se pela seguinte situacao identificada por esta Secretaria: {{problema_atual}}. A ausencia da presente contratacao implicara {{impacto_sem_contratar}}. Diante do exposto, a solucao proposta consiste em {{solucao_proposta}}, mostrando-se a alternativa mais adequada ao atendimento do interesse publico, em conformidade com os principios da eficiencia e economicidade previstos no art. 11 da Lei no 14.133/2021.`,
    variaveis: ['problema_atual', 'impacto_sem_contratar', 'solucao_proposta'],
  },
  {
    tipo_campo: 'dotacao_orcamentaria',
    documento: 'dfd' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `As despesas decorrentes da presente contratacao correrao por conta das dotacoes orcamentarias proprias consignadas no orcamento vigente, a serem indicadas no momento da celebracao do instrumento contratual, em conformidade com o art. 92, inciso IX, da Lei no 14.133/2021.`,
    variaveis: [],
  },
  // ── ETP ──────────────────────────────────────────────────────────
  {
    tipo_campo: 'descricao_necessidade',
    documento: 'etp' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `{{problema_atual}}. Esta necessidade esta diretamente alinhada aos objetivos institucionais da {{secretaria_nome}} e ao Plano de Contratacoes Anual vigente, nos termos do art. 18, inciso I, da Lei no 14.133/2021.`,
    variaveis: ['problema_atual', 'secretaria_nome'],
  },
  {
    tipo_campo: 'requisitos_contratacao',
    documento: 'etp' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `A contratacao devera atender aos seguintes requisitos minimos: {{especificacoes_minimas}}. Alem disso, deverao ser observados os criterios de sustentabilidade ambiental aplicaveis, em conformidade com o art. 11, inciso IV, e art. 5o da Lei no 14.133/2021: {{criterios_sustentabilidade}}.`,
    variaveis: ['especificacoes_minimas', 'criterios_sustentabilidade'],
  },
  {
    tipo_campo: 'levantamento_mercado',
    documento: 'etp' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `Procedeu-se ao levantamento das solucoes disponiveis no mercado para o atendimento da necessidade identificada. A solucao escolhida mostrou-se a mais vantajosa em termos de relacao custo-beneficio, disponibilidade no mercado nacional e capacidade de atendimento ao objeto pretendido. O levantamento subsidiou a estimativa de preco e a definicao das especificacoes tecnicas, conforme art. 18, inciso VI, da Lei no 14.133/2021.`,
    variaveis: [],
  },
  {
    tipo_campo: 'justificativa_solucao',
    documento: 'etp' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `{{solucao_proposta}}. Esta solucao foi selecionada por ser a que melhor atende a necessidade identificada, considerando os aspectos tecnicos, economicos e operacionais, em observancia ao principio da vantajosidade previsto no art. 11, inciso III, da Lei no 14.133/2021.`,
    variaveis: ['solucao_proposta'],
  },
  {
    tipo_campo: 'parcelamento',
    documento: 'etp' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `Analisou-se a viabilidade do parcelamento do objeto, nos termos do art. 47 da Lei no 14.133/2021. Concluiu-se que o objeto e tecnicamente indivisivel para fins de licitacao, tendo em vista a necessidade de uniformidade tecnica e operacional da solucao, sendo mais vantajoso para a Administracao a contratacao de forma unitaria.`,
    variaveis: [],
  },
  {
    tipo_campo: 'resultados_pretendidos',
    documento: 'etp' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `Com a realizacao desta contratacao, espera-se: (i) {{solucao_proposta}}; (ii) melhoria da eficiencia operacional da {{secretaria_nome}}; (iii) reducao dos riscos associados a {{problema_atual}}; e (iv) alinhamento com as metas institucionais previstas no planejamento estrategico do exercicio.`,
    variaveis: ['solucao_proposta', 'secretaria_nome', 'problema_atual'],
  },
  {
    tipo_campo: 'providencias',
    documento: 'etp' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `Previamente ao recebimento do objeto, a {{secretaria_nome}} devera providenciar: (i) designacao formal do fiscal do contrato, nos termos do art. 117 da Lei no 14.133/2021; (ii) preparacao do local de entrega ou execucao; e (iii) capacitacao dos servidores responsaveis pelo recebimento e utilizacao do objeto contratado.`,
    variaveis: ['secretaria_nome'],
  },
  // ── TR ──────────────────────────────────────────────────────────
  {
    tipo_campo: 'objeto_tr',
    documento: 'tr' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `O presente Termo de Referencia tem por objeto {{objeto_completo}}, conforme especificacoes e condicoes estabelecidas neste instrumento, elaborado com fundamento no art. 6o, inciso XXIII, da Lei Federal no 14.133/2021.`,
    variaveis: ['objeto_completo'],
  },
  {
    tipo_campo: 'fundamentacao',
    documento: 'tr' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `A presente contratacao encontra amparo no Estudo Tecnico Preliminar elaborado por esta Secretaria, no Documento de Formalizacao da Demanda e nas disposicoes da Lei Federal no 14.133/2021, em especial nos arts. 6o, inciso XXIII, 18 e 40. A necessidade da contratacao decorre de {{problema_atual}}.`,
    variaveis: ['problema_atual'],
  },
  {
    tipo_campo: 'modelo_execucao',
    documento: 'tr' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `O objeto sera executado/entregue no prazo de {{prazo_dias}} ({{prazo_dias_extenso}}) dias corridos contados da assinatura do contrato ou da emissao da Ordem de Fornecimento/Servico, no endereco indicado pela {{secretaria_nome}}. O recebimento provisorio ocorrera no ato da entrega e o recebimento definitivo em ate 15 (quinze) dias uteis apos a verificacao da conformidade com as especificacoes exigidas.`,
    variaveis: ['prazo_dias', 'prazo_dias_extenso', 'secretaria_nome'],
  },
  {
    tipo_campo: 'modelo_gestao',
    documento: 'tr' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `A gestao e fiscalizacao do contrato serao exercidas por servidor designado formalmente pela autoridade competente, nos termos do art. 117 da Lei no 14.133/2021. O fiscal do contrato sera responsavel pelo acompanhamento da execucao contratual, verificacao da conformidade dos produtos ou servicos entregues, ateste das notas fiscais e comunicacao de eventuais irregularidades.`,
    variaveis: [],
  },
  {
    tipo_campo: 'criterios_medicao',
    documento: 'tr' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `O recebimento e medicao do objeto serao realizados mediante conferencia qualitativa e quantitativa pelo fiscal do contrato. O recebimento definitivo sera atestado mediante emissao de Termo de Recebimento Definitivo, que habilitara a contratada a emitir a nota fiscal correspondente. Constatadas irregularidades, a contratada sera notificada para correcao no prazo de 10 (dez) dias uteis.`,
    variaveis: [],
  },
  {
    tipo_campo: 'forma_pagamento',
    documento: 'tr' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `{{forma_pagamento_texto}} O pagamento sera realizado mediante apresentacao de nota fiscal eletronicadevidamente atestada pelo fiscal do contrato, acompanhada das certidoes negativas de debitos perante o INSS, FGTS e Fazendas Federal, Estadual e Municipal, em conta corrente indicada pela contratada, conforme art. 92, inciso IX, da Lei no 14.133/2021.`,
    variaveis: ['forma_pagamento_texto'],
  },
  {
    tipo_campo: 'garantias',
    documento: 'tr' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `{{garantia_texto}} A garantia contratual podera ser prestada nas modalidades previstas no art. 96 da Lei no 14.133/2021: caucao em dinheiro, titulos da divida publica, seguro-garantia ou fianca bancaria.`,
    variaveis: ['garantia_texto'],
  },
  {
    tipo_campo: 'sancoes',
    documento: 'tr' as const,
    modalidade: null,
    categoria_objeto: null,
    texto_template: `Pelo descumprimento total ou parcial das obrigacoes contratuais, a contratada ficara sujeita as sancoes previstas nos arts. 155 a 163 da Lei no 14.133/2021, a saber: (i) advertencia; (ii) multa moratoria de 0,5% (meio por cento) por dia de atraso sobre o valor do contrato, ate o limite de 10% (dez por cento); (iii) multa compensatoria de 10% (dez por cento) sobre o valor total do contrato em caso de inexecucao total; (iv) impedimento de licitar e contratar pelo prazo de ate 3 (tres) anos; e (v) declaracao de inidoneidade pelo prazo de ate 6 (seis) anos. As sancoes poderao ser aplicadas cumulativamente, garantido o contraditorio e a ampla defesa.`,
    variaveis: [],
  },
]
```

- [ ] **Step 2: Criar server actions de clausulas**

```typescript
// src/lib/actions/clausulas.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { ClausulaAprendidaRow } from '@/types/database'

export async function buscarClausulaParaCampo(
  documento: 'dfd' | 'etp' | 'tr',
  tipoCampo: string,
  modalidade: string,
  categoriaObjeto: string,
  organizacaoId: string
): Promise<{ texto: string; origem: 'aprendida' | 'template' | 'vazio'; processosReferencia: string[] }> {
  const supabase = await createClient()

  // 1. Tenta clausula aprendida desta org (mais especifica primeiro)
  const candidatos = [
    { modalidade, categoria_objeto: categoriaObjeto },
    { modalidade: null, categoria_objeto: categoriaObjeto },
    { modalidade, categoria_objeto: null },
    { modalidade: null, categoria_objeto: null },
  ]

  for (const filtro of candidatos) {
    const query = (supabase as any)
      .from('clausulas_aprendidas')
      .select('texto_aprovado, processos_referencia')
      .eq('organizacao_id', organizacaoId)
      .eq('documento', documento)
      .eq('tipo_campo', tipoCampo)
      .order('uso_count', { ascending: false })
      .limit(1)

    if (filtro.modalidade) query.eq('modalidade', filtro.modalidade)
    else query.is('modalidade', null)
    if (filtro.categoria_objeto) query.eq('categoria_objeto', filtro.categoria_objeto)
    else query.is('categoria_objeto', null)

    const { data } = await query.maybeSingle()
    if (data) return { texto: data.texto_aprovado, origem: 'aprendida', processosReferencia: data.processos_referencia ?? [] }
  }

  // 2. Tenta template padrao global
  for (const filtro of candidatos) {
    const query = (supabase as any)
      .from('clausulas_padrao')
      .select('texto_template')
      .eq('documento', documento)
      .eq('tipo_campo', tipoCampo)
      .eq('ativo', true)
      .limit(1)

    if (filtro.modalidade) query.eq('modalidade', filtro.modalidade)
    else query.is('modalidade', null)
    if (filtro.categoria_objeto) query.eq('categoria_objeto', filtro.categoria_objeto)
    else query.is('categoria_objeto', null)

    const { data } = await query.maybeSingle()
    if (data) return { texto: data.texto_template, origem: 'template', processosReferencia: [] }
  }

  return { texto: '', origem: 'vazio', processosReferencia: [] }
}

export async function registrarAprendizado(params: {
  organizacaoId: string
  processoId: string
  documento: 'dfd' | 'etp' | 'tr'
  tipoCampo: string
  modalidade: string
  categoriaObjeto: string
  textoOriginal: string
  textoAprovado: string
}): Promise<void> {
  const supabase = await createClient()

  const { data: existente } = await (supabase as any)
    .from('clausulas_aprendidas')
    .select('id, processos_referencia, uso_count')
    .eq('organizacao_id', params.organizacaoId)
    .eq('documento', params.documento)
    .eq('tipo_campo', params.tipoCampo)
    .eq('modalidade', params.modalidade)
    .eq('categoria_objeto', params.categoriaObjeto)
    .maybeSingle()

  if (existente) {
    const refs = [...new Set([...(existente.processos_referencia ?? []), params.processoId])]
    await (supabase as any)
      .from('clausulas_aprendidas')
      .update({
        texto_aprovado: params.textoAprovado,
        processos_referencia: refs,
        uso_count: existente.uso_count + 1,
        ultima_vez_em: new Date().toISOString(),
      })
      .eq('id', existente.id)
  } else {
    await (supabase as any)
      .from('clausulas_aprendidas')
      .insert({
        organizacao_id: params.organizacaoId,
        documento: params.documento,
        tipo_campo: params.tipoCampo,
        modalidade: params.modalidade,
        categoria_objeto: params.categoriaObjeto,
        texto_original: params.textoOriginal,
        texto_aprovado: params.textoAprovado,
        processos_referencia: [params.processoId],
      })
  }
}

export async function buscarProcessosReferencia(ids: string[]) {
  if (!ids.length) return []
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('processos_licitatorios')
    .select('id, numero_processo, objeto, modalidade')
    .in('id', ids)
  return (data ?? []) as Array<{ id: string; numero_processo: string | null; objeto: string; modalidade: string }>
}
```

- [ ] **Step 3: Commit**

```bash
git add src/data/clausulas-iniciais.ts src/lib/actions/clausulas.ts
git commit -m "feat(clausulas): banco de clausulas padrao e sistema de aprendizado"
```

---

## Task 4: Motor de Templates

**Files:**
- Create: `src/lib/motor-templates.ts`

- [ ] **Step 1: Criar motor-templates.ts**

```typescript
// src/lib/motor-templates.ts
import type { DadosWizard, SecaoGerada } from '@/app/(dashboard)/processos/novo/types'
import { buscarClausulaParaCampo } from './actions/clausulas'
import { gerarTextoIA } from './ai/client'

function substituirVariaveis(template: string, variaveis: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, chave) => variaveis[chave] ?? `[${chave}]`)
}

function numeroPorExtenso(n: number): string {
  const map: Record<number, string> = {
    15: 'quinze', 30: 'trinta', 45: 'quarenta e cinco', 60: 'sessenta',
    90: 'noventa', 120: 'cento e vinte', 180: 'cento e oitenta', 365: 'trezentos e sessenta e cinco',
  }
  return map[n] ?? String(n)
}

function formasPagamentoTexto(forma: string): string {
  const map: Record<string, string> = {
    '30_dias_medicao': 'O pagamento sera realizado em ate 30 (trinta) dias corridos apos o ateste da nota fiscal pelo fiscal do contrato.',
    'parcelas_mensais': 'O pagamento sera realizado mensalmente, proporcionalmente a execucao dos servicos, mediante ateste do fiscal do contrato.',
    'entrega_unica': 'O pagamento sera realizado em parcela unica, em ate 30 (trinta) dias corridos apos o recebimento definitivo do objeto e ateste da nota fiscal.',
  }
  return map[forma] ?? forma
}

function garantiaTexto(garantia: string, valorEstimado: number | null): string {
  if (garantia === 'dispensada') {
    return 'Fica dispensada a exigencia de garantia contratual, tendo em vista o reduzido risco da contratacao e o valor estimado do contrato.'
  }
  const pct = garantia === '5%' ? '5% (cinco por cento)' : '10% (dez por cento)'
  const valor = valorEstimado ? `, correspondente a ${pct} do valor total estimado de R$ ${valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''
  return `Sera exigida garantia contratual no valor equivalente a ${pct} do valor do contrato${valor}, nos termos do art. 96 da Lei no 14.133/2021.`
}

function montarObjetoCompleto(dados: DadosWizard): string {
  if (!dados.itens.length) return dados.objeto
  const itensStr = dados.itens
    .map(i => `${i.quantidade} (${numeroPorExtenso(i.quantidade)}) ${i.unidade} de ${i.descricao}`)
    .join('; ')
  return `${dados.objeto}, compreendendo: ${itensStr}`
}

export interface ResultadoGeracao {
  secoes: SecaoGerada[]
}

export async function gerarSecao(params: {
  documento: 'dfd' | 'etp' | 'tr'
  tipoCampo: string
  organizacaoId: string
  modalidade: string
  categoriaObjeto: string
  variaveis: Record<string, string>
  usarIA: boolean
  modeloIA: string
}): Promise<SecaoGerada> {
  const { texto: textoBase, origem, processosReferencia } = await buscarClausulaParaCampo(
    params.documento,
    params.tipoCampo,
    params.modalidade,
    params.categoriaObjeto,
    params.organizacaoId
  )

  let textoFinal = substituirVariaveis(textoBase, params.variaveis)

  if (params.usarIA && textoFinal && origem !== 'aprendida') {
    try {
      const res = await gerarTextoIA({
        prompt: `Personalize o texto abaixo para o contexto especifico da contratacao, mantendo o registro juridico formal e as referencias legais. Retorne apenas o texto ajustado, sem comentarios.\n\nContexto: ${JSON.stringify(params.variaveis)}\n\nTexto base:\n${textoFinal}`,
        maxTokens: 800,
        temperature: 0.3,
      })
      textoFinal = res.text
      return { tipo_campo: params.tipoCampo, texto: textoFinal, origem: 'ia', processos_referencia: [] }
    } catch {
      // fallback silencioso para template
    }
  }

  const refs = processosReferencia.length > 0
    ? await buscarRefProcessos(processosReferencia, params.organizacaoId)
    : []

  return { tipo_campo: params.tipoCampo, texto: textoFinal, origem, processos_referencia: refs }
}

async function buscarRefProcessos(ids: string[], _organizacaoId: string) {
  const { buscarProcessosReferencia } = await import('./actions/clausulas')
  return buscarProcessosReferencia(ids)
}

export function montarVariaveis(dados: DadosWizard, secretariaNome: string): Record<string, string> {
  return {
    objeto_completo: montarObjetoCompleto(dados),
    problema_atual: dados.problema_atual,
    impacto_sem_contratar: dados.impacto_sem_contratar,
    solucao_proposta: dados.solucao_proposta,
    secretaria_nome: secretariaNome,
    especificacoes_minimas: dados.especificacoes_minimas,
    criterios_sustentabilidade: dados.criterios_sustentabilidade.join(', '),
    prazo_dias: String(dados.prazo_dias),
    prazo_dias_extenso: numeroPorExtenso(dados.prazo_dias),
    forma_pagamento_texto: formasPagamentoTexto(dados.forma_pagamento),
    garantia_texto: garantiaTexto(dados.garantia, dados.valor_estimado),
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/motor-templates.ts
git commit -m "feat(templates): motor de substituicao de variaveis com fallback IA"
```

---

## Task 5: Server Action de Geracao

**Files:**
- Create: `src/lib/actions/gerar-documentos.ts`
- Modify: `src/lib/actions/processo.ts`

- [ ] **Step 1: Criar gerar-documentos.ts**

```typescript
// src/lib/actions/gerar-documentos.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { gerarSecao, montarVariaveis } from '@/lib/motor-templates'
import type { DadosWizard, DocumentosGerados } from '@/app/(dashboard)/processos/novo/types'

const CAMPOS_DFD = ['objeto_dfd', 'justificativa_necessidade', 'dotacao_orcamentaria']
const CAMPOS_ETP = ['descricao_necessidade', 'requisitos_contratacao', 'levantamento_mercado', 'justificativa_solucao', 'parcelamento', 'resultados_pretendidos', 'providencias']
const CAMPOS_TR  = ['objeto_tr', 'fundamentacao', 'modelo_execucao', 'modelo_gestao', 'criterios_medicao', 'forma_pagamento', 'garantias', 'sancoes']

export async function gerarDocumentos(
  dados: DadosWizard
): Promise<{ success: boolean; documentos?: DocumentosGerados; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado.' }

  const { data: usuario } = await supabase.from('usuarios').select('organizacao_id').eq('id', user.id).maybeSingle()
  if (!usuario) return { success: false, error: 'Usuario nao encontrado.' }

  const { data: secretaria } = await (supabase as any)
    .from('secretarias')
    .select('nome')
    .eq('id', dados.secretaria_id)
    .maybeSingle()

  const secretariaNome = (secretaria as any)?.nome ?? 'Secretaria'
  const orgId = (usuario as any).organizacao_id
  const usarIA = dados.ia_modelo !== 'sem_ia'
  const variaveis = montarVariaveis(dados, secretariaNome)

  const params = (documento: 'dfd' | 'etp' | 'tr', campos: string[]) =>
    campos.map(tipoCampo => gerarSecao({
      documento,
      tipoCampo,
      organizacaoId: orgId,
      modalidade: dados.modalidade,
      categoriaObjeto: dados.categoria_objeto,
      variaveis,
      usarIA,
      modeloIA: dados.ia_modelo,
    }))

  const [secoesDFD, secoesETP, secoesTR] = await Promise.all([
    Promise.all(params('dfd', CAMPOS_DFD)),
    Promise.all(params('etp', CAMPOS_ETP)),
    Promise.all(params('tr', CAMPOS_TR)),
  ])

  return {
    success: true,
    documentos: {
      dfd: { secoes: secoesDFD },
      etp: { secoes: secoesETP },
      tr: { secoes: secoesTR },
    },
  }
}
```

- [ ] **Step 2: Adicionar criarProcessoComDocumentos em processo.ts**

Adicionar ao final de `src/lib/actions/processo.ts`:

```typescript
export async function criarProcessoComDocumentos(
  dados: import('@/app/(dashboard)/processos/novo/types').DadosWizard,
  documentos: import('@/app/(dashboard)/processos/novo/types').DocumentosGerados
): Promise<{ success: boolean; processoId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado.' }

  const { data: userData } = await supabase.from('usuarios').select('organizacao_id').eq('id', user.id).maybeSingle()
  if (!userData) return { success: false, error: 'Usuario nao encontrado.' }

  const orgId = (userData as any).organizacao_id
  const valorNum = dados.valor_estimado && !Number.isNaN(dados.valor_estimado) ? dados.valor_estimado : null

  const { data: processo, error: procError } = await (supabase as any)
    .from('processos_licitatorios')
    .insert({
      organizacao_id: orgId,
      criado_por: user.id,
      objeto: dados.objeto,
      modalidade: dados.modalidade,
      valor_estimado: valorNum,
      categoria_objeto: dados.categoria_objeto,
      secretaria_id: dados.secretaria_id,
      status: 'rascunho',
      etapa_atual: 1,
      ia_config: { modelo: dados.ia_modelo, aprovado_em: new Date().toISOString() },
    })
    .select('id')
    .single()

  if (procError || !processo) return { success: false, error: procError?.message ?? 'Erro ao criar processo.' }

  const processoId = processo.id

  // Cria DFD
  const secoesDfd = Object.fromEntries(documentos.dfd.secoes.map(s => [s.tipo_campo, s.texto]))
  await (supabase as any).from('dfd').insert({
    processo_id: processoId,
    organizacao_id: orgId,
    criado_por: user.id,
    secretaria_id: dados.secretaria_id,
    objeto: dados.objeto,
    justificativa_necessidade: secoesDfd['justificativa_necessidade'] ?? null,
    tipo: 'individual',
    status_adesao: 'rascunho',
    responsavel_elaboracao: '',
    status: 'rascunho',
    gerado_por_ia: dados.ia_modelo !== 'sem_ia',
  })

  // Cria ETP
  const secoesEtp = Object.fromEntries(documentos.etp.secoes.map(s => [s.tipo_campo, s.texto]))
  await (supabase as any).from('etp').insert({
    processo_id: processoId,
    organizacao_id: orgId,
    criado_por: user.id,
    descricao_necessidade: secoesEtp['descricao_necessidade'] ?? null,
    requisitos_contratacao: secoesEtp['requisitos_contratacao'] ?? null,
    levantamento_mercado: secoesEtp['levantamento_mercado'] ?? null,
    estimativa_quantidades: null,
    justificativa_solucao: secoesEtp['justificativa_solucao'] ?? null,
    parcelamento: secoesEtp['parcelamento'] ?? null,
    resultados_pretendidos: secoesEtp['resultados_pretendidos'] ?? null,
    providencias: secoesEtp['providencias'] ?? null,
    status: 'rascunho',
    gerado_por_ia: dados.ia_modelo !== 'sem_ia',
  })

  // Cria TR
  const secoesTr = Object.fromEntries(documentos.tr.secoes.map(s => [s.tipo_campo, s.texto]))
  await (supabase as any).from('termo_referencia').insert({
    processo_id: processoId,
    organizacao_id: orgId,
    criado_por: user.id,
    objeto: secoesTr['objeto_tr'] ?? null,
    fundamentacao: secoesTr['fundamentacao'] ?? null,
    descricao: null,
    requisitos_tecnicos: dados.especificacoes_minimas,
    modelo_execucao: secoesTr['modelo_execucao'] ?? null,
    modelo_gestao: secoesTr['modelo_gestao'] ?? null,
    criterios_medicao: secoesTr['criterios_medicao'] ?? null,
    forma_pagamento: secoesTr['forma_pagamento'] ?? null,
    garantias: secoesTr['garantias'] ?? null,
    sancoes: secoesTr['sancoes'] ?? null,
    status: 'rascunho',
    gerado_por_ia: dados.ia_modelo !== 'sem_ia',
  })

  return { success: true, processoId }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/gerar-documentos.ts src/lib/actions/processo.ts
git commit -m "feat(actions): geracao paralela DFD+ETP+TR e criacao de processo com documentos"
```

---

## Task 6: Componente Badge de Origem

**Files:**
- Create: `src/app/(dashboard)/processos/novo/badge-origem.tsx`

- [ ] **Step 1: Criar badge-origem.tsx**

```tsx
// src/app/(dashboard)/processos/novo/badge-origem.tsx
'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import type { OrigemClausula } from './types'

interface ProcessoRef {
  id: string
  numero_processo: string | null
  objeto: string
  modalidade: string
}

interface Props {
  origem: OrigemClausula
  processosReferencia?: ProcessoRef[]
}

const LABELS: Record<OrigemClausula, { label: string; classes: string }> = {
  aprendida: { label: 'Baseado em processos anteriores', classes: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' },
  template:  { label: 'Template padrao, ajustado por IA', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  ia:        { label: 'Gerado por IA', classes: 'bg-gray-50 text-gray-500 border-gray-200' },
  vazio:     { label: 'Sem conteudo gerado', classes: 'bg-red-50 text-red-500 border-red-200' },
}

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico: 'Pregao Eletronico',
  pregao_presencial: 'Pregao Presencial',
  concorrencia: 'Concorrencia',
  dispensa: 'Dispensa',
  inexigibilidade: 'Inexigibilidade',
  concurso: 'Concurso',
  leilao: 'Leilao',
  dialogo_competitivo: 'Dialogo Competitivo',
}

export default function BadgeOrigem({ origem, processosReferencia = [] }: Props) {
  const [aberto, setAberto] = useState(false)
  const { label, classes } = LABELS[origem]
  const temRefs = origem === 'aprendida' && processosReferencia.length > 0
  const count = processosReferencia.length

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => temRefs && setAberto(a => !a)}
        className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${classes} ${temRefs ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${origem === 'aprendida' ? 'bg-green-500' : origem === 'template' ? 'bg-amber-400' : 'bg-gray-400'}`} />
        {temRefs ? `${label} (${count})` : label}
      </button>

      {aberto && temRefs && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
          <div className="absolute left-0 top-6 z-20 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Processos usados como referencia</p>
            {processosReferencia.map(p => (
              <a
                key={p.id}
                href={`/processos/${p.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-600 group-hover:underline">
                    #{p.numero_processo ?? p.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-gray-500">{MODALIDADE_LABEL[p.modalidade] ?? p.modalidade}</p>
                  <p className="text-xs text-gray-700 truncate">{p.objeto}</p>
                </div>
                <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-blue-500 shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/processos/novo/badge-origem.tsx
git commit -m "feat(wizard): badge de origem com popover de processos de referencia"
```

---

## Task 7: Etapas do Wizard (1 a 4)

**Files:**
- Create: `src/app/(dashboard)/processos/novo/etapa-identificacao.tsx`
- Create: `src/app/(dashboard)/processos/novo/etapa-objeto.tsx`
- Create: `src/app/(dashboard)/processos/novo/etapa-requisitos.tsx`
- Create: `src/app/(dashboard)/processos/novo/etapa-condicoes.tsx`

- [ ] **Step 1: Criar etapa-identificacao.tsx**

```tsx
// src/app/(dashboard)/processos/novo/etapa-identificacao.tsx
'use client'

import { Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DadosWizard, CategoriaObjeto } from './types'
import type { ModalidadeLicitacao } from '@/types/database'

interface Secretaria { id: string; nome: string; sigla: string | null }

const MODALIDADES: { value: ModalidadeLicitacao; label: string; artigo: string; quando: string; icone: string }[] = [
  { value: 'pregao_eletronico', label: 'Pregao Eletronico', artigo: 'Art. 28', quando: 'Bens e servicos comuns, disputa por menor preco via sistema eletronico', icone: '🖥️' },
  { value: 'concorrencia', label: 'Concorrencia', artigo: 'Art. 29', quando: 'Obras, servicos especiais e contratos de grande vulto', icone: '🏛️' },
  { value: 'dispensa', label: 'Dispensa', artigo: 'Art. 75', quando: 'Hipoteses legais que dispensam licitacao (valor, emergencia, exclusividade)', icone: '⚡' },
  { value: 'inexigibilidade', label: 'Inexigibilidade', artigo: 'Art. 74', quando: 'Fornecedor exclusivo ou notoria especializacao', icone: '🔒' },
  { value: 'pregao_presencial', label: 'Pregao Presencial', artigo: 'Art. 28', quando: 'Idem ao eletronico, com sessao presencial', icone: '🏢' },
  { value: 'concurso', label: 'Concurso', artigo: 'Art. 30', quando: 'Trabalho tecnico, cientifico ou artistico', icone: '🎨' },
  { value: 'leilao', label: 'Leilao', artigo: 'Art. 31', quando: 'Alienacao de bens publicos inservíveis ou apreendidos', icone: '🔨' },
  { value: 'dialogo_competitivo', label: 'Dialogo Competitivo', artigo: 'Art. 32', quando: 'Contratacoes inovadoras ou de alta complexidade tecnica', icone: '💡' },
]

const CATEGORIAS: { value: CategoriaObjeto; label: string }[] = [
  { value: 'informatica', label: 'Equipamentos de Informatica' },
  { value: 'mobiliario', label: 'Mobiliario e Decoracao' },
  { value: 'material_consumo', label: 'Material de Consumo' },
  { value: 'veiculos', label: 'Veiculos e Transporte' },
  { value: 'obras', label: 'Obras e Reformas' },
  { value: 'servicos_continuados', label: 'Servicos Continuados' },
  { value: 'servicos_eventuais', label: 'Servicos Eventuais' },
  { value: 'saude_medicamentos', label: 'Saude e Medicamentos' },
  { value: 'alimentacao', label: 'Alimentacao e Generos' },
  { value: 'outros', label: 'Outros' },
]

function Tooltip({ texto }: { texto: string }) {
  return (
    <div className="group relative inline-block">
      <button type="button" className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-xs font-bold transition-colors">?</button>
      <div className="absolute left-5 top-0 z-10 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg p-2.5 shadow-lg">{texto}</div>
    </div>
  )
}

interface Props {
  dados: DadosWizard
  onChange: (campo: keyof DadosWizard, valor: unknown) => void
  secretarias: Secretaria[]
  expandirModalidades: boolean
  setExpandirModalidades: (v: boolean) => void
}

export default function EtapaIdentificacao({ dados, onChange, secretarias, expandirModalidades, setExpandirModalidades }: Props) {
  const modalidadesVisiveis = expandirModalidades ? MODALIDADES : MODALIDADES.slice(0, 4)
  const modalidadeSelecionada = MODALIDADES.find(m => m.value === dados.modalidade)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Secretaria Requisitante <span className="text-red-500">*</span></Label>
          <Tooltip texto="Qual secretaria ou setor esta solicitando esta contratacao? Sera usada no cabecalho de todos os documentos." />
        </div>
        <Select value={dados.secretaria_id} onValueChange={v => onChange('secretaria_id', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione a secretaria..." /></SelectTrigger>
          <SelectContent>
            {secretarias.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.nome}{s.sigla ? ` (${s.sigla})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Categoria do Objeto <span className="text-red-500">*</span></Label>
          <Tooltip texto="Qual o tipo geral do que sera contratado? Isso ajuda o sistema a pre-preencher especificacoes e normas aplicaveis." />
        </div>
        <Select value={dados.categoria_objeto} onValueChange={v => onChange('categoria_objeto', v as CategoriaObjeto)}>
          <SelectTrigger><SelectValue placeholder="Selecione a categoria..." /></SelectTrigger>
          <SelectContent>
            {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Modalidade de Licitacao <span className="text-red-500">*</span></Label>
          <Tooltip texto="A modalidade define o rito legal do processo. Em caso de duvida, Pregao Eletronico e a mais comum para compras e servicos rotineiros." />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {modalidadesVisiveis.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange('modalidade', m.value)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                dados.modalidade === m.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{m.icone}</span>
                <span className="text-xs font-semibold text-gray-900">{m.label}</span>
              </div>
              <p className="text-xs text-blue-600 font-medium">{m.artigo}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{m.quando}</p>
            </button>
          ))}
        </div>
        {!expandirModalidades && (
          <button type="button" onClick={() => setExpandirModalidades(true)} className="text-xs text-blue-600 hover:underline">
            + Ver outras modalidades
          </button>
        )}
        {modalidadeSelecionada && (
          <div className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
            <Info className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">{modalidadeSelecionada.quando} ({modalidadeSelecionada.artigo} da Lei 14.133/21)</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar etapa-objeto.tsx**

```tsx
// src/app/(dashboard)/processos/novo/etapa-objeto.tsx
'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DadosWizard, ItemWizard } from './types'

const UNIDADES = ['unidade', 'par', 'kit', 'caixa', 'pacote', 'resma', 'litro', 'kg', 'metro', 'metro quadrado', 'servico', 'hora', 'mes']
const PRAZOS = [15, 30, 45, 60, 90, 120, 180, 365]

function Tooltip({ texto }: { texto: string }) {
  return (
    <div className="group relative inline-block">
      <button type="button" className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-xs font-bold transition-colors">?</button>
      <div className="absolute left-5 top-0 z-10 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg p-2.5 shadow-lg">{texto}</div>
    </div>
  )
}

interface Props {
  dados: DadosWizard
  onChange: (campo: keyof DadosWizard, valor: unknown) => void
}

export default function EtapaObjeto({ dados, onChange }: Props) {
  function atualizarItem(idx: number, campo: keyof ItemWizard, valor: string | number) {
    const novos = dados.itens.map((it, i) => i === idx ? { ...it, [campo]: valor } : it)
    onChange('itens', novos)
  }

  function adicionarItem() {
    onChange('itens', [...dados.itens, { descricao: '', unidade: 'unidade', quantidade: 1 }])
  }

  function removerItem(idx: number) {
    onChange('itens', dados.itens.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">O que sera contratado? <span className="text-red-500">*</span></Label>
          <Tooltip texto='Descreva o objeto de forma clara e objetiva. Ex: "Aquisicao de computadores desktop para as escolas municipais". O sistema complementa os detalhes.' />
        </div>
        <Textarea
          value={dados.objeto}
          onChange={e => onChange('objeto', e.target.value)}
          placeholder='Ex: Aquisicao de equipamentos de informatica para a rede municipal de ensino'
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-medium">Itens do objeto</Label>
            <Tooltip texto="Liste os itens especificos. Ex: 20 computadores, 5 impressoras. Isso alimenta a descricao formal dos documentos." />
          </div>
          <button type="button" onClick={adicionarItem} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
            <Plus className="w-3.5 h-3.5" /> Adicionar item
          </button>
        </div>
        {dados.itens.length === 0 && (
          <p className="text-xs text-gray-400 italic">Nenhum item adicionado. Clique em "Adicionar item" para detalhar o objeto.</p>
        )}
        {dados.itens.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
            <Input
              value={item.descricao}
              onChange={e => atualizarItem(idx, 'descricao', e.target.value)}
              placeholder="Descricao do item"
              className="flex-1 text-sm h-8"
            />
            <Input
              type="number"
              min={1}
              value={item.quantidade}
              onChange={e => atualizarItem(idx, 'quantidade', Number(e.target.value))}
              className="w-16 text-sm h-8 text-center"
            />
            <Select value={item.unidade} onValueChange={v => atualizarItem(idx, 'unidade', v)}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
            <button type="button" onClick={() => removerItem(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Por que esta contratacao e necessaria? <span className="text-red-500">*</span></Label>
          <Tooltip texto="Responda as 3 perguntas abaixo de forma objetiva. O sistema monta a justificativa formal completa para o DFD e ETP." />
        </div>
        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
          {[
            { campo: 'problema_atual' as const, label: 'Qual e o problema ou situacao atual?', placeholder: 'Ex: Os computadores atuais tem mais de 8 anos e nao suportam os sistemas educacionais modernos' },
            { campo: 'impacto_sem_contratar' as const, label: 'O que acontece se nao contratar?', placeholder: 'Ex: Interrupcao das atividades pedagogicas que dependem de tecnologia, prejudicando o aprendizado' },
            { campo: 'solucao_proposta' as const, label: 'Qual a solucao proposta?', placeholder: 'Ex: Substituicao dos equipamentos por modelos modernos com capacidade para os softwares educacionais exigidos pelo MEC' },
          ].map(({ campo, label, placeholder }) => (
            <div key={campo} className="p-3 space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">{label}</Label>
              <Textarea
                value={dados[campo]}
                onChange={e => onChange(campo, e.target.value)}
                placeholder={placeholder}
                rows={2}
                className="text-sm resize-none border-0 p-0 focus-visible:ring-0 bg-transparent"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
          Com base nestas respostas, o sistema gera a justificativa completa com linguagem institucional formal.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Prazo esperado para entrega/execucao <span className="text-red-500">*</span></Label>
          <Tooltip texto="Em quantos dias apos a assinatura do contrato o objeto deve ser entregue ou o servico concluido?" />
        </div>
        <div className="flex flex-wrap gap-2">
          {PRAZOS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => onChange('prazo_dias', p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                dados.prazo_dias === p
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {p} dias
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Criar etapa-requisitos.tsx**

```tsx
// src/app/(dashboard)/processos/novo/etapa-requisitos.tsx
'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { DadosWizard, CategoriaObjeto } from './types'

const NORMAS_POR_CATEGORIA: Record<CategoriaObjeto, string[]> = {
  informatica: ['ABNT NBR 16407 (requisitos de sustentabilidade para TI)', 'ABNT NBR ISO 9001 (gestao de qualidade)', 'Portaria INMETRO no 170/2012 (eficiencia energetica)'],
  mobiliario: ['ABNT NBR 13961 (moveis para escritorio)', 'ABNT NBR 13962 (cadeiras de escritorio)', 'ABNT NBR 11900 (moveis escolares)'],
  material_consumo: ['ABNT NBR 15448 (embalagens e acondicionamento)', 'Resolucao ANVISA aplicavel'],
  veiculos: ['Resolucao CONTRAN no 432/2013', 'ABNT NBR 15570 (especificacoes de veiculos)'],
  obras: ['ABNT NBR 6118 (estruturas de concreto)', 'NBR 5626 (instalacoes hidraulicas)', 'NBR 5410 (instalacoes eletricas)'],
  servicos_continuados: ['IN SEGES/ME no 5/2017 (terceirizacao)', 'CLT e legislacao trabalhista aplicavel'],
  servicos_eventuais: ['Legislacao especifica do tipo de servico'],
  saude_medicamentos: ['RDC ANVISA aplicavel', 'Farmacopeia Brasileira', 'Resolucao CFM/CFF aplicavel'],
  alimentacao: ['RDC ANVISA no 216/2004 (boas praticas em servicos de alimentacao)', 'Resolucao CFN aplicavel'],
  outros: [],
}

const SUSTENTABILIDADE_OPCOES = [
  'Preferencia por produtos com certificacao ambiental (ABNT, INMETRO)',
  'Vedacao de materiais com substancias nocivas ao meio ambiente',
  'Exigencia de logistica reversa para descarte de equipamentos',
  'Preferencia por fornecedores com selo de eficiencia energetica',
  'Uso de embalagens reutilizaveis ou biodegradaveis',
  'Reducao de consumo de papel e plastico na execucao',
]

function Tooltip({ texto }: { texto: string }) {
  return (
    <div className="group relative inline-block">
      <button type="button" className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-xs font-bold transition-colors">?</button>
      <div className="absolute left-5 top-0 z-10 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg p-2.5 shadow-lg">{texto}</div>
    </div>
  )
}

interface Props {
  dados: DadosWizard
  onChange: (campo: keyof DadosWizard, valor: unknown) => void
}

export default function EtapaRequisitos({ dados, onChange }: Props) {
  const normasSugeridas = NORMAS_POR_CATEGORIA[dados.categoria_objeto] ?? []

  function toggleNorma(norma: string) {
    const atual = dados.normas_aplicaveis
    onChange('normas_aplicaveis', atual.includes(norma) ? atual.filter(n => n !== norma) : [...atual, norma])
  }

  function toggleSustentabilidade(item: string) {
    const atual = dados.criterios_sustentabilidade
    onChange('criterios_sustentabilidade', atual.includes(item) ? atual.filter(n => n !== item) : [...atual, item])
  }

  return (
    <div className="space-y-6">
      {normasSugeridas.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-medium">Normas e padroes aplicaveis</Label>
            <Tooltip texto="Normas pre-selecionadas para a categoria escolhida. Desmarque se nao se aplicar ao seu caso especifico." />
          </div>
          <div className="space-y-1.5">
            {normasSugeridas.map(norma => (
              <label key={norma} className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={dados.normas_aplicaveis.includes(norma)}
                  onChange={() => toggleNorma(norma)}
                  className="mt-0.5 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{norma}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Especificacoes minimas exigidas <span className="text-red-500">*</span></Label>
          <Tooltip texto='Liste as caracteristicas tecnicas minimas que o produto ou servico deve ter. Ex: "Processador Intel Core i5, 8GB RAM, SSD 256GB". Seja objetivo; o sistema complementa o texto.' />
        </div>
        <Textarea
          value={dados.especificacoes_minimas}
          onChange={e => onChange('especificacoes_minimas', e.target.value)}
          placeholder='Ex: Computador desktop com processador minimo Intel Core i5 de 10a geracao, 8GB de memoria RAM DDR4, SSD de 256GB, monitor de 21", teclado e mouse USB'
          rows={4}
          className="text-sm"
        />
        <p className="text-xs text-gray-400">Quanto mais detalhado, melhor o Termo de Referencia gerado.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Criterios de sustentabilidade</Label>
          <Tooltip texto="Selecione os criterios ambientais aplicaveis. Sao exigidos pela Lei 14.133/21 (art. 11, IV) quando houver alternativas sustentaveis disponiveis no mercado." />
        </div>
        <div className="space-y-1.5">
          {SUSTENTABILIDADE_OPCOES.map(item => (
            <label key={item} className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={dados.criterios_sustentabilidade.includes(item)}
                onChange={() => toggleSustentabilidade(item)}
                className="mt-0.5 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">{item}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Criar etapa-condicoes.tsx**

```tsx
// src/app/(dashboard)/processos/novo/etapa-condicoes.tsx
'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { DadosWizard } from './types'

const FORMAS_PAGAMENTO = [
  { value: '30_dias_medicao', label: '30 dias apos ateste', desc: 'Pagamento em ate 30 dias apos a nota fiscal ser atestada pelo fiscal' },
  { value: 'parcelas_mensais', label: 'Parcelas mensais', desc: 'Para servicos continuados; pagamento mensal proporcional a execucao' },
  { value: 'entrega_unica', label: 'Entrega unica', desc: 'Pagamento integral apos recebimento definitivo do objeto' },
]

const GARANTIAS = [
  { value: 'dispensada', label: 'Dispensada', desc: 'Para contratos de baixo risco ou valor reduzido' },
  { value: '5%', label: '5% do valor', desc: 'Garantia padrao para a maioria dos contratos (art. 96)' },
  { value: '10%', label: '10% do valor', desc: 'Para obras, servicos de grande vulto ou contratos de risco elevado' },
]

const PRAZOS_VIGENCIA = [
  { value: 12, label: '12 meses' },
  { value: 24, label: '24 meses' },
  { value: 36, label: '36 meses' },
  { value: 48, label: '48 meses' },
  { value: 60, label: '60 meses' },
]

function Tooltip({ texto }: { texto: string }) {
  return (
    <div className="group relative inline-block">
      <button type="button" className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-xs font-bold transition-colors">?</button>
      <div className="absolute left-5 top-0 z-10 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg p-2.5 shadow-lg">{texto}</div>
    </div>
  )
}

interface Props {
  dados: DadosWizard
  onChange: (campo: keyof DadosWizard, valor: unknown) => void
}

export default function EtapaCondicoes({ dados, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Valor estimado (R$)</Label>
          <Tooltip texto="Valor estimado da contratacao com base em pesquisa de precos. Pode ser preenchido agora ou apos a cotacao. Usado para definir a garantia e o rito do processo." />
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={dados.valor_estimado ?? ''}
            onChange={e => onChange('valor_estimado', e.target.value ? Number(e.target.value) : null)}
            placeholder="0,00"
            className="pl-9 text-sm"
          />
        </div>
        <p className="text-xs text-gray-400">Opcional nesta fase. Pode ser definido apos a cotacao.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Forma de pagamento <span className="text-red-500">*</span></Label>
          <Tooltip texto="Como o fornecedor sera pago? Isso define a clausula de pagamento no Termo de Referencia." />
        </div>
        <div className="space-y-2">
          {FORMAS_PAGAMENTO.map(f => (
            <label key={f.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${dados.forma_pagamento === f.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
              <input type="radio" name="forma_pagamento" value={f.value} checked={dados.forma_pagamento === f.value} onChange={() => onChange('forma_pagamento', f.value)} className="mt-0.5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">{f.label}</p>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Garantia contratual <span className="text-red-500">*</span></Label>
          <Tooltip texto="Percentual do valor do contrato que o fornecedor deve depositar como garantia de execucao (art. 96 da Lei 14.133/21)." />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {GARANTIAS.map(g => (
            <button
              key={g.value}
              type="button"
              onClick={() => onChange('garantia', g.value)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${dados.garantia === g.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}
            >
              <p className="text-sm font-semibold text-gray-900">{g.label}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{g.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Prazo de vigencia do contrato <span className="text-red-500">*</span></Label>
          <Tooltip texto="Por quanto tempo o contrato ficara em vigor apos a assinatura. Para servicos continuados, normalmente 12 meses renovaveis." />
        </div>
        <div className="flex flex-wrap gap-2">
          {PRAZOS_VIGENCIA.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange('prazo_vigencia_meses', p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${dados.prazo_vigencia_meses === p.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Sancoes administrativas</Label>
          <Tooltip texto="Penalidades aplicaveis em caso de descumprimento. Um texto padrao ja esta pre-preenchido conforme a Lei 14.133/21. Edite apenas se necessario." />
        </div>
        <Textarea
          value={dados.sancoes}
          onChange={e => onChange('sancoes', e.target.value)}
          rows={4}
          className="text-sm"
        />
        <p className="text-xs text-gray-400">Pre-preenchido com o padrao da Lei 14.133/21. Edite apenas se houver especificidade.</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/processos/novo/etapa-identificacao.tsx
git add src/app/(dashboard)/processos/novo/etapa-objeto.tsx
git add src/app/(dashboard)/processos/novo/etapa-requisitos.tsx
git add src/app/(dashboard)/processos/novo/etapa-condicoes.tsx
git commit -m "feat(wizard): etapas 1-4 do wizard inteligente"
```

---

## Task 8: Etapa de Revisao e Selecao de IA

**Files:**
- Create: `src/app/(dashboard)/processos/novo/etapa-revisao.tsx`

- [ ] **Step 1: Criar etapa-revisao.tsx**

```tsx
// src/app/(dashboard)/processos/novo/etapa-revisao.tsx
'use client'

import { AlertTriangle, CheckCircle2, Zap } from 'lucide-react'
import { Label } from '@/components/ui/label'
import type { DadosWizard } from './types'

const MODELOS_IA = [
  {
    value: 'gemini' as const,
    label: 'Gemini Flash (Google)',
    custo: 'R$ 0,00',
    desc: 'Gratuito, sem configuracao adicional',
    badge: 'Recomendado',
    badgeClass: 'bg-green-100 text-green-700',
  },
  {
    value: 'sem_ia' as const,
    label: 'Sem IA (somente templates)',
    custo: 'R$ 0,00',
    desc: 'Mais rapido. Documentos gerados via templates padrao, sem personalizacao.',
    badge: null,
    badgeClass: '',
  },
  {
    value: 'anthropic' as const,
    label: 'Claude Sonnet (Anthropic)',
    custo: 'X creditos',
    desc: 'Requer chave API configurada na organizacao.',
    badge: 'Requer configuracao',
    badgeClass: 'bg-gray-100 text-gray-600',
  },
]

interface Validacao {
  campo: string
  label: string
  ok: boolean
}

function validarDados(dados: DadosWizard): Validacao[] {
  return [
    { campo: 'secretaria_id', label: 'Secretaria requisitante', ok: !!dados.secretaria_id },
    { campo: 'modalidade', label: 'Modalidade de licitacao', ok: !!dados.modalidade },
    { campo: 'categoria_objeto', label: 'Categoria do objeto', ok: !!dados.categoria_objeto },
    { campo: 'objeto', label: 'Descricao do objeto', ok: dados.objeto.length >= 10 },
    { campo: 'problema_atual', label: 'Problema atual', ok: dados.problema_atual.length >= 10 },
    { campo: 'impacto_sem_contratar', label: 'Impacto sem contratar', ok: dados.impacto_sem_contratar.length >= 10 },
    { campo: 'solucao_proposta', label: 'Solucao proposta', ok: dados.solucao_proposta.length >= 10 },
    { campo: 'prazo_dias', label: 'Prazo de entrega', ok: dados.prazo_dias > 0 },
    { campo: 'especificacoes_minimas', label: 'Especificacoes minimas', ok: dados.especificacoes_minimas.length >= 10 },
    { campo: 'forma_pagamento', label: 'Forma de pagamento', ok: !!dados.forma_pagamento },
    { campo: 'garantia', label: 'Garantia contratual', ok: !!dados.garantia },
    { campo: 'prazo_vigencia_meses', label: 'Prazo de vigencia', ok: dados.prazo_vigencia_meses > 0 },
  ]
}

interface Props {
  dados: DadosWizard
  onChange: (campo: keyof DadosWizard, valor: unknown) => void
  onIrParaEtapa: (etapa: number) => void
}

export default function EtapaRevisao({ dados, onChange, onIrParaEtapa }: Props) {
  const validacoes = validarDados(dados)
  const pendentes = validacoes.filter(v => !v.ok)
  const pronto = pendentes.length === 0

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">Verificacao dos dados</h3>
        {pronto ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Todos os dados necessarios foram preenchidos.
          </div>
        ) : (
          <div className="space-y-1.5">
            {pendentes.map(v => (
              <div key={v.campo} className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700 text-sm">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {v.label}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const etapaMap: Record<string, number> = {
                      secretaria_id: 1, modalidade: 1, categoria_objeto: 1,
                      objeto: 2, problema_atual: 2, impacto_sem_contratar: 2, solucao_proposta: 2, prazo_dias: 2,
                      especificacoes_minimas: 3,
                      forma_pagamento: 4, garantia: 4, prazo_vigencia_meses: 4,
                    }
                    onIrParaEtapa(etapaMap[v.campo] ?? 1)
                  }}
                  className="text-xs text-amber-700 underline hover:text-amber-900"
                >
                  Corrigir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Modelo de IA para geracao</Label>
        </div>
        <div className="space-y-2">
          {MODELOS_IA.map(m => (
            <label key={m.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${dados.ia_modelo === m.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
              <input
                type="radio"
                name="ia_modelo"
                value={m.value}
                checked={dados.ia_modelo === m.value}
                onChange={() => onChange('ia_modelo', m.value)}
                className="mt-0.5 text-blue-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900">{m.label}</p>
                  {m.badge && <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${m.badgeClass}`}>{m.badge}</span>}
                  <span className="ml-auto text-sm font-semibold text-gray-700">{m.custo}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {pronto && (
        <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <Zap className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">Pronto para gerar 3 documentos: DFD, ETP e TR</p>
            <p className="text-xs mt-0.5 text-blue-600">Tempo estimado: 10 a 20 segundos. Os documentos serao exibidos para revisao antes de salvar.</p>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/processos/novo/etapa-revisao.tsx
git commit -m "feat(wizard): etapa 5 de revisao e selecao de IA"
```

---

## Task 9: Tela de Documentos Gerados

**Files:**
- Create: `src/app/(dashboard)/processos/novo/tela-documentos-gerados.tsx`

- [ ] **Step 1: Criar tela-documentos-gerados.tsx**

```tsx
// src/app/(dashboard)/processos/novo/tela-documentos-gerados.tsx
'use client'

import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import BadgeOrigem from './badge-origem'
import type { DocumentosGerados, SecaoGerada } from './types'

const LABELS_CAMPOS: Record<string, string> = {
  objeto_dfd: 'Objeto da Demanda',
  justificativa_necessidade: 'Justificativa da Necessidade',
  dotacao_orcamentaria: 'Dotacao Orcamentaria',
  descricao_necessidade: '1. Descricao da Necessidade',
  requisitos_contratacao: '2. Requisitos da Contratacao',
  levantamento_mercado: '3. Levantamento de Mercado',
  justificativa_solucao: '4. Justificativa da Solucao',
  parcelamento: '5. Viabilidade de Parcelamento',
  resultados_pretendidos: '6. Resultados Pretendidos',
  providencias: '7. Providencias Previas',
  objeto_tr: 'Objeto',
  fundamentacao: '1. Fundamentacao',
  modelo_execucao: '2. Modelo de Execucao',
  modelo_gestao: '3. Modelo de Gestao',
  criterios_medicao: '4. Criterios de Medicao',
  forma_pagamento: '5. Forma de Pagamento',
  garantias: '6. Garantias',
  sancoes: '7. Sancoes Administrativas',
}

function SecaoDocumento({
  secao,
  onEditar,
}: {
  secao: SecaoGerada
  onEditar: (tipoCampo: string, novoTexto: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [textoLocal, setTextoLocal] = useState(secao.texto)

  function confirmar() {
    onEditar(secao.tipo_campo, textoLocal)
    setEditando(false)
  }

  function cancelar() {
    setTextoLocal(secao.texto)
    setEditando(false)
  }

  return (
    <div className="space-y-2 pb-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {LABELS_CAMPOS[secao.tipo_campo] ?? secao.tipo_campo}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <BadgeOrigem origem={secao.origem} processosReferencia={secao.processos_referencia} />
          {!editando && (
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Editar secao"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {editando ? (
        <div className="space-y-2">
          <Textarea
            value={textoLocal}
            onChange={e => setTextoLocal(e.target.value)}
            rows={6}
            className="text-sm"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={cancelar} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <X className="w-3 h-3" /> Cancelar
            </button>
            <button type="button" onClick={confirmar} className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Check className="w-3 h-3" /> Confirmar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{secao.texto}</p>
      )}
    </div>
  )
}

interface Props {
  documentos: DocumentosGerados
  onEditar: (doc: 'dfd' | 'etp' | 'tr', tipoCampo: string, novoTexto: string) => void
  onConfirmar: () => void
  onVoltar: () => void
  salvando: boolean
}

export default function TelaDocumentosGerados({ documentos, onEditar, onConfirmar, onVoltar, salvando }: Props) {
  const [abaAtiva, setAbaAtiva] = useState<'dfd' | 'etp' | 'tr'>('dfd')

  const abas: { key: 'dfd' | 'etp' | 'tr'; label: string }[] = [
    { key: 'dfd', label: 'DFD' },
    { key: 'etp', label: 'ETP' },
    { key: 'tr', label: 'TR' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Documentos gerados</h2>
        <p className="text-sm text-gray-500 mt-0.5">Revise o conteudo de cada documento. Edite as secoes se necessario e confirme para criar o processo.</p>
      </div>

      <div className="flex border-b border-gray-200">
        {abas.map(aba => (
          <button
            key={aba.key}
            type="button"
            onClick={() => setAbaAtiva(aba.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              abaAtiva === aba.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 bg-white border border-gray-200 rounded-xl p-5">
        {documentos[abaAtiva].secoes.map(secao => (
          <SecaoDocumento
            key={secao.tipo_campo}
            secao={secao}
            onEditar={(campo, texto) => onEditar(abaAtiva, campo, texto)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onVoltar}
          disabled={salvando}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Reeditar dados
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={salvando}
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {salvando ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
          ) : (
            <><Check className="w-4 h-4" /> Confirmar e criar processo</>
          )}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/processos/novo/tela-documentos-gerados.tsx
git commit -m "feat(wizard): tela de revisao dos documentos gerados em 3 abas"
```

---

## Task 10: Pagina Principal do Wizard

**Files:**
- Modify: `src/app/(dashboard)/processos/novo/page.tsx`

- [ ] **Step 1: Substituir page.tsx**

```tsx
// src/app/(dashboard)/processos/novo/page.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardFooter } from '@/components/ui/card'

import { useEffect } from 'react'
import EtapaIdentificacao from './etapa-identificacao'
import EtapaObjeto from './etapa-objeto'
import EtapaRequisitos from './etapa-requisitos'
import EtapaCondicoes from './etapa-condicoes'
import EtapaRevisao from './etapa-revisao'
import TelaDocumentosGerados from './tela-documentos-gerados'
import { gerarDocumentos } from '@/lib/actions/gerar-documentos'
import { criarProcessoComDocumentos } from '@/lib/actions/processo'
import { listarSecretarias } from '@/lib/actions/secretarias'
import type { DadosWizard, DocumentosGerados } from './types'

const SANCOES_PADRAO = `Pelo descumprimento total ou parcial das obrigacoes contratuais, a contratada ficara sujeita as sancoes previstas nos arts. 155 a 163 da Lei no 14.133/2021, a saber: (i) advertencia; (ii) multa moratoria de 0,5% por dia de atraso sobre o valor do contrato, ate o limite de 10%; (iii) multa compensatoria de 10% sobre o valor total do contrato em caso de inexecucao total; (iv) impedimento de licitar e contratar pelo prazo de ate 3 anos; e (v) declaracao de inidoneidade pelo prazo de ate 6 anos.`

const DADOS_INICIAIS: DadosWizard = {
  secretaria_id: '',
  modalidade: 'pregao_eletronico',
  categoria_objeto: 'outros',
  objeto: '',
  problema_atual: '',
  impacto_sem_contratar: '',
  solucao_proposta: '',
  itens: [],
  prazo_dias: 30,
  normas_aplicaveis: [],
  especificacoes_minimas: '',
  criterios_sustentabilidade: [],
  valor_estimado: null,
  forma_pagamento: '30_dias_medicao',
  garantia: '5%',
  prazo_vigencia_meses: 12,
  sancoes: SANCOES_PADRAO,
  ia_modelo: 'gemini',
  clarificacoes: {},
}

const ETAPAS = [
  { num: 1, label: 'Identificacao' },
  { num: 2, label: 'Objeto' },
  { num: 3, label: 'Requisitos' },
  { num: 4, label: 'Condicoes' },
  { num: 5, label: 'Revisao' },
]

export default function NovoProcessoPage() {
  const router = useRouter()
  const [etapa, setEtapa] = useState(1)
  const [dados, setDados] = useState<DadosWizard>(DADOS_INICIAIS)
  const [secretarias, setSecretarias] = useState<Array<{ id: string; nome: string; sigla: string | null }>>([])
  const [secretariasCarregadas, setSecretariasCarregadas] = useState(false)
  const [expandirModalidades, setExpandirModalidades] = useState(false)
  const [documentosGerados, setDocumentosGerados] = useState<DocumentosGerados | null>(null)
  const [gerando, setGerando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Carrega secretarias na primeira renderizacao
  useEffect(() => {
    listarSecretarias().then(secs => {
      setSecretarias(secs)
      setSecretariasCarregadas(true)
    })
  }, [])

  function onChange(campo: keyof DadosWizard, valor: unknown) {
    setDados(prev => ({ ...prev, [campo]: valor }))
  }

  async function handleGerar() {
    setGerando(true)
    const res = await gerarDocumentos(dados)
    setGerando(false)
    if (!res.success || !res.documentos) {
      toast.error(res.error ?? 'Erro ao gerar documentos.')
      return
    }
    setDocumentosGerados(res.documentos)
  }

  function handleEditarSecao(doc: 'dfd' | 'etp' | 'tr', tipoCampo: string, novoTexto: string) {
    if (!documentosGerados) return
    setDocumentosGerados(prev => {
      if (!prev) return prev
      return {
        ...prev,
        [doc]: {
          secoes: prev[doc].secoes.map(s =>
            s.tipo_campo === tipoCampo ? { ...s, texto: novoTexto } : s
          ),
        },
      }
    })
  }

  function handleConfirmar() {
    if (!documentosGerados) return
    setSalvando(true)
    startTransition(async () => {
      const res = await criarProcessoComDocumentos(dados, documentosGerados)
      setSalvando(false)
      if (!res.success || !res.processoId) {
        toast.error(res.error ?? 'Erro ao criar processo.')
        return
      }
      toast.success('Processo criado com sucesso!')
      router.push(`/processos/${res.processoId}/dfd`)
    })
  }

  if (documentosGerados) {
    return (
      <div className="max-w-3xl mx-auto">
        <TelaDocumentosGerados
          documentos={documentosGerados}
          onEditar={handleEditarSecao}
          onConfirmar={handleConfirmar}
          onVoltar={() => setDocumentosGerados(null)}
          salvando={salvando || isPending}
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Novo Processo Licitatorio</h1>
          <p className="text-sm text-gray-500">Preencha os dados e o sistema gera DFD, ETP e TR automaticamente.</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {ETAPAS.map(({ num, label }, i) => {
          const ativa = num === etapa
          const concluida = num < etapa
          return (
            <div key={num} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all text-xs font-bold ${
                  ativa ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-200' :
                  concluida ? 'bg-green-50 border-green-400 text-green-600' :
                  'bg-white border-gray-200 text-gray-400'
                }`}>
                  {concluida ? '✓' : num}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${ativa ? 'text-blue-700' : concluida ? 'text-green-600' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {i < ETAPAS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-5 rounded-full ${concluida ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-6">
          {etapa === 1 && (
            <EtapaIdentificacao
              dados={dados}
              onChange={onChange}
              secretarias={secretarias}
              expandirModalidades={expandirModalidades}
              setExpandirModalidades={setExpandirModalidades}
            />
          )}
          {etapa === 2 && <EtapaObjeto dados={dados} onChange={onChange} />}
          {etapa === 3 && <EtapaRequisitos dados={dados} onChange={onChange} />}
          {etapa === 4 && <EtapaCondicoes dados={dados} onChange={onChange} />}
          {etapa === 5 && (
            <EtapaRevisao
              dados={dados}
              onChange={onChange}
              onIrParaEtapa={setEtapa}
            />
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl">
          <button
            type="button"
            onClick={etapa === 1 ? () => router.push('/dashboard') : () => setEtapa(e => e - 1)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {etapa === 1 ? <><ArrowLeft className="w-4 h-4" /> Cancelar</> : <><ChevronLeft className="w-4 h-4" /> Voltar</>}
          </button>

          {etapa < 5 ? (
            <button
              type="button"
              onClick={() => setEtapa(e => e + 1)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continuar <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGerar}
              disabled={gerando}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {gerando ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Gerando documentos...</>
              ) : (
                'Gerar Documentos'
              )}
            </button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/processos/novo/page.tsx
git commit -m "feat(wizard): pagina principal do wizard com estado global e navegacao"
```

---

## Task 11: Seed de Clausulas e Gatilho de Aprendizado

**Files:**
- Create: `src/lib/actions/seed-clausulas.ts`
- Modify: `src/app/(dashboard)/processos/[id]/dfd/editor-dfd.tsx`
- Modify: `src/app/(dashboard)/processos/[id]/etp/editor-etp.tsx`
- Modify: `src/app/(dashboard)/processos/[id]/tr/editor-tr.tsx`

- [ ] **Step 1: Criar seed-clausulas.ts**

```typescript
// src/lib/actions/seed-clausulas.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { CLAUSULAS_INICIAIS } from '@/data/clausulas-iniciais'

export async function seedClausulasPadrao(): Promise<{ success: boolean; inseridas: number; error?: string }> {
  const supabase = await createClient()

  const { data: existentes } = await (supabase as any)
    .from('clausulas_padrao')
    .select('id')
    .limit(1)

  if (existentes && existentes.length > 0) {
    return { success: true, inseridas: 0 }
  }

  const { error } = await (supabase as any)
    .from('clausulas_padrao')
    .insert(CLAUSULAS_INICIAIS)

  if (error) return { success: false, inseridas: 0, error: error.message }
  return { success: true, inseridas: CLAUSULAS_INICIAIS.length }
}
```

- [ ] **Step 2: Adicionar gatilho de aprendizado no editor-dfd.tsx**

Localizar a funcao `handleSalvar` em [src/app/(dashboard)/processos/[id]/dfd/editor-dfd.tsx](src/app/(dashboard)/processos/[id]/dfd/editor-dfd.tsx) e adicionar apos o salvamento bem-sucedido:

```typescript
// Adicionar import no topo:
import { registrarAprendizado } from '@/lib/actions/clausulas'

// Dentro de handleSalvar, apos res.success:
if (res.success && dfd.gerado_por_ia) {
  // Registra aprendizado para justificativa se foi editada
  const justificativaAtual = formData.justificativa_necessidade
  if (justificativaAtual && justificativaAtual !== dfd.justificativa_necessidade) {
    await registrarAprendizado({
      organizacaoId: '', // sera preenchido pela action via auth
      processoId: dfd.processo_id,
      documento: 'dfd',
      tipoCampo: 'justificativa_necessidade',
      modalidade: '',
      categoriaObjeto: '',
      textoOriginal: dfd.justificativa_necessidade ?? '',
      textoAprovado: justificativaAtual,
    }).catch(() => {}) // silencioso: aprendizado nao deve bloquear salvamento
  }
}
```

Nota: a action `registrarAprendizado` ja extrai `organizacao_id` via `auth.uid()` internamente. Os campos `modalidade` e `categoriaObjeto` serao buscados do processo pelo server via join. Atualizar a action para aceitar string vazia e buscar do processo:

Em `src/lib/actions/clausulas.ts`, adicionar ao inicio de `registrarAprendizado`:

```typescript
// Busca modalidade e categoria do processo se nao fornecidos
if (!params.modalidade || !params.categoriaObjeto) {
  const { data: proc } = await (supabase as any)
    .from('processos_licitatorios')
    .select('modalidade, categoria_objeto')
    .eq('id', params.processoId)
    .maybeSingle()
  if (proc) {
    params.modalidade = params.modalidade || proc.modalidade || ''
    params.categoriaObjeto = params.categoriaObjeto || proc.categoria_objeto || ''
  }
}
// Busca organizacao_id do usuario se nao fornecido
if (!params.organizacaoId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: u } = await supabase.from('usuarios').select('organizacao_id').eq('id', user.id).maybeSingle()
    if (u) params.organizacaoId = (u as any).organizacao_id
  }
}
```

- [ ] **Step 3: Chamar seed no layout do dashboard**

Adicionar chamada de seed uma unica vez no `src/app/(dashboard)/layout.tsx`, apos a autenticacao. A action ja verifica se dados existem antes de inserir, entao e seguro chamar em cada request:

Em `src/app/(dashboard)/layout.tsx`, adicionar import e chamada:

```typescript
// Adicionar import:
import { seedClausulasPadrao } from '@/lib/actions/seed-clausulas'

// Adicionar dentro de DashboardLayout, apos verificar user:
// Seed silencioso: so insere se tabela estiver vazia
seedClausulasPadrao().catch(() => {})
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/seed-clausulas.ts
git add src/app/(dashboard)/processos/[id]/dfd/editor-dfd.tsx
git commit -m "feat(aprendizado): seed de clausulas e gatilho de aprendizado no editor DFD"
```

---

## Task 12: Build e Verificacao Final

- [ ] **Step 1: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 2: Verificar lint**

```bash
npx eslint src/app/(dashboard)/processos/novo/ src/lib/motor-templates.ts src/lib/actions/clausulas.ts src/lib/actions/gerar-documentos.ts --max-warnings 0
```

- [ ] **Step 3: Build local**

```bash
npx next build
```

Esperado: build completo sem erros. Verificar que a rota `/processos/novo` compila.

- [ ] **Step 4: Verificacao manual**

1. Acessar `/processos/novo`
2. Preencher etapa 1: selecionar secretaria, categoria "Informatica", modalidade "Pregao Eletronico"
3. Preencher etapa 2: objeto, 3 sub-perguntas de justificativa, adicionar 1 item
4. Preencher etapa 3: verificar normas pre-selecionadas para informatica, preencher especificacoes
5. Preencher etapa 4: selecionar forma de pagamento e garantia
6. Etapa 5: verificar que todos os campos estao marcados como OK, selecionar "Sem IA"
7. Clicar "Gerar Documentos"
8. Verificar que as 3 abas DFD, ETP e TR aparecem com conteudo
9. Editar uma secao e confirmar
10. Clicar "Confirmar e criar processo"
11. Verificar redirecionamento para `/processos/[id]/dfd` com conteudo pre-preenchido

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat(wizard): wizard inteligente completo com geracao automatica de DFD, ETP e TR"
```

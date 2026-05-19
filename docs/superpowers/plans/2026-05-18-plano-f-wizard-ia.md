# Plano F: Wizard do Requisitante com IA por Campo e Geracao Simultânea

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atualizar o wizard do Requisitante para: (1) adicionar botao "Melhorar com IA" em cada campo de texto individualmente, usando `claude-sonnet-4-5`; (2) ao finalizar, gerar DFD, ETP e TR simultaneamente via `claude-opus-4-7`; (3) incluir cotacao no wizard com aviso amarelo nao bloqueante se nao preenchida; (4) permitir edicao livre e adicao de campos extras em cada documento gerado antes do envio.

**Architecture:** O wizard existente em `app/(dashboard)/processos/[id]/` sera estendido. O botao de IA por campo e um Client Component reutilizavel que chama uma Server Action de streaming. A geracao simultanea dos 3 documentos usa `Promise.all` com chamadas separadas ao Claude. O sinal de pendencia de cotacao e gravado na tabela `processos_licitatorios`. Dependencia: Plano A (novos papeis) deve estar aplicado.

**Tech Stack:** Anthropic Claude API (`claude-sonnet-4-5` para campos, `claude-opus-4-7` para documentos), Next.js 14 Server Actions com streaming, react-hook-form + Zod, shadcn/ui (Textarea, Badge, Alert)

---

## Mapeamento de Arquivos

| Arquivo | Acao | O que muda |
|---------|------|-----------|
| `src/components/ai/botao-melhorar-campo.tsx` | Criar | Botao de IA por campo, com streaming e reversao |
| `src/lib/ai/prompts/melhorar-campo.ts` | Criar | Prompt para melhoria de campo individual |
| `src/lib/ai/prompts/gerar-dfd.ts` | Criar ou atualizar | Prompt de geracao do DFD |
| `src/lib/ai/prompts/gerar-etp.ts` | Criar ou atualizar | Prompt de geracao do ETP |
| `src/lib/ai/prompts/gerar-tr.ts` | Criar ou atualizar | Prompt de geracao do TR |
| `src/lib/actions/ai-campos.ts` | Criar | Server Action de melhoria de campo via streaming |
| `src/lib/actions/gerar-documentos.ts` | Criar ou atualizar | Server Action de geracao simultanea dos 3 documentos |
| `src/app/(dashboard)/processos/[id]/dfd/page.tsx` | Modificar | Integra botao IA nos campos + secao de revisao pos-geracao |
| `src/app/(dashboard)/processos/[id]/etp/page.tsx` | Modificar | Idem |
| `src/app/(dashboard)/processos/[id]/tr/page.tsx` | Modificar | Idem |
| `src/app/api/ai/melhorar-campo/route.ts` | Criar | Route Handler com streaming para o botao de IA por campo |

---

### Task 1: Prompt de melhoria de campo individual

**Files:**
- Create: `src/lib/ai/prompts/melhorar-campo.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// src/lib/ai/prompts/melhorar-campo.ts
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
- Nao use travessao (em dash) — use virgulas ou ponto e virgula
- Responda APENAS com o texto melhorado, sem explicacoes, sem prefacios, sem aspas externas
</formato_saida>`
}
```

- [ ] **Step 2: Commitar**

```bash
git add src/lib/ai/prompts/melhorar-campo.ts
git commit -m "feat(ai): cria prompt de melhoria de campo individual"
```

---

### Task 2: Route Handler de streaming para melhoria de campo

**Files:**
- Create: `src/app/api/ai/melhorar-campo/route.ts`

O streaming via Route Handler e necessario para dar feedback visual ao usuario enquanto a IA escreve a resposta.

- [ ] **Step 1: Criar o arquivo**

```typescript
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildPromptMelhorarCampo, type ContextoCampo } from '@/lib/ai/prompts/melhorar-campo'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  // Verifica autenticacao
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Nao autorizado', { status: 401 })
  }

  // Verifica saldo de creditos (busca usuario)
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuario) return new Response('Nao autorizado', { status: 401 })

  let ctx: ContextoCampo
  try {
    ctx = await req.json()
  } catch {
    return new Response('Payload invalido', { status: 400 })
  }

  if (!ctx.textoAtual || ctx.textoAtual.trim().length === 0) {
    return new Response('Texto vazio nao pode ser melhorado', { status: 400 })
  }

  const prompt = buildPromptMelhorarCampo(ctx)

  // Streaming com ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let textoCompleto = ''

      try {
        const response = await anthropic.messages.stream({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        })

        for await (const chunk of response) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text
            textoCompleto += text
            controller.enqueue(encoder.encode(text))
          }
        }

        // Registra uso na tabela acoes_ia (sem bloquear o stream)
        await (supabase as any).from('acoes_ia').insert({
          usuario_id: usuario.id,
          organizacao_id: usuario.organizacao_id,
          tipo_acao: 'aprimorar_texto',
          modelo: 'claude-sonnet-4-5',
          input_resumo: ctx.textoAtual.slice(0, 200),
          output_resumo: textoCompleto.slice(0, 200),
          tokens_input: Math.ceil(prompt.length / 4),
          tokens_output: Math.ceil(textoCompleto.length / 4),
        }).catch(() => {}) // Nao falha o streaming por causa do log

        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "melhorar-campo" | head -10
```

Expected: zero erros.

- [ ] **Step 3: Commitar**

```bash
git add src/app/api/ai/melhorar-campo/route.ts
git commit -m "feat(api): cria Route Handler de streaming para melhoria de campo com Claude Sonnet"
```

---

### Task 3: Componente `BotaoMelhorarCampo`

**Files:**
- Create: `src/components/ai/botao-melhorar-campo.tsx`

Este componente e reutilizavel. Qualquer campo de texto no wizard pode incluir este botao passando o texto atual e um callback para atualizar o valor.

- [ ] **Step 1: Criar o componente**

```typescript
'use client'

import { useState, useRef } from 'react'
import { Sparkles, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { ContextoCampo } from '@/lib/ai/prompts/melhorar-campo'

interface BotaoMelhorarCampoProps {
  textoAtual: string
  contexto: Omit<ContextoCampo, 'textoAtual'>
  onTextMelhorado: (novoTexto: string) => void
  className?: string
}

export function BotaoMelhorarCampo({
  textoAtual,
  contexto,
  onTextMelhorado,
  className = '',
}: BotaoMelhorarCampoProps) {
  const [melhorando, setMelhorando] = useState(false)
  const [textoAnterior, setTextoAnterior] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function handleMelhorar() {
    if (!textoAtual.trim()) {
      toast.error('Escreva algo no campo antes de melhorar com IA.')
      return
    }

    setTextoAnterior(textoAtual)
    setMelhorando(true)
    onTextMelhorado('') // Limpa o campo para mostrar o streaming

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/ai/melhorar-campo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contexto, textoAtual }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || 'Erro ao chamar a IA.')
      }

      if (!res.body) throw new Error('Sem resposta da IA.')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let textoAcumulado = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        textoAcumulado += decoder.decode(value, { stream: true })
        onTextMelhorado(textoAcumulado)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      toast.error(err instanceof Error ? err.message : 'Erro ao melhorar o texto.')
      if (textoAnterior !== null) onTextMelhorado(textoAnterior)
    } finally {
      setMelhorando(false)
    }
  }

  function handleReverter() {
    if (textoAnterior !== null) {
      onTextMelhorado(textoAnterior)
      setTextoAnterior(null)
    }
  }

  return (
    <div className={`flex gap-1.5 items-center ${className}`}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleMelhorar}
        disabled={melhorando}
        className="h-7 px-2 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5"
        aria-label="Melhorar texto com IA"
      >
        {melhorando
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <Sparkles className="w-3 h-3" />
        }
        {melhorando ? 'Melhorando...' : 'Melhorar com IA'}
      </Button>

      {textoAnterior !== null && !melhorando && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleReverter}
          className="h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          aria-label="Reverter texto original"
        >
          <RotateCcw className="w-3 h-3" />
          Reverter
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "botao-melhorar" | head -10
```

Expected: zero erros.

- [ ] **Step 3: Commitar**

```bash
git add src/components/ai/botao-melhorar-campo.tsx
git commit -m "feat(ui): cria BotaoMelhorarCampo com streaming e opcao de reverter"
```

---

### Task 4: Prompts de geracao dos 3 documentos

**Files:**
- Create: `src/lib/ai/prompts/gerar-documentos-simultaneos.ts`

Consolida os prompts de geracao do DFD, ETP e TR em um unico arquivo, usados na geracao simultanea ao finalizar o wizard.

- [ ] **Step 1: Criar o arquivo**

```typescript
// src/lib/ai/prompts/gerar-documentos-simultaneos.ts
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
- Nao use travessao (em dash) — use virgulas ou ponto e virgula
- Nao use placeholders como "[PREENCHER]", "[INSERIR]", "[DATA]" — se o dado nao foi fornecido, omita o trecho ou use linguagem generica adequada
`

export function buildPromptDFD(dados: DadosWizard): string {
  return `${CABECALHO_LEGAL}

<tarefa>Gere o Documento de Formalizacao da Demanda (DFD) conforme o Art. 6°, X da Lei 14.133/21.</tarefa>

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
3. Justificativa da necessidade: por que a contratacao e necessaria (Art. 6°, X, 'a')
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
O ETP deve conter os elementos do Art. 18, § 1°:
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

<tarefa>Gere o Termo de Referencia (TR) conforme o Art. 6°, XXIII da Lei 14.133/21.</tarefa>

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
O TR deve conter os elementos do Art. 6°, XXIII:
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
Nao deixe seccoes genericas — adapte cada uma ao objeto real informado.
</formato_saida>`
}
```

- [ ] **Step 2: Commitar**

```bash
git add src/lib/ai/prompts/gerar-documentos-simultaneos.ts
git commit -m "feat(ai): cria prompts de geracao simultanea de DFD, ETP e TR"
```

---

### Task 5: Server Action de geracao simultanea

**Files:**
- Create: `src/lib/actions/gerar-documentos-wizard.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import {
  buildPromptDFD,
  buildPromptETP,
  buildPromptTR,
  type DadosWizard
} from '@/lib/ai/prompts/gerar-documentos-simultaneos'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface DocumentosGerados {
  dfd: string
  etp: string
  tr: string
}

interface ResultadoGeracao {
  success: boolean
  documentos?: DocumentosGerados
  error?: string
}

async function gerarTextoDocumento(prompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })
  const primeiroBloco = response.content[0]
  if (primeiroBloco.type !== 'text') return ''
  return primeiroBloco.text
}

/**
 * Gera DFD, ETP e TR simultaneamente ao finalizar o wizard.
 * Usa claude-opus-4-7 para documentos completos.
 * Debita 3 unidades de credito por chamada (uma por documento).
 */
export async function gerarDocumentosWizard(
  processoId: string,
  dados: DadosWizard
): Promise<ResultadoGeracao> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, organizacao_id, papel')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuario) return { success: false, error: 'Usuario nao encontrado.' }
  if (usuario.papel !== 'requisitante' && usuario.papel !== 'setor_compras'
    && usuario.papel !== 'admin_organizacao' && usuario.papel !== 'admin_plataforma') {
    return { success: false, error: 'Sem permissao para gerar documentos.' }
  }

  // Gera os 3 documentos em paralelo
  let documentos: DocumentosGerados
  try {
    const [dfd, etp, tr] = await Promise.all([
      gerarTextoDocumento(buildPromptDFD(dados)),
      gerarTextoDocumento(buildPromptETP(dados)),
      gerarTextoDocumento(buildPromptTR(dados)),
    ])
    documentos = { dfd, etp, tr }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro na geracao com IA.'
    return { success: false, error: msg }
  }

  // Registra uso na tabela acoes_ia (3 chamadas)
  const logsIA = [
    { tipo: 'gerar_documento', documento: 'dfd', output: documentos.dfd },
    { tipo: 'gerar_documento', documento: 'etp', output: documentos.etp },
    { tipo: 'gerar_documento', documento: 'tr', output: documentos.tr },
  ]

  await Promise.all(logsIA.map(log =>
    (supabase as any).from('acoes_ia').insert({
      usuario_id: usuario.id,
      organizacao_id: usuario.organizacao_id,
      tipo_acao: log.tipo,
      modelo: 'claude-opus-4-7',
      input_resumo: dados.objeto.slice(0, 200),
      output_resumo: log.output.slice(0, 200),
      tokens_input: 0, // Atualizar quando SDK retornar usage
      tokens_output: Math.ceil(log.output.length / 4),
    }).catch(() => {})
  ))

  return { success: true, documentos }
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "gerar-documentos" | head -10
```

Expected: zero erros.

- [ ] **Step 3: Commitar**

```bash
git add src/lib/actions/gerar-documentos-wizard.ts
git commit -m "feat(actions): cria Server Action de geracao simultanea de DFD+ETP+TR via Claude Opus"
```

---

### Task 6: Componente de aviso de cotacao pendente

**Files:**
- Create: `src/components/processo/aviso-cotacao-pendente.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface AvisoCotacaoPendenteProps {
  processoId: string
}

export function AvisoCotacaoPendente({ processoId }: AvisoCotacaoPendenteProps) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border px-4 py-3"
      style={{
        background: '#FFFBEB',
        borderColor: '#FCD34D',
      }}
      role="alert"
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#B45309' }} />
      <div className="text-sm" style={{ color: '#92400E' }}>
        <strong>Cotacao nao preenchida.</strong>{' '}
        O processo sera encaminhado sem cotacao. Voce pode{' '}
        <Link
          href={`/processos/${processoId}/cotacao`}
          className="font-semibold underline"
          style={{ color: '#B45309' }}
        >
          preencher a cotacao
        </Link>
        {' '}antes de enviar, mas isso nao e obrigatorio para continuar.
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commitar**

```bash
git add src/components/processo/aviso-cotacao-pendente.tsx
git commit -m "feat(ui): cria componente AvisoCotacaoPendente (aviso amarelo nao bloqueante)"
```

---

### Task 7: Adicionar `cotacao_pendente` ao processo

Para sinalizar que a cotacao nao foi preenchida, adicionamos um campo booleano ao processo.

**Files:**
- Create: `supabase/migrations/20260518000008_cotacao_pendente.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Criar migration**

```sql
-- supabase/migrations/20260518000008_cotacao_pendente.sql
-- ============================================================
-- Adiciona flag de cotacao pendente ao processo
-- Conforme spec: cotacao nao bloqueante mas sinalizada com aviso amarelo
-- ============================================================

ALTER TABLE processos_licitatorios
  ADD COLUMN IF NOT EXISTS cotacao_pendente boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Atualizar `ProcessoLicitatorioRow` em `src/types/database.ts`**

Adicionar o campo a interface:
```typescript
export interface ProcessoLicitatorioRow {
  // ... campos existentes ...
  cotacao_pendente: boolean  // <-- adicionar
}
```

- [ ] **Step 3: Commitar**

```bash
git add supabase/migrations/20260518000008_cotacao_pendente.sql src/types/database.ts
git commit -m "feat(db): adiciona cotacao_pendente ao processo licitatorio"
```

---

### Task 8: Integracao do BotaoMelhorarCampo em um campo de exemplo (DFD)

Esta task mostra o padrao de integracao. O mesmo padrao deve ser aplicado em ETP e TR.

**Files:**
- Modify: `src/app/(dashboard)/processos/[id]/dfd/page.tsx`

- [ ] **Step 1: Ler o arquivo atual**

```bash
cat "src/app/(dashboard)/processos/[id]/dfd/page.tsx"
```

- [ ] **Step 2: Adicionar o botao de IA no campo de justificativa**

Localizar o campo `justificativa_necessidade` (ou equivalente) no componente do formulario DFD.

Padrao de integracao para campos controlados por `react-hook-form`:

```typescript
// No topo do componente Client Component do formulario DFD, adicionar o import:
import { BotaoMelhorarCampo } from '@/components/ai/botao-melhorar-campo'

// No render, apos cada campo de texto longo, adicionar:
// (exemplo para o campo 'justificativa_necessidade')
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <Label htmlFor="justificativa_necessidade">
      Justificativa da Necessidade
    </Label>
    <BotaoMelhorarCampo
      textoAtual={watch('justificativa_necessidade') ?? ''}
      contexto={{
        nomeCampo: 'Justificativa da Necessidade',
        documentoContexto: 'DFD — Documento de Formalizacao da Demanda',
        artigo: 'Art. 6°, X, alínea "a" da Lei 14.133/21',
        dadosProcesso: {
          objeto: watch('objeto'),
          modalidade: processo.modalidade,
          valorEstimado: processo.valor_estimado ?? undefined,
          municipio: organizacao.municipio,
        },
      }}
      onTextMelhorado={texto => setValue('justificativa_necessidade', texto)}
    />
  </div>
  <Textarea
    id="justificativa_necessidade"
    {...register('justificativa_necessidade')}
    rows={6}
    placeholder="Descreva a necessidade que originou esta demanda..."
  />
</div>
```

- [ ] **Step 3: Adicionar o aviso de cotacao pendente antes do botao de envio**

No formulario DFD, antes do botao "Enviar para Compras":

```typescript
{processo.cotacao_pendente && (
  <AvisoCotacaoPendente processoId={processo.id} />
)}
```

Importar `AvisoCotacaoPendente` de `@/components/processo/aviso-cotacao-pendente`.

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "dfd" | head -10
```

Expected: zero erros.

- [ ] **Step 5: Commitar**

```bash
git add "src/app/(dashboard)/processos/[id]/dfd/page.tsx"
git commit -m "feat(ui): integra BotaoMelhorarCampo e aviso de cotacao pendente no formulario DFD"
```

---

### Task 9: Verificacao final

- [ ] **Step 1: Tipos completos**

```bash
npx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 2: Build**

```bash
npm run build 2>&1 | tail -20
```

Expected: build sem erros.

- [ ] **Step 3: Lint**

```bash
npx eslint src/components/ai/ src/lib/ai/ src/lib/actions/gerar-documentos-wizard.ts src/app/api/ai/ --ext .ts,.tsx --max-warnings 0
```

Expected: zero warnings.

---

## Notas para o implementador

- O streaming do `BotaoMelhorarCampo` usa `fetch` nativo — nao usa o SDK da Anthropic no cliente. O SDK fica apenas no servidor (Route Handler).
- A variavel `ANTHROPIC_API_KEY` deve existir em `.env.local`. Verificar antes de testar.
- O `claude-opus-4-7` para geracao de documentos pode demorar 30-60 segundos por documento. O `Promise.all` dos 3 gera em paralelo, mas o tempo total ainda pode ser 30-60s. Adicionar feedback visual (spinner ou barra de progresso) na pagina que aguarda a geracao.
- O `BotaoMelhorarCampo` limpa o campo ao iniciar o streaming (`onTextMelhorado('')`). Isso e intencional para mostrar o texto sendo gerado progressivamente. O usuario pode reverter se nao gostar.
- A integracao em ETP e TR (pages) segue exatamente o mesmo padrao da Task 8. Nao repetido aqui por DRY, mas o implementador deve aplicar em todos os campos de texto longo dos 3 documentos.
- O `cotacao_pendente` deve ser atualizado na action de finalizacao do wizard: se o usuario nao preencheu a cotacao, setar `cotacao_pendente = true` no processo antes de gerar os documentos.

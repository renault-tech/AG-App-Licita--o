# IA Observabilidade, Rate Limiting Adaptativo e Pipeline RAG

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir contagem de tokens no wrapper de IA, adicionar rate limiting adaptativo via Supabase, pipeline de lookup de clausulas antes de chamar a IA, e dashboard de observabilidade com graficos interativos por periodo.

**Architecture:** Quatro subsistemas independentes e deployaveis de forma incremental: (1) fix de tokens reais no wrapper, (2) rate limiter com sliding window no Supabase, (3) lookup de clausulas aprendidas via full-text search do Postgres, (4) dashboard admin + painel usuario com Recharts. Nenhum servico externo novo. Zero custo adicional.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase Postgres (full-text search nativo, pg_trgm), Recharts (graficos), Vitest (testes), shadcn/ui Dialog (expansao de graficos).

---

## Mapa de Arquivos

**Criar:**
- `supabase/migrations/20260519000002_ia_tokens_reais_ratelimit.sql`
- `src/lib/ai/rate-limiter.ts`
- `src/lib/ai/clausulas-lookup.ts`
- `src/lib/ai/__tests__/rate-limiter.test.ts`
- `src/lib/ai/__tests__/clausulas-lookup.test.ts`
- `src/app/(dashboard)/admin/observabilidade/page.tsx`
- `src/app/(dashboard)/admin/observabilidade/components/filtros.tsx`
- `src/app/(dashboard)/admin/observabilidade/components/grafico-tokens.tsx`
- `src/app/(dashboard)/admin/observabilidade/components/grafico-economia.tsx`
- `src/app/(dashboard)/admin/observabilidade/components/painel-anomalias.tsx`
- `vitest.config.ts`

**Modificar:**
- `src/types/database.ts` — adicionar campos novos em AcaoIARow + novas interfaces
- `src/lib/ai/wrapper.ts` — capturar tokens reais, wiring rate limiter e clausulas-lookup
- `src/app/(dashboard)/admin/sidebar-admin.tsx` — link para Observabilidade
- `src/app/(dashboard)/configuracoes/ia/page.tsx` — adicionar aba de monitoramento pessoal

---

## Task 1: Migration SQL e tipos TypeScript

**Files:**
- Create: `supabase/migrations/20260519000002_ia_tokens_reais_ratelimit.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Criar arquivo de migration**

```sql
-- supabase/migrations/20260519000002_ia_tokens_reais_ratelimit.sql

-- 1. Colunas de token real em acoes_ia
ALTER TABLE acoes_ia
  ADD COLUMN IF NOT EXISTS tokens_entrada_real integer,
  ADD COLUMN IF NOT EXISTS tokens_saida_real   integer,
  ADD COLUMN IF NOT EXISTS chars_entrada        integer,
  ADD COLUMN IF NOT EXISTS chars_saida          integer;

-- Migrar valores existentes para chars (retrocompatibilidade)
UPDATE acoes_ia
SET chars_entrada = tokens_entrada,
    chars_saida   = tokens_saida
WHERE chars_entrada IS NULL;

-- 2. Rate limiting
CREATE TABLE IF NOT EXISTS rate_limit_configs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  uuid REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  escopo          text NOT NULL CHECK (escopo IN ('org','user','global')),
  perfil          text NOT NULL CHECK (perfil IN ('conservador','padrao','intenso','personalizado')) DEFAULT 'padrao',
  max_chamadas    integer NOT NULL DEFAULT 60,
  janela_segundos integer NOT NULL DEFAULT 3600,
  modo            text NOT NULL CHECK (modo IN ('fixo','adaptativo')) DEFAULT 'adaptativo',
  ativo           boolean DEFAULT true,
  criado_em       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limit_janelas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave          text NOT NULL,
  chamadas       integer DEFAULT 0,
  janela_inicio  timestamptz NOT NULL,
  ultimo_ip      text,
  ips_detectados text[] DEFAULT '{}',
  anomalia_flag  boolean DEFAULT false,
  atualizado_em  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_janelas_chave
  ON rate_limit_janelas (chave, janela_inicio);

-- 3. Registro de reuso de clausulas
CREATE TABLE IF NOT EXISTS clausulas_aplicadas (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id       uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  clausula_id          uuid REFERENCES clausulas_aprendidas(id) ON DELETE SET NULL,
  processo_id          uuid REFERENCES processos_licitatorios(id) ON DELETE SET NULL,
  acao_ia_id           uuid REFERENCES acoes_ia(id) ON DELETE SET NULL,
  tokens_economizados  integer DEFAULT 0,
  modo                 text CHECK (modo IN ('contexto','validacao')),
  criado_em            timestamptz DEFAULT now()
);

-- 4. Full-text search em clausulas_aprendidas
ALTER TABLE clausulas_aprendidas
  ADD COLUMN IF NOT EXISTS busca_tsvector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('portuguese',
        coalesce(texto_aprovado, '') || ' ' ||
        coalesce(tipo_campo, '') || ' ' ||
        coalesce(categoria_objeto, '')
      )
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_clausulas_tsvector
  ON clausulas_aprendidas USING GIN (busca_tsvector);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_clausulas_trgm
  ON clausulas_aprendidas USING GIN (texto_aprovado gin_trgm_ops);

-- 5. RLS
ALTER TABLE rate_limit_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_janelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clausulas_aplicadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limit_configs_org" ON rate_limit_configs
  FOR ALL USING (
    organizacao_id IN (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- janelas: acesso via service role apenas (server-side)
CREATE POLICY "rate_limit_janelas_service" ON rate_limit_janelas
  FOR ALL USING (true);

CREATE POLICY "clausulas_aplicadas_org" ON clausulas_aplicadas
  FOR ALL USING (
    organizacao_id IN (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );
```

- [ ] **Step 2: Aplicar migration no Supabase**

```bash
# Via Supabase CLI (se instalado):
npx supabase db push

# Ou aplicar manualmente no SQL Editor do painel Supabase.
# Verificar que nao ha erros antes de continuar.
```

- [ ] **Step 3: Atualizar AcaoIARow e adicionar novas interfaces em src/types/database.ts**

Localizar a interface `AcaoIARow` (linha ~365) e substituir por:

```typescript
export interface AcaoIARow {
  id: string
  created_at: string
  usuario_id: string
  organizacao_id: string
  processo_id: string | null
  tipo_acao: TipoAcaoIA
  provedor: string
  modelo: string
  tokens_entrada: number          // legado: chars — mantido para retrocompatibilidade
  tokens_saida: number            // legado: chars
  tokens_entrada_real: number | null
  tokens_saida_real: number | null
  chars_entrada: number | null
  chars_saida: number | null
  creditos_consumidos: number
  input_resumo: string | null
  sucesso: boolean
  erro_mensagem: string | null
}
```

Adicionar apos `AcaoIARow`, antes da proxima interface:

```typescript
export interface RateLimitConfigRow {
  id: string
  organizacao_id: string | null
  usuario_id: string | null
  escopo: 'org' | 'user' | 'global'
  perfil: 'conservador' | 'padrao' | 'intenso' | 'personalizado'
  max_chamadas: number
  janela_segundos: number
  modo: 'fixo' | 'adaptativo'
  ativo: boolean
  criado_em: string
}

export interface RateLimitJanelaRow {
  id: string
  chave: string
  chamadas: number
  janela_inicio: string
  ultimo_ip: string | null
  ips_detectados: string[]
  anomalia_flag: boolean
  atualizado_em: string
}

export interface ClausulaAplicadaRow {
  id: string
  organizacao_id: string
  clausula_id: string | null
  processo_id: string | null
  acao_ia_id: string | null
  tokens_economizados: number
  modo: 'contexto' | 'validacao' | null
  criado_em: string
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260519000002_ia_tokens_reais_ratelimit.sql src/types/database.ts
git commit -m "feat(ia): migration tokens reais, rate limiting e clausulas aplicadas"
```

---

## Task 2: Fix do wrapper.ts (tokens reais)

**Files:**
- Modify: `src/lib/ai/wrapper.ts`

- [ ] **Step 1: Adicionar variaveis de token real e capturar resposta completa**

Substituir o bloco de declaracoes (linhas 80-84) e o bloco try/catch de geracao (linhas 86-110):

**Antes (linhas 80-110):**
```typescript
  const temperature = params.temperature ?? 0.3
  let texto = ''
  let sucesso = false
  let erroMensagem: string | null = null
  let creditosDebitar = 1

  try {
    const res = await gerarTextoIA({
      prompt: params.prompt,
      temperature,
      provider: providerOverride,
    })
    texto = res.text
    sucesso = true
  } catch (err) {
    const envProvider = (process.env.AI_PROVIDER ?? 'gemini') as AIProvider
    if (providerOverride && providerOverride !== envProvider) {
      try {
        const res = await gerarTextoIA({ prompt: params.prompt, temperature, provider: envProvider })
        texto = res.text
        sucesso = true
      } catch (err2) {
        erroMensagem = err2 instanceof Error ? err2.message : 'Falha de comunicação com o provedor de IA.'
        creditosDebitar = 0
      }
    } else {
      erroMensagem = err instanceof Error ? err.message : 'Falha de comunicação com o provedor de IA.'
      creditosDebitar = 0
    }
  }
```

**Depois:**
```typescript
  const temperature = params.temperature ?? 0.3
  let texto = ''
  let sucesso = false
  let erroMensagem: string | null = null
  let creditosDebitar = 1
  let tokensEntradaReal: number | null = null
  let tokensSaidaReal: number | null = null

  try {
    const res = await gerarTextoIA({
      prompt: params.prompt,
      temperature,
      provider: providerOverride,
    })
    texto = res.text
    tokensEntradaReal = res.tokensIn
    tokensSaidaReal = res.tokensOut
    sucesso = true
  } catch (err) {
    const envProvider = (process.env.AI_PROVIDER ?? 'gemini') as AIProvider
    if (providerOverride && providerOverride !== envProvider) {
      try {
        const res = await gerarTextoIA({ prompt: params.prompt, temperature, provider: envProvider })
        texto = res.text
        tokensEntradaReal = res.tokensIn
        tokensSaidaReal = res.tokensOut
        sucesso = true
      } catch (err2) {
        erroMensagem = err2 instanceof Error ? err2.message : 'Falha de comunicação com o provedor de IA.'
        creditosDebitar = 0
      }
    } else {
      erroMensagem = err instanceof Error ? err.message : 'Falha de comunicação com o provedor de IA.'
      creditosDebitar = 0
    }
  }
```

- [ ] **Step 2: Atualizar o insert em acoes_ia para incluir tokens reais**

Substituir o bloco de insert (linhas 113-129):

**Antes:**
```typescript
  ;(supabase as any)
    .from('acoes_ia')
    .insert({
      usuario_id: user.id,
      organizacao_id: organizacaoId,
      processo_id: params.processoId ?? null,
      tipo_acao: params.tipoAcao,
      provedor: providerUsado,
      modelo: modeloUsado,
      tokens_entrada: params.prompt.length,
      tokens_saida: texto.length,
      creditos_consumidos: creditosDebitar,
      input_resumo: params.prompt.substring(0, 100),
      sucesso,
      erro_mensagem: erroMensagem,
    } satisfies Omit<AcaoIARow, 'id' | 'created_at'>)
    .then(() => {})
```

**Depois:**
```typescript
  ;(supabase as any)
    .from('acoes_ia')
    .insert({
      usuario_id: user.id,
      organizacao_id: organizacaoId,
      processo_id: params.processoId ?? null,
      tipo_acao: params.tipoAcao,
      provedor: providerUsado,
      modelo: modeloUsado,
      tokens_entrada: params.prompt.length,
      tokens_saida: texto.length,
      chars_entrada: params.prompt.length,
      chars_saida: texto.length,
      tokens_entrada_real: tokensEntradaReal,
      tokens_saida_real: tokensSaidaReal,
      creditos_consumidos: creditosDebitar,
      input_resumo: params.prompt.substring(0, 100),
      sucesso,
      erro_mensagem: erroMensagem,
    } satisfies Omit<AcaoIARow, 'id' | 'created_at'>)
    .then(() => {})
```

- [ ] **Step 3: Verificar tipos**

```bash
cd "d:/Documentos/Projetos IA/Licita AI/AG-App-Licita--o/AG-App-Licita--o"
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/wrapper.ts
git commit -m "fix(ia): registrar tokens reais de entrada e saida no acoes_ia"
```

---

## Task 3: Instalar Vitest e configurar

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Instalar dependencias de teste**

```bash
cd "d:/Documentos/Projetos IA/Licita AI/AG-App-Licita--o/AG-App-Licita--o"
npm install -D vitest @vitest/coverage-v8
```

- [ ] **Step 2: Criar vitest.config.ts na raiz do projeto**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 3: Adicionar script de test no package.json**

No campo `"scripts"` do `package.json`, adicionar:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verificar que vitest funciona**

```bash
npx vitest run --reporter=verbose
```

Esperado: `No test files found` (ainda sem testes). Nao deve dar erro de configuracao.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: setup vitest para testes unitarios"
```

---

## Task 4: Rate Limiter

**Files:**
- Create: `src/lib/ai/rate-limiter.ts`
- Create: `src/lib/ai/__tests__/rate-limiter.test.ts`
- Modify: `src/lib/ai/wrapper.ts`

- [ ] **Step 1: Criar src/lib/ai/rate-limiter.ts**

```typescript
import { createClient } from '@/lib/supabase/server'

export interface RateLimitResult {
  permitido: boolean
  chamadasRestantes: number
  anomalia: boolean
  resetEm: Date
}

const LIMITE_PADRAO = 60
const JANELA_PADRAO_SEG = 3600

export async function verificarRateLimit(
  orgId: string,
  userId: string,
  ip: string
): Promise<RateLimitResult> {
  const supabase = await createClient()
  const chave = `${orgId}:${userId}`
  const agora = new Date()

  try {
    const { data: configRaw } = await (supabase as any)
      .from('rate_limit_configs')
      .select('max_chamadas, janela_segundos, modo, perfil')
      .eq('ativo', true)
      .or(`organizacao_id.eq.${orgId},usuario_id.eq.${userId}`)
      .order('escopo')
      .limit(1)
      .maybeSingle()

    type Config = { max_chamadas: number; janela_segundos: number; modo: string }
    const config = configRaw as Config | null
    let maxChamadas = config?.max_chamadas ?? LIMITE_PADRAO
    const janelaSeg = config?.janela_segundos ?? JANELA_PADRAO_SEG
    const janelaDuracaoMs = janelaSeg * 1000
    const janelaInicio = new Date(agora.getTime() - janelaDuracaoMs)

    const { data: janelaRaw } = await (supabase as any)
      .from('rate_limit_janelas')
      .select('id, chamadas, ips_detectados, anomalia_flag, janela_inicio')
      .eq('chave', chave)
      .gte('janela_inicio', janelaInicio.toISOString())
      .order('janela_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()

    type Janela = {
      id: string
      chamadas: number
      ips_detectados: string[]
      anomalia_flag: boolean
      janela_inicio: string
    }

    let janela = janelaRaw as Janela | null

    if (!janela) {
      const { data: nova } = await (supabase as any)
        .from('rate_limit_janelas')
        .insert({
          chave,
          chamadas: 0,
          janela_inicio: agora.toISOString(),
          ips_detectados: [ip],
          ultimo_ip: ip,
        })
        .select('id, chamadas, ips_detectados, anomalia_flag, janela_inicio')
        .single()
      janela = nova as Janela | null
    }

    if (!janela) {
      return { permitido: true, chamadasRestantes: maxChamadas, anomalia: false, resetEm: new Date(agora.getTime() + janelaDuracaoMs) }
    }

    const ipsUnicos = Array.from(new Set([...janela.ips_detectados, ip]))
    const anomalia = ipsUnicos.length > 2

    if (anomalia && config?.modo === 'adaptativo') {
      maxChamadas = Math.floor(maxChamadas * 0.5)
    }

    const resetEm = new Date(new Date(janela.janela_inicio).getTime() + janelaDuracaoMs)
    const permitido = janela.chamadas < maxChamadas
    const chamadasRestantes = Math.max(0, maxChamadas - janela.chamadas)

    ;(supabase as any)
      .from('rate_limit_janelas')
      .update({
        chamadas: janela.chamadas + 1,
        ultimo_ip: ip,
        ips_detectados: ipsUnicos,
        anomalia_flag: anomalia,
        atualizado_em: agora.toISOString(),
      })
      .eq('id', janela.id)
      .then(() => {})

    return { permitido, chamadasRestantes, anomalia, resetEm }
  } catch {
    // fail open: nunca bloquear por falha de infraestrutura
    return {
      permitido: true,
      chamadasRestantes: LIMITE_PADRAO,
      anomalia: false,
      resetEm: new Date(agora.getTime() + JANELA_PADRAO_SEG * 1000),
    }
  }
}
```

- [ ] **Step 2: Escrever teste em src/lib/ai/__tests__/rate-limiter.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { verificarRateLimit } from '../rate-limiter'

function buildSupabaseMock(janelaExistente: {
  id: string
  chamadas: number
  ips_detectados: string[]
  anomalia_flag: boolean
  janela_inicio: string
} | null = null) {
  const insertResult = { data: { id: 'j1', chamadas: 0, ips_detectados: ['1.1.1.1'], anomalia_flag: false, janela_inicio: new Date().toISOString() }, error: null }
  const updateChain = { eq: vi.fn().mockReturnValue({ then: vi.fn() }) }
  const insertChain = { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(insertResult) }) }
  const janelaSelectChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: janelaExistente }),
            }),
          }),
        }),
      }),
    }),
  }
  const configSelectChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
      }),
    }),
  }

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'rate_limit_configs') return configSelectChain
      if (table === 'rate_limit_janelas') {
        return {
          ...janelaSelectChain,
          insert: vi.fn().mockReturnValue(insertChain),
          update: vi.fn().mockReturnValue(updateChain),
        }
      }
      return {}
    }),
  }
}

describe('verificarRateLimit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('permite requisicao quando nao ha janela previa (cria nova)', async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock(null) as any)
    const result = await verificarRateLimit('org1', 'user1', '1.1.1.1')
    expect(result.permitido).toBe(true)
  })

  it('bloqueia quando chamadas >= maxChamadas padrao', async () => {
    const janelaCheia = {
      id: 'j1',
      chamadas: 60,
      ips_detectados: ['1.1.1.1'],
      anomalia_flag: false,
      janela_inicio: new Date().toISOString(),
    }
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock(janelaCheia) as any)
    const result = await verificarRateLimit('org1', 'user1', '1.1.1.1')
    expect(result.permitido).toBe(false)
    expect(result.chamadasRestantes).toBe(0)
  })

  it('detecta anomalia com 3 IPs distintos', async () => {
    const janelaComIPs = {
      id: 'j1',
      chamadas: 10,
      ips_detectados: ['1.1.1.1', '2.2.2.2'],
      anomalia_flag: false,
      janela_inicio: new Date().toISOString(),
    }
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock(janelaComIPs) as any)
    const result = await verificarRateLimit('org1', 'user1', '3.3.3.3')
    expect(result.anomalia).toBe(true)
  })

  it('retorna fail open quando Supabase lanca excecao', async () => {
    vi.mocked(createClient).mockRejectedValue(new Error('Supabase indisponivel'))
    const result = await verificarRateLimit('org1', 'user1', '1.1.1.1')
    expect(result.permitido).toBe(true)
  })
})
```

- [ ] **Step 3: Rodar teste para verificar que passa**

```bash
cd "d:/Documentos/Projetos IA/Licita AI/AG-App-Licita--o/AG-App-Licita--o"
npx vitest run src/lib/ai/__tests__/rate-limiter.test.ts --reporter=verbose
```

Esperado: 4 testes passando.

- [ ] **Step 4: Wiring do rate limiter no wrapper.ts**

Adicionar ao topo do arquivo, apos os imports existentes:

```typescript
import { headers } from 'next/headers'
import { verificarRateLimit } from './rate-limiter'
```

Inserir bloco de rate limiting logo apos obter `organizacaoId` (apos linha 41, antes do bloco de creditos):

```typescript
  // Rate limiting: verificar antes de qualquer chamada a IA
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
  const rateLimit = await verificarRateLimit(organizacaoId, user.id, ip)
  if (!rateLimit.permitido) {
    return {
      success: false,
      error: `Limite de chamadas de IA atingido. Tente novamente apos ${rateLimit.resetEm.toLocaleTimeString('pt-BR')}.`,
    }
  }
```

- [ ] **Step 5: Verificar tipos e commit**

```bash
npx tsc --noEmit
git add src/lib/ai/rate-limiter.ts src/lib/ai/__tests__/rate-limiter.test.ts src/lib/ai/wrapper.ts
git commit -m "feat(ia): rate limiter adaptativo com sliding window no Supabase"
```

---

## Task 5: Pipeline de Lookup de Clausulas

**Files:**
- Create: `src/lib/ai/clausulas-lookup.ts`
- Create: `src/lib/ai/__tests__/clausulas-lookup.test.ts`
- Modify: `src/lib/ai/wrapper.ts`

- [ ] **Step 1: Criar src/lib/ai/clausulas-lookup.ts**

```typescript
import { createClient } from '@/lib/supabase/server'

export interface ClausulaEncontrada {
  id: string
  tipo_campo: string
  texto_aprovado: string
  score_qualidade: number
  uso_count: number
}

export interface LookupResult {
  clausulas: ClausulaEncontrada[]
  cobertura: number
  tokensEstimadosEconomizados: number
  modo: 'contexto' | 'validacao' | 'none'
}

export async function buscarClausulasRelevantes(
  orgId: string,
  documento: 'dfd' | 'etp' | 'tr',
  modalidade: string,
  categoriaObjeto: string,
  camposNecessarios: string[]
): Promise<LookupResult> {
  if (camposNecessarios.length === 0) {
    return { clausulas: [], cobertura: 0, tokensEstimadosEconomizados: 0, modo: 'none' }
  }

  const supabase = await createClient()

  try {
    const { data: exatosRaw } = await (supabase as any)
      .from('clausulas_aprendidas')
      .select('id, tipo_campo, texto_aprovado, score_qualidade, uso_count')
      .eq('organizacao_id', orgId)
      .eq('documento', documento)
      .eq('modalidade', modalidade)
      .in('tipo_campo', camposNecessarios)
      .order('score_qualidade', { ascending: false })
      .order('uso_count', { ascending: false })

    const exatos = (exatosRaw ?? []) as ClausulaEncontrada[]
    const camposComMatch = new Set(exatos.map((c: ClausulaEncontrada) => c.tipo_campo))
    const camposSemMatch = camposNecessarios.filter(c => !camposComMatch.has(c))

    const extras: ClausulaEncontrada[] = []
    if (camposSemMatch.length > 0 && categoriaObjeto.trim()) {
      const queryFTS = categoriaObjeto.trim().split(/\s+/).join(' & ')
      const { data: ftsRaw } = await (supabase as any)
        .from('clausulas_aprendidas')
        .select('id, tipo_campo, texto_aprovado, score_qualidade, uso_count')
        .eq('organizacao_id', orgId)
        .eq('documento', documento)
        .in('tipo_campo', camposSemMatch)
        .textSearch('busca_tsvector', queryFTS, { config: 'portuguese' })
        .order('score_qualidade', { ascending: false })
        .limit(camposSemMatch.length)
      extras.push(...((ftsRaw ?? []) as ClausulaEncontrada[]))
    }

    // Deduplicar por tipo_campo (score mais alto vence)
    const porCampo = new Map<string, ClausulaEncontrada>()
    for (const c of [...exatos, ...extras]) {
      const atual = porCampo.get(c.tipo_campo)
      if (!atual || c.score_qualidade > atual.score_qualidade) {
        porCampo.set(c.tipo_campo, c)
      }
    }
    const clausulasFinais = Array.from(porCampo.values())

    const cobertura = clausulasFinais.length / camposNecessarios.length

    const { count } = await (supabase as any)
      .from('clausulas_aprendidas')
      .select('id', { count: 'exact', head: true })
      .eq('organizacao_id', orgId)

    const orgMadura = (count ?? 0) >= 50
    const modo: 'validacao' | 'contexto' | 'none' =
      cobertura >= 0.8 && orgMadura ? 'validacao' :
      cobertura >= 0.3 ? 'contexto' : 'none'

    const tokensEstimadosEconomizados =
      modo === 'validacao' ? clausulasFinais.length * 200 :
      modo === 'contexto' ? clausulasFinais.length * 50 : 0

    return { clausulas: clausulasFinais, cobertura, tokensEstimadosEconomizados, modo }
  } catch {
    return { clausulas: [], cobertura: 0, tokensEstimadosEconomizados: 0, modo: 'none' }
  }
}

export function injetarClausulasNoPrompt(prompt: string, lookup: LookupResult): string {
  if (lookup.modo === 'none' || lookup.clausulas.length === 0) return prompt

  const contexto = lookup.clausulas
    .map(c => `[${c.tipo_campo}]: ${c.texto_aprovado}`)
    .join('\n\n')

  const instrucao = lookup.modo === 'validacao'
    ? 'Use os textos abaixo como base. Valide e ajuste apenas o necessario para conformidade legal:'
    : 'Use os textos abaixo como referencia de estilo e conteudo para esta organizacao:'

  return `${instrucao}\n\n${contexto}\n\n---\n\n${prompt}`
}
```

- [ ] **Step 2: Escrever teste em src/lib/ai/__tests__/clausulas-lookup.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { buscarClausulasRelevantes, injetarClausulasNoPrompt } from '../clausulas-lookup'

const clausulaFixture = {
  id: 'c1',
  tipo_campo: 'objeto',
  texto_aprovado: 'Aquisicao de materiais de escritorio',
  score_qualidade: 0.9,
  uso_count: 5,
}

function buildMock(clausulas: typeof clausulaFixture[], count = 10) {
  const queryChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      textSearch: vi.fn().mockResolvedValue({ data: [] }),
      then: vi.fn(),
    }),
  }

  // Simular retorno diferente para cada chamada
  let callIndex = 0
  return {
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockImplementation((fields: string, opts?: any) => {
        if (opts?.count === 'exact') {
          return {
            eq: vi.fn().mockResolvedValue({ count }),
          }
        }
        callIndex++
        return {
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: callIndex === 1 ? clausulas : [] }),
            }),
          }),
          textSearch: vi.fn().mockResolvedValue({ data: [] }),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [] }),
        }
      }),
    })),
  }
}

describe('buscarClausulasRelevantes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna none quando camposNecessarios e vazio', async () => {
    vi.mocked(createClient).mockResolvedValue({} as any)
    const result = await buscarClausulasRelevantes('org1', 'dfd', 'pregao', 'material', [])
    expect(result.modo).toBe('none')
    expect(result.cobertura).toBe(0)
  })

  it('retorna fail open quando Supabase lanca excecao', async () => {
    vi.mocked(createClient).mockRejectedValue(new Error('DB error'))
    const result = await buscarClausulasRelevantes('org1', 'dfd', 'pregao', 'material', ['objeto'])
    expect(result.modo).toBe('none')
    expect(result.clausulas).toHaveLength(0)
  })
})

describe('injetarClausulasNoPrompt', () => {
  it('retorna prompt original quando modo none', () => {
    const lookup = { clausulas: [], cobertura: 0, tokensEstimadosEconomizados: 0, modo: 'none' as const }
    expect(injetarClausulasNoPrompt('meu prompt', lookup)).toBe('meu prompt')
  })

  it('injeta clausulas no inicio do prompt quando modo contexto', () => {
    const lookup = {
      clausulas: [clausulaFixture],
      cobertura: 0.5,
      tokensEstimadosEconomizados: 50,
      modo: 'contexto' as const,
    }
    const resultado = injetarClausulasNoPrompt('meu prompt', lookup)
    expect(resultado).toContain('Aquisicao de materiais de escritorio')
    expect(resultado).toContain('meu prompt')
  })
})
```

- [ ] **Step 3: Rodar testes**

```bash
npx vitest run src/lib/ai/__tests__/clausulas-lookup.test.ts --reporter=verbose
```

Esperado: 4 testes passando.

- [ ] **Step 4: Adicionar suporte a lookup no RequestIA e wiring no wrapper.ts**

Em `src/lib/ai/wrapper.ts`, adicionar ao import:

```typescript
import { buscarClausulasRelevantes, injetarClausulasNoPrompt } from './clausulas-lookup'
```

Expandir a interface `RequestIA`:

```typescript
export interface RequestIA {
  prompt: string
  tipoAcao: TipoAcaoIA
  processoId?: string
  temperature?: number
  // Campos opcionais para lookup de clausulas aprendidas
  documentoTipo?: 'dfd' | 'etp' | 'tr'
  modalidade?: string
  categoriaObjeto?: string
  camposNecessarios?: string[]
}
```

Inserir bloco de lookup apos o bloco de rate limiting (antes do bloco de creditos), dentro de `executarIAComCreditos`:

```typescript
  // Lookup de clausulas aprendidas: enriquecer prompt quando disponivel
  let promptFinal = params.prompt
  let lookupModo: string = 'none'
  if (params.documentoTipo && params.camposNecessarios) {
    const lookup = await buscarClausulasRelevantes(
      organizacaoId,
      params.documentoTipo,
      params.modalidade ?? '',
      params.categoriaObjeto ?? '',
      params.camposNecessarios
    )
    promptFinal = injetarClausulasNoPrompt(params.prompt, lookup)
    lookupModo = lookup.modo
  }
```

E nas chamadas a `gerarTextoIA`, substituir `params.prompt` por `promptFinal`:

```typescript
    const res = await gerarTextoIA({
      prompt: promptFinal,
      temperature,
      provider: providerOverride,
    })
```

```typescript
        const res = await gerarTextoIA({ prompt: promptFinal, temperature, provider: envProvider })
```

- [ ] **Step 5: Verificar tipos e commit**

```bash
npx tsc --noEmit
git add src/lib/ai/clausulas-lookup.ts src/lib/ai/__tests__/clausulas-lookup.test.ts src/lib/ai/wrapper.ts
git commit -m "feat(ia): pipeline de lookup de clausulas aprendidas com full-text search"
```

---

## Task 6: Dashboard /admin/observabilidade

**Files:**
- Create: `src/app/(dashboard)/admin/observabilidade/page.tsx`
- Create: `src/app/(dashboard)/admin/observabilidade/components/filtros.tsx`
- Create: `src/app/(dashboard)/admin/observabilidade/components/grafico-tokens.tsx`
- Create: `src/app/(dashboard)/admin/observabilidade/components/grafico-economia.tsx`
- Create: `src/app/(dashboard)/admin/observabilidade/components/painel-anomalias.tsx`
- Modify: `src/app/(dashboard)/admin/sidebar-admin.tsx`

- [ ] **Step 1: Instalar recharts**

```bash
npm install recharts
npm install -D @types/recharts
```

- [ ] **Step 2: Criar componente de filtros (Client Component)**

```typescript
// src/app/(dashboard)/admin/observabilidade/components/filtros.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const PERIODOS = [
  { valor: 'dia', label: 'Hoje' },
  { valor: 'semana', label: 'Semana' },
  { valor: 'mes', label: 'Mes' },
  { valor: '90d', label: '90 dias' },
]

export default function FiltrosObservabilidade() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const periodoAtual = searchParams.get('periodo') ?? 'semana'

  function navegar(periodo: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('periodo', periodo)
    router.push(`/admin/observabilidade?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {PERIODOS.map(p => (
        <button
          key={p.valor}
          onClick={() => navegar(p.valor)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            periodoAtual === p.valor
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Criar GraficoTokens (Client Component com Dialog para expansao)**

```typescript
// src/app/(dashboard)/admin/observabilidade/components/grafico-tokens.tsx
'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface PontoTokens {
  label: string
  entrada: number
  saida: number
  total: number
}

interface Props {
  dados: PontoTokens[]
  titulo: string
}

export default function GraficoTokens({ dados, titulo }: Props) {
  const [expandido, setExpandido] = useState(false)

  const Chart = ({ altura }: { altura: number }) => (
    <ResponsiveContainer width="100%" height={altura}>
      <LineChart data={dados} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value: number) => [value.toLocaleString('pt-BR'), '']}
          labelStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="entrada" name="Entrada" stroke="#4f46e5" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="saida" name="Saida" stroke="#7c3aed" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="total" name="Total" stroke="#1A365D" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )

  return (
    <>
      <div
        className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-gray-300 transition-colors"
        onClick={() => setExpandido(true)}
        title="Clique para expandir"
      >
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{titulo}</p>
        <Chart altura={180} />
        <p className="text-[10px] text-gray-400 mt-2 text-right">Clique para expandir</p>
      </div>

      {expandido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setExpandido(false)}>
          <div
            className="bg-white rounded-2xl p-6 w-[90vw] max-w-4xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-800">{titulo}</p>
              <button onClick={() => setExpandido(false)} className="text-gray-400 hover:text-gray-600 text-sm">
                Fechar
              </button>
            </div>
            <Chart altura={400} />
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Criar GraficoEconomia (Client Component)**

```typescript
// src/app/(dashboard)/admin/observabilidade/components/grafico-economia.tsx
'use client'

import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface PontoEconomia {
  label: string
  consumidos: number
  economizados: number
}

interface Props {
  dados: PontoEconomia[]
}

export default function GraficoEconomia({ dados }: Props) {
  const [expandido, setExpandido] = useState(false)

  const Chart = ({ altura }: { altura: number }) => (
    <ResponsiveContainer width="100%" height={altura}>
      <AreaChart data={dados} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => [v.toLocaleString('pt-BR'), '']} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="consumidos" name="Tokens consumidos" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} />
        <Area type="monotone" dataKey="economizados" name="Tokens economizados" stroke="#22c55e" fill="#dcfce7" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )

  return (
    <>
      <div
        className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-gray-300 transition-colors"
        onClick={() => setExpandido(true)}
        title="Clique para expandir"
      >
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Economia por Clausulas Aprendidas</p>
        <Chart altura={180} />
        <p className="text-[10px] text-gray-400 mt-2 text-right">Clique para expandir</p>
      </div>

      {expandido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setExpandido(false)}>
          <div
            className="bg-white rounded-2xl p-6 w-[90vw] max-w-4xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-800">Economia por Clausulas Aprendidas</p>
              <button onClick={() => setExpandido(false)} className="text-gray-400 hover:text-gray-600 text-sm">Fechar</button>
            </div>
            <Chart altura={400} />
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 5: Criar PainelAnomalias (Client Component)**

```typescript
// src/app/(dashboard)/admin/observabilidade/components/painel-anomalias.tsx
'use client'

import { AlertTriangle } from 'lucide-react'

interface Anomalia {
  chave: string
  ips_detectados: string[]
  chamadas: number
  atualizado_em: string
}

interface Props {
  anomalias: Anomalia[]
}

export default function PainelAnomalias({ anomalias }: Props) {
  if (anomalias.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Anomalias de Acesso</p>
        <p className="text-sm text-gray-400">Nenhuma anomalia detectada no periodo.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-amber-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
          {anomalias.length} anomalia{anomalias.length > 1 ? 's' : ''} detectada{anomalias.length > 1 ? 's' : ''}
        </p>
      </div>
      <div className="space-y-2">
        {anomalias.map((a, i) => (
          <div key={i} className="flex items-start justify-between text-xs border-t border-gray-100 pt-2">
            <div>
              <p className="text-gray-700 font-medium">Usuario/Org: {a.chave}</p>
              <p className="text-gray-500">{a.chamadas} chamadas de {a.ips_detectados.length} IPs distintos</p>
            </div>
            <p className="text-gray-400 shrink-0 ml-4">
              {new Date(a.atualizado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Criar page.tsx do /admin/observabilidade (Server Component)**

```typescript
// src/app/(dashboard)/admin/observabilidade/page.tsx
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import FiltrosObservabilidade from './components/filtros'
import GraficoTokens from './components/grafico-tokens'
import GraficoEconomia from './components/grafico-economia'
import PainelAnomalias from './components/painel-anomalias'

type Periodo = 'dia' | 'semana' | 'mes' | '90d'

function calcularInicio(periodo: Periodo): Date {
  const agora = new Date()
  const mapa: Record<Periodo, number> = {
    dia: 24 * 60 * 60 * 1000,
    semana: 7 * 24 * 60 * 60 * 1000,
    mes: 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
  }
  return new Date(agora.getTime() - mapa[periodo])
}

function agruparPorPeriodo(
  registros: Array<{ created_at: string; tokens_entrada_real: number | null; tokens_saida_real: number | null }>,
  periodo: Periodo
) {
  const formato: Record<Periodo, Intl.DateTimeFormatOptions> = {
    dia: { hour: '2-digit', minute: '2-digit' },
    semana: { weekday: 'short', day: '2-digit' },
    mes: { day: '2-digit', month: 'short' },
    '90d': { day: '2-digit', month: 'short' },
  }
  const granularidade: Record<Periodo, number> = {
    dia: 60 * 60 * 1000,        // 1 hora
    semana: 24 * 60 * 60 * 1000, // 1 dia
    mes: 24 * 60 * 60 * 1000,
    '90d': 7 * 24 * 60 * 60 * 1000, // 1 semana
  }

  const buckets = new Map<string, { entrada: number; saida: number; total: number }>()

  for (const r of registros) {
    const ts = new Date(r.created_at)
    const bucket = new Date(Math.floor(ts.getTime() / granularidade[periodo]) * granularidade[periodo])
    const label = bucket.toLocaleDateString('pt-BR', formato[periodo])
    const atual = buckets.get(label) ?? { entrada: 0, saida: 0, total: 0 }
    const entrada = r.tokens_entrada_real ?? 0
    const saida = r.tokens_saida_real ?? 0
    buckets.set(label, { entrada: atual.entrada + entrada, saida: atual.saida + saida, total: atual.total + entrada + saida })
  }

  return Array.from(buckets.entries()).map(([label, v]) => ({ label, ...v }))
}

export default async function ObservabilidadePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  if (!['admin_plataforma'].includes((usuarioData as any)?.papel ?? '')) redirect('/dashboard')

  const sp = await searchParams
  const periodo = (sp.periodo ?? 'semana') as Periodo
  const inicio = calcularInicio(periodo)

  const [acoesRaw, economiaRaw, anomaliasRaw] = await Promise.all([
    (supabase as any)
      .from('acoes_ia')
      .select('created_at, tokens_entrada_real, tokens_saida_real')
      .gte('created_at', inicio.toISOString())
      .order('created_at'),

    (supabase as any)
      .from('clausulas_aplicadas')
      .select('created_at, tokens_economizados')
      .gte('created_at', inicio.toISOString()),

    (supabase as any)
      .from('rate_limit_janelas')
      .select('chave, ips_detectados, chamadas, atualizado_em')
      .eq('anomalia_flag', true)
      .gte('atualizado_em', inicio.toISOString())
      .order('atualizado_em', { ascending: false })
      .limit(20),
  ])

  const acoes = (acoesRaw.data ?? []) as Array<{ created_at: string; tokens_entrada_real: number | null; tokens_saida_real: number | null }>
  const dadosTokens = agruparPorPeriodo(acoes, periodo)

  // Agrupa economia por periodo
  const economia = (economiaRaw.data ?? []) as Array<{ created_at: string; tokens_economizados: number }>
  const mapEconomia = new Map<string, number>()
  for (const e of economia) {
    const label = new Date(e.created_at).toLocaleDateString('pt-BR')
    mapEconomia.set(label, (mapEconomia.get(label) ?? 0) + e.tokens_economizados)
  }
  const dadosEconomia = dadosTokens.map(p => ({
    label: p.label,
    consumidos: p.total,
    economizados: mapEconomia.get(p.label) ?? 0,
  }))

  const anomalias = (anomaliasRaw.data ?? []) as Array<{ chave: string; ips_detectados: string[]; chamadas: number; atualizado_em: string }>

  // KPIs
  const totalTokens = acoes.reduce((s, r) => s + (r.tokens_entrada_real ?? 0) + (r.tokens_saida_real ?? 0), 0)
  const totalEconomizados = economia.reduce((s, e) => s + e.tokens_economizados, 0)
  const taxaEconomia = totalTokens > 0 ? Math.round((totalEconomizados / (totalTokens + totalEconomizados)) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Observabilidade de IA</h1>
          <p className="text-sm text-gray-500 mt-0.5">Consumo de tokens, economia por clausulas e anomalias de acesso.</p>
        </div>
        <Suspense>
          <FiltrosObservabilidade />
        </Suspense>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Tokens consumidos', valor: totalTokens.toLocaleString('pt-BR'), cor: 'text-gray-900' },
          { label: 'Tokens economizados', valor: totalEconomizados.toLocaleString('pt-BR'), cor: 'text-green-700' },
          { label: 'Taxa de economia', valor: `${taxaEconomia}%`, cor: 'text-blue-700' },
          { label: 'Anomalias detectadas', valor: String(anomalias.length), cor: anomalias.length > 0 ? 'text-amber-600' : 'text-gray-900' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.cor}`}>{kpi.valor}</p>
          </div>
        ))}
      </div>

      {/* Graficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GraficoTokens dados={dadosTokens} titulo="Tokens por Periodo" />
        <GraficoEconomia dados={dadosEconomia} />
      </div>

      <PainelAnomalias anomalias={anomalias} />
    </div>
  )
}
```

- [ ] **Step 7: Adicionar link Observabilidade no sidebar-admin.tsx**

Localizar o array `NAV` em `src/app/(dashboard)/admin/sidebar-admin.tsx` e adicionar apos o item `ia`:

```typescript
  {
    href: '/admin/observabilidade',
    label: 'Observabilidade',
    icon: BarChart2,   // adicionar BarChart2 ao import de lucide-react
    tooltip: 'Graficos de consumo de tokens, economia por clausulas aprendidas e anomalias de rate limiting.',
  },
```

Adicionar `BarChart2` ao import de lucide-react:

```typescript
import {
  LayoutDashboard, BookOpen, Bot, Building2, Users,
  HelpCircle, Settings2, Coins, BarChart2,
} from 'lucide-react'
```

- [ ] **Step 8: Verificar build e commit**

```bash
npx tsc --noEmit
npx next build 2>&1 | tail -20
git add src/app/(dashboard)/admin/observabilidade/ src/app/(dashboard)/admin/sidebar-admin.tsx package.json package-lock.json
git commit -m "feat(admin): dashboard de observabilidade de IA com graficos e rate limit"
```

---

## Task 7: Expansao de /configuracoes/ia (painel usuario)

**Files:**
- Modify: `src/app/(dashboard)/configuracoes/ia/page.tsx`

A pagina ja existe com selecao de provedor para admins. Adicionar bloco de monitoramento pessoal visivel para todos os usuarios autenticados (nao so admins).

- [ ] **Step 1: Adicionar busca de uso pessoal e bloco de monitoramento**

A pagina atual tem um `if (!['admin_organizacao', 'admin_plataforma'].includes(usuario.papel)) redirect('/dashboard')` que bloqueia usuarios comuns. Mudar para mostrar pagina simplificada para todos, e secao de configuracao de provedor apenas para admins.

Substituir o conteudo completo de `src/app/(dashboard)/configuracoes/ia/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { ExternalLink, Zap, Info, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import FormConfigIA from './form-config-ia'

const PROVEDORES = [
  {
    id: 'gemini',
    nome: 'Google Gemini Flash',
    gratis: true,
    keyVar: 'GEMINI_API_KEY',
    link: 'https://aistudio.google.com/app/apikey',
    linkLabel: 'Obter chave no Google AI Studio',
    passos: [
      'Acesse aistudio.google.com',
      'Faca login com sua conta Google',
      'Clique em "Get API key" e depois "Create API key"',
      'Copie a chave gerada',
      'Abra o arquivo .env.local na raiz do projeto',
      'Adicione: GEMINI_API_KEY=sua_chave_aqui',
      'Reinicie o servidor (npm run dev)',
    ],
  },
  {
    id: 'groq',
    nome: 'Groq (LLaMA 3.3 70B)',
    gratis: true,
    keyVar: 'GROQ_API_KEY',
    link: 'https://console.groq.com/keys',
    linkLabel: 'Obter chave no Groq Console',
    passos: [
      'Acesse console.groq.com e crie uma conta gratuita',
      'Clique em "API Keys" e depois "Create API Key"',
      'Copie a chave gerada',
      'Adicione ao .env.local: GROQ_API_KEY=sua_chave_aqui',
      'Reinicie o servidor (npm run dev)',
    ],
  },
  {
    id: 'anthropic',
    nome: 'Anthropic Claude',
    gratis: false,
    keyVar: 'ANTHROPIC_API_KEY',
    link: 'https://console.anthropic.com/',
    linkLabel: 'Obter chave no Anthropic Console',
    passos: [
      'Acesse console.anthropic.com e crie uma conta',
      'Adicione credito de uso (plano pago)',
      'Va em "API Keys" e crie uma nova chave',
      'Adicione ao .env.local: ANTHROPIC_API_KEY=sua_chave_aqui',
      'Reinicie o servidor (npm run dev)',
    ],
  },
  {
    id: 'openrouter',
    nome: 'OpenRouter',
    gratis: false,
    keyVar: 'OPENROUTER_API_KEY',
    link: 'https://openrouter.ai/keys',
    linkLabel: 'Obter chave no OpenRouter',
    passos: [
      'Acesse openrouter.ai e crie uma conta (creditos gratuitos no inicio)',
      'Va em "Keys" e crie uma nova chave',
      'Adicione ao .env.local: OPENROUTER_API_KEY=sua_chave_aqui',
      'Reinicie o servidor (npm run dev)',
    ],
  },
]

export default async function ConfiguracaoIAPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('papel, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const usuario = usuarioData as { papel: string; organizacao_id: string } | null
  if (!usuario) redirect('/onboarding')

  const isAdmin = ['admin_organizacao', 'admin_plataforma'].includes(usuario.papel)

  // Buscar uso pessoal dos ultimos 30 dias
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: usoRaw } = await (supabase as any)
    .from('acoes_ia')
    .select('created_at, tokens_entrada_real, tokens_saida_real, provedor, modelo, tipo_acao, sucesso')
    .eq('usuario_id', user.id)
    .gte('created_at', trintaDiasAtras)
    .order('created_at', { ascending: false })
    .limit(50)

  type UsoItem = {
    created_at: string
    tokens_entrada_real: number | null
    tokens_saida_real: number | null
    provedor: string
    modelo: string
    tipo_acao: string
    sucesso: boolean
  }
  const uso = (usoRaw ?? []) as UsoItem[]
  const totalTokens = uso.reduce((s, r) => s + (r.tokens_entrada_real ?? 0) + (r.tokens_saida_real ?? 0), 0)

  // Grafico: consumo por dia dos ultimos 7 dias (simples, sem recharts aqui)
  const seteDias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
  })
  const porDia = new Map<string, number>()
  for (const r of uso) {
    const label = new Date(r.created_at).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
    porDia.set(label, (porDia.get(label) ?? 0) + (r.tokens_entrada_real ?? 0) + (r.tokens_saida_real ?? 0))
  }
  const maxDia = Math.max(...seteDias.map(d => porDia.get(d) ?? 0), 1)

  // Config de provedor (apenas para admins)
  const { data: orgData } = isAdmin
    ? await (supabase.from('organizacoes') as any).select('ia_config').eq('id', usuario.organizacao_id).maybeSingle()
    : { data: null }

  const iaConfigDb = (orgData as any)?.ia_config as { provider?: string } | null
  const provedorEnv = process.env.AI_PROVIDER ?? 'gemini'
  const provedorAtual = iaConfigDb?.provider ?? provedorEnv
  const chavesConfiguradas: Record<string, boolean> = {
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Inteligencia Artificial</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure o modelo de IA e monitore seu uso pessoal.
        </p>
      </div>

      {/* Monitoramento pessoal: visivel para todos */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Meu uso nos ultimos 30 dias</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-500">Tokens consumidos</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{totalTokens.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-500">Documentos gerados</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{uso.filter(r => r.tipo_acao === 'gerar_documento').length}</p>
          </div>
        </div>

        {/* Grafico de barras simples (ultimos 7 dias, sem dependencia extra) */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-3">Tokens por dia (ultimos 7 dias)</p>
          <div className="flex items-end gap-2 h-16">
            {seteDias.map(dia => {
              const val = porDia.get(dia) ?? 0
              const altura = maxDia > 0 ? Math.max(4, Math.round((val / maxDia) * 64)) : 4
              return (
                <div key={dia} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm bg-indigo-500"
                    style={{ height: `${altura}px` }}
                    title={`${val.toLocaleString('pt-BR')} tokens`}
                  />
                  <span className="text-[9px] text-gray-400 truncate w-full text-center">{dia}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ultimas acoes */}
        {uso.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ultimas chamadas de IA</p>
            </div>
            <div className="divide-y divide-gray-100">
              {uso.slice(0, 10).map((r, i) => (
                <div key={i} className="px-4 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-800">{r.tipo_acao.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-gray-400">{r.modelo} via {r.provedor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">
                      {((r.tokens_entrada_real ?? 0) + (r.tokens_saida_real ?? 0)).toLocaleString('pt-BR')} tokens
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Configuracao de provedor: apenas para admins */}
      {isAdmin && (
        <>
          <div className="border-t border-gray-100 pt-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Provedor de IA da organizacao</h3>
              <p className="text-xs text-gray-400 mt-0.5">Visivel apenas para administradores. Afeta todos os usuarios da organizacao.</p>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Provedor ativo agora</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900">
                  {PROVEDORES.find(p => p.id === provedorAtual)?.nome ?? provedorAtual}
                </p>
                {PROVEDORES.find(p => p.id === provedorAtual)?.gratis ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    Gratuito
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Pago, consome creditos
                  </span>
                )}
                {chavesConfiguradas[provedorAtual] ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    <Zap className="w-3 h-3" /> Operacional
                  </span>
                ) : (
                  <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                    Chave nao configurada
                  </span>
                )}
              </div>
            </div>

            <FormConfigIA provedorAtual={provedorAtual} chavesConfiguradas={chavesConfiguradas} />

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-600">Instrucoes de configuracao por provedor</h4>
              {PROVEDORES.map(p => (
                <details key={p.id} className="group border border-gray-200 rounded-xl overflow-hidden">
                  <summary className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer list-none">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{p.nome}</span>
                      {p.gratis ? (
                        <span className="text-xs text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">Gratuito</span>
                      ) : (
                        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">Pago</span>
                      )}
                      {chavesConfiguradas[p.id] && (
                        <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">Configurado</span>
                      )}
                    </div>
                    <span className="text-xs text-blue-600 group-open:hidden">Ver instrucoes</span>
                    <span className="text-xs text-blue-600 hidden group-open:inline">Fechar</span>
                  </summary>
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50 space-y-3">
                    <ol className="space-y-1.5">
                      {p.passos.map((passo, i) => (
                        <li key={i} className="flex gap-2.5 text-xs text-gray-600">
                          <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 font-semibold text-[10px]">
                            {i + 1}
                          </span>
                          {passo}
                        </li>
                      ))}
                    </ol>
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {p.linkLabel}
                    </a>
                  </div>
                </details>
              ))}
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-xs text-gray-500">
                <strong className="text-gray-700">Preferencia:</strong> Use sempre um provedor gratuito (Gemini ou Groq) como padrao.
                Provedores pagos so devem ser ativados quando ha necessidade especifica e o usuario esta autenticado com creditos disponiveis.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar que usuarios nao-admin conseguem acessar a pagina**

Abrir `http://localhost:3000/configuracoes/ia` com um usuario de papel `requisitante`. Deve mostrar o painel de monitoramento pessoal sem a secao de configuracao de provedor.

- [ ] **Step 3: Verificar tipos e commit**

```bash
npx tsc --noEmit
git add src/app/(dashboard)/configuracoes/ia/page.tsx
git commit -m "feat(configuracoes): painel de monitoramento de IA pessoal para todos os usuarios"
```

---

## Verificacao Final

- [ ] **Rodar todos os testes**

```bash
npx vitest run --reporter=verbose
```

Esperado: todos os testes passando.

- [ ] **Build de producao**

```bash
npx next build
```

Esperado: sem erros de tipo ou build.

- [ ] **Checklist de conformidade**

- [ ] Tokens reais gravados em `acoes_ia.tokens_entrada_real` e `tokens_saida_real`
- [ ] Rate limiting bloqueia apos limite atingido e detecta anomalia multi-IP
- [ ] Lookup de clausulas enriquece o prompt quando cobertura >= 0.3
- [ ] `/admin/observabilidade` mostra graficos com filtros dia/semana/mes/90d
- [ ] Cada grafico expande ao clicar
- [ ] `/configuracoes/ia` mostra monitoramento pessoal para todos os usuarios
- [ ] Secao de configuracao de provedor visivel apenas para admins
- [ ] Provedores gratuitos marcados como "Gratuito", pagos como "Pago, consome creditos"
- [ ] Nenhum custo adicional de servico externo
- [ ] RLS habilitado em todas as novas tabelas
- [ ] Sem travessao (em dash) em nenhum texto da UI

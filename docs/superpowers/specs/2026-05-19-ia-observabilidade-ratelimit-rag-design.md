# Design: IA Observabilidade, Rate Limiting Adaptativo e Pipeline RAG

**Data**: 2026-05-19
**Status**: Aprovado para implementacao
**Fase do produto**: Fase 6

---

## Contexto

A plataforma LicitaIA utiliza multiplos provedores de IA (Anthropic, Gemini, Groq, OpenRouter) para gerar documentos do processo licitatorio conforme a Lei 14.133/21. Tres problemas identificados que este design resolve:

1. **Contagem de tokens incorreta**: o `wrapper.ts` registra comprimento em caracteres, nao tokens reais. Os adapters ja retornam `tokensIn` e `tokensOut` mas esses valores sao descartados.
2. **Ausencia de rate limiting**: nenhum controle de abuso existe. O banco de clausulas aprendidas (`clausulas_aprendidas`) existe mas nunca e consultado antes de chamar a IA.
3. **Monitoramento insuficiente**: a pagina `/admin/ia` existente usa estimativas de caracteres e nao permite filtros por periodo, processo licitatorio ou granularidade temporal.

---

## Restricoes de Design (nao negociaveis)

- **Zero custo adicional**: nenhum servico externo pago. Tudo via Supabase existente e bibliotecas open source.
- **Preferencia por modelo gratuito**: a ordem de prioridade de provedores e Groq > Gemini > OpenRouter > Anthropic. Modelo pago e opt-in, nunca default.
- **Transparencia de modelo**: toda acao de IA registra e exibe qual modelo foi usado. Troca de modelo e feita via painel admin, sem alterar codigo.
- **Auth gate para IA paga**: nenhuma chamada a provedor pago ocorre sem usuario autenticado e com creditos verificados.
- **Configuracao para usuario leigo**: perfis pre-definidos em vez de numeros brutos. Linguagem acessivel em toda interface de configuracao.
- **Configuracao por usuario**: cada usuario tem sua propria area de configuracao e monitoramento de IA em `/configuracoes/ia`, mais simples que o painel admin.
- **Sem travessao (em dash)** em qualquer texto da UI ou documentacao.

---

## Arquitetura Geral

Quatro subsistemas independentes, deployaveis de forma incremental:

```
HTTP request
  |
  v
[1] Rate Limiter (Supabase sliding window)
  |-- bloqueado: retorna 429
  |-- ok: continua
  v
[2] Clause Lookup (Postgres full-text search)
  |-- cobertura >= 0.8 + org madura: modo validacao (prompt reduzido)
  |-- cobertura < 0.8: prompt completo com clausulas como contexto
  v
[3] wrapper.ts (executarIAComCreditos)
  |-- verifica autenticacao + saldo
  |-- chama gerarTextoIA -> AIResponse { tokensIn, tokensOut, provider, model }
  |-- grava tokens REAIS em acoes_ia
  |-- debita creditos
  |-- (async) atualiza clausulas_aprendidas
  v
[4] /admin/observabilidade + /configuracoes/ia
     le acoes_ia (tokens reais), clausulas_aplicadas, rate_limit_janelas
     exibe graficos Recharts com filtros dia/semana/mes/90d
```

---

## 1. Fix de Contagem de Tokens

### Problema

`wrapper.ts` linha critica:
```typescript
tokens_entrada: params.prompt.length,  // ERRADO: caracteres
tokens_saida: texto.length,            // ERRADO: caracteres
```

`AIResponse` ja tem `tokensIn` e `tokensOut` reais, mas sao ignorados.

### Solucao

Capturar o retorno completo de `gerarTextoIA` e usar os campos reais:

```typescript
const res = await gerarTextoIA(params)
// INSERT com tokens reais + chars para historico
{
  chars_entrada:       params.prompt.length,
  chars_saida:         res.text.length,
  tokens_entrada_real: res.tokensIn,
  tokens_saida_real:   res.tokensOut,
  provedor:            res.provider,
  modelo:              res.model,
}
```

### Migration

```sql
ALTER TABLE acoes_ia
  ADD COLUMN tokens_entrada_real integer,
  ADD COLUMN tokens_saida_real   integer,
  ADD COLUMN chars_entrada       integer,
  ADD COLUMN chars_saida         integer,
  ADD COLUMN modelo              text;

-- Retroativamente: mover valores antigos para chars
UPDATE acoes_ia SET
  chars_entrada = tokens_entrada,
  chars_saida   = tokens_saida
WHERE tokens_entrada_real IS NULL;
```

---

## 2. Rate Limiting Adaptativo

### Principio

Sliding window de 1 hora armazenada no Supabase. Configuravel por org e por usuario via perfis. Deteccao de anomalia quando o mesmo usuario acessa de mais de 2 IPs distintos na mesma janela.

### Perfis pre-definidos (para usuario leigo)

| Perfil | Chamadas/hora | Descricao na UI |
|---|---|---|
| Conservador | 20 | Uso leve, equipe pequena |
| Padrao | 60 | Uso normal de prefeitura |
| Intenso | 150 | Demanda alta, varios usuarios |
| Personalizado | configuravel | Para administradores avancados |

### Migration

```sql
CREATE TABLE rate_limit_configs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  uuid REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id      uuid REFERENCES auth.users(id),
  escopo          text NOT NULL CHECK (escopo IN ('org','user','global')),
  perfil          text NOT NULL CHECK (perfil IN ('conservador','padrao','intenso','personalizado')) DEFAULT 'padrao',
  max_chamadas    integer NOT NULL DEFAULT 60,
  janela_segundos integer NOT NULL DEFAULT 3600,
  modo            text NOT NULL CHECK (modo IN ('fixo','adaptativo')) DEFAULT 'adaptativo',
  ativo           boolean DEFAULT true,
  criado_em       timestamptz DEFAULT now()
);

CREATE TABLE rate_limit_janelas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave          text NOT NULL,
  chamadas       integer DEFAULT 0,
  janela_inicio  timestamptz NOT NULL,
  ultimo_ip      text,
  ips_detectados text[] DEFAULT '{}',
  anomalia_flag  boolean DEFAULT false,
  atualizado_em  timestamptz DEFAULT now()
);

CREATE INDEX ON rate_limit_janelas (chave, janela_inicio);
```

### Interface de adaptacao automatica

Em modo `adaptativo`:
- Se `ips_detectados` tiver mais de 2 entradas distintas na janela: `anomalia_flag = true`, limite reduzido a 50% automaticamente.
- Admin recebe notificacao interna (tabela `notificacoes`) com detalhe do IP e usuario.

### Arquivo: `src/lib/ai/rate-limiter.ts`

```typescript
interface RateLimitResult {
  permitido: boolean
  chamadas_restantes: number
  anomalia: boolean
  reset_em: Date
}

async function verificarRateLimit(
  orgId: string,
  userId: string,
  ip: string
): Promise<RateLimitResult>
```

**Fail open**: se o Supabase nao responder, deixa passar e loga o erro. Rate limiting nao deve bloquear geracao de documentos por falha de infraestrutura.

---

## 3. Pipeline de Lookup de Clausulas (RAG estruturado)

### Sem custo adicional

Usa Postgres full-text search nativo (`tsvector` + `tsquery` + `pg_trgm`). Para documentos juridicos com campos bem definidos (tipo_campo, documento, modalidade), precisao equivalente ao RAG semantico em mais de 90% dos casos.

### Migration

```sql
-- Adicionar coluna de busca full-text em clausulas_aprendidas
ALTER TABLE clausulas_aprendidas
  ADD COLUMN busca_tsvector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('portuguese',
        coalesce(texto_aprovado, '') || ' ' ||
        coalesce(tipo_campo, '') || ' ' ||
        coalesce(categoria_objeto, '')
      )
    ) STORED;

CREATE INDEX ON clausulas_aprendidas USING GIN (busca_tsvector);
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX ON clausulas_aprendidas USING GIN (texto_aprovado gin_trgm_ops);

-- Tabela de registro de reuso (se nao existir)
CREATE TABLE IF NOT EXISTS clausulas_aplicadas (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id       uuid REFERENCES organizacoes(id) ON DELETE CASCADE,
  clausula_id          uuid REFERENCES clausulas_aprendidas(id),
  processo_id          uuid REFERENCES processos_licitatorios(id),
  acao_ia_id           uuid REFERENCES acoes_ia(id),
  tokens_economizados  integer DEFAULT 0,
  modo                 text CHECK (modo IN ('contexto','validacao')),
  criado_em            timestamptz DEFAULT now()
);
```

### Arquivo: `src/lib/ai/clausulas-lookup.ts`

```typescript
interface LookupResult {
  clausulas: ClausulaAprendida[]
  cobertura: number           // 0..1, percentual de campos com match
  tokens_estimados_economizados: number
  modo: 'contexto' | 'validacao' | 'none'
}

async function buscarClausulasRelevantes(
  orgId: string,
  documento: 'dfd' | 'etp' | 'tr',
  modalidade: string,
  categoriaObjeto: string,
  camposNecessarios: string[]
): Promise<LookupResult>
```

**Logica de modo**:
- `cobertura >= 0.8` E org com mais de 50 clausulas aprovadas: modo `validacao` (prompt reduzido, IA confirma, nao gera do zero)
- `cobertura >= 0.3`: modo `contexto` (clausulas injetadas como contexto no prompt)
- `cobertura < 0.3`: modo `none` (chamada normal, sem alteracao)

**Fail open**: qualquer falha no lookup nao interrompe a geracao.

---

## 4. Dashboard de Observabilidade

### Nivel Admin: `/admin/observabilidade`

Rota Server Component que le agregados do Supabase e passa como props para Client Components Recharts.

**KPIs no topo**:
- Tokens reais consumidos (periodo selecionado)
- Economia estimada via RAG (clausulas_aplicadas.tokens_economizados)
- Chamadas bloqueadas por rate limit
- Processos com cobertura RAG > 80%

**Graficos (Recharts, expandem ao clicar em Dialog shadcn)**:

| Grafico | Tipo | Filtros |
|---|---|---|
| Tokens ao longo do tempo | LineChart | Dia / Semana / Mes / 90d, provedor, tipo documento |
| Economia RAG vs. consumo IA | AreaChart | Dia / Semana / Mes / 90d |
| Tokens por processo licitatorio | BarChart | Fase, modalidade |
| Anomalias rate limit | Timeline | Ultimas 24h / 7 dias |
| Curva de aprendizado | LineChart | Chamadas IA vs. reusos de clausulas |

**Granularidades por filtro de periodo**:

| Filtro | Agrupamento SQL | Janela |
|---|---|---|
| Dia | `date_trunc('hour', criado_em)` | Ultimas 24h |
| Semana | `date_trunc('day', criado_em)` | Ultimos 7 dias |
| Mes | `date_trunc('day', criado_em)` | Ultimos 30 dias |
| 90 dias | `date_trunc('week', criado_em)` | Ultimos 90 dias |

O filtro e um `searchParam` na URL (`?periodo=dia&provedor=all&documento=all`), processado no Server Component para rebuscar no banco sem estado client-side desnecessario.

### Nivel Usuario: `/configuracoes/ia`

Mais simples, focado no uso individual. Dividido em duas abas:

**Aba "Configuracoes"**:
- Selecao de modelo preferido (dropdown com nomes legiveis, nao IDs tecnicos)
  - "Gratuito automatico (recomendado)"
  - "Gemini Flash (gratuito)"
  - "Groq Llama (gratuito)"
  - "Claude Sonnet (pago, consome creditos extras)"
- Perfil de rate limiting pessoal (Conservador / Padrao / Intenso)
- Toggle: "Usar clausulas aprendidas quando disponivel" (padrao: ativo)

**Aba "Meu uso"**:
- Total de tokens consumidos no mes
- Creditos gastos no mes
- Lista dos ultimos 20 documentos gerados com: modelo usado, tokens, data
- Grafico simples: consumo diario dos ultimos 7 dias (sem filtros adicionais)

### Estrutura de arquivos

```
src/app/(dashboard)/
  admin/
    observabilidade/
      page.tsx                      <- Server Component
      components/
        grafico-tokens.tsx          <- Client Component, LineChart
        grafico-economia.tsx        <- Client Component, AreaChart
        grafico-processos.tsx       <- Client Component, BarChart
        painel-anomalias.tsx        <- Client Component
        filtros.tsx                 <- Client Component, searchParams
  configuracoes/
    ia/
      page.tsx                      <- Server Component
      components/
        configuracoes-ia-form.tsx   <- Client Component
        historico-uso.tsx           <- Client Component
```

---

## Configuracao de Modelos (Admin)

Rota existente `/admin/configuracoes` recebe nova secao "Modelos de IA":

- Dropdown por funcao (geracao completa, aprimoramento, sugestao proativa)
- Cada funcao tem lista de modelos com rotulo legivel e indicador "Gratuito" / "Pago"
- Ordem de preferencia configuravel via drag-and-drop simples
- Salvo em tabela `configuracoes_ia_org` por organizacao

**Auth gate para modelos pagos**: antes de salvar configuracao com modelo pago, exibe confirmacao explicita: "Este modelo consome creditos a cada uso. Seu saldo atual e X creditos."

---

## Error Handling

| Ponto | Erro | Comportamento |
|---|---|---|
| Rate limiter | Falha Supabase | Fail open, loga, nao bloqueia |
| Clause lookup | Query lenta | Timeout 500ms, ignora, segue para IA |
| Insert acoes_ia | Falha apos geracao | Loga, nao estorna creditos |
| Dashboard | Agregado vazio | Estado vazio com mensagem, nao quebra |
| Modelo pago sem creditos | Saldo zero | Bloqueia antes de chamar API, redireciona para /creditos |

Regra geral: nenhuma falha nos subsistemas auxiliares impede a geracao do documento.

---

## Testes (Vitest)

Tres arquivos prioritarios:

- `src/lib/ai/__tests__/rate-limiter.test.ts`
  - Janela deslizante funciona corretamente
  - Anomalia detectada com 3+ IPs distintos
  - Reset de janela apos expirar

- `src/lib/ai/__tests__/clausulas-lookup.test.ts`
  - Match por tipo_campo + modalidade
  - Ranking por score_qualidade
  - Modo validacao ativado com cobertura >= 0.8
  - Fail open em erro de query

- `src/lib/ai/__tests__/wrapper.test.ts`
  - Tokens reais gravados (nao caracteres)
  - Creditos debitados apos sucesso
  - Estorno em erro de API

---

## Dependencias Novas

| Pacote | Uso | Custo |
|---|---|---|
| `recharts` | Graficos interativos no dashboard | Gratuito, open source |

Nenhuma outra dependencia nova. pgvector nao e usado (substituido por full-text search nativo).

---

## Ordem de Implementacao

1. Migration: colunas acoes_ia + rate_limit_configs + rate_limit_janelas + clausulas_aplicadas + busca_tsvector
2. Fix wrapper.ts (tokens reais) + configuracoes_ia_org
3. rate-limiter.ts
4. clausulas-lookup.ts
5. /admin/observabilidade (dashboard)
6. /configuracoes/ia (painel usuario)
7. Secao de modelos em /admin/configuracoes
8. Testes Vitest

Cada item e deployavel e testavel de forma independente.

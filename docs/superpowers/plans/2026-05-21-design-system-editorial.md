# Design System Editorial — LicitaIA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o design system editorial completo da plataforma LicitaIA: globals tipográficos, primitives editoriais, DocSheet v2, ticker "Ao Vivo" no header, e reformulação visual das telas principais (Dashboard, Processos, Créditos, Procuradoria, Configurações → Faixa).

**Architecture:** Fase por fase, sem quebrar funcionalidade existente. Globals e primitives são fundação. Ticker é subsistema isolado (DB + action + component). Rewrites de tela preservam TODA lógica de dados e papéis, alterando só a camada visual.

**Tech Stack:** Next.js 14 App Router, TypeScript estrito, Tailwind CSS v4, Supabase (sem ORM), Server Components, Server Actions, `@supabase/ssr`.

---

## Auditoria — O que já existe vs o que falta

### Já existe (não recriar):
- `src/lib/theme/provider.tsx` — ThemeProvider, THEMES (5 temas)
- `src/app/globals.css` — tokens dos 5 temas (sem camada editorial ainda)
- `src/app/layout.tsx` — fontes + ThemeProvider
- `src/components/layout/app-header.tsx` — header 2 linhas, sem ticker
- `src/components/licita/doc-sheet.tsx` — **DocSheet v1** (interface antiga, sem consumidores)
- `src/components/licita/{ai-chip, brasao, data-field, kpi-card, logo-prefeitura, pill, status-pill, step-page-header, theme-switcher, timeline}.tsx`
- `src/app/(dashboard)/layout.tsx` — busca dados para AppHeader, sem ticker
- `src/app/(dashboard)/dashboard/page.tsx` — 5 views por papel, lógica de dados completa
- `src/app/(dashboard)/processos/page.tsx` — lista de processos com filtros básicos
- `src/app/(dashboard)/creditos/page.tsx` — página de créditos funcional
- `src/app/(dashboard)/procuradoria/page.tsx` — fila de pareceres funcional

### Não existe (criar neste plano):
- Camada editorial em `globals.css` (grain, `.l-h`, `.l-tnum`, etc.)
- `src/components/licita/editorial.tsx` — 8 primitives editoriais
- DocSheet v2 (interface nova; substituição segura pois DocSheet v1 não tem consumidores)
- `src/lib/ticker/categorias.ts` — constantes e tipos
- `src/lib/actions/ticker.ts` — server actions (adaptada para schema real: sem `tramitacoes`)
- `src/components/layout/ticker-strip.tsx` — componente ticker
- Integração do ticker no `app-header.tsx` e `(dashboard)/layout.tsx`
- Migration `ticker_preferencias`
- Rewrites visuais das 5 telas
- `src/app/(dashboard)/configuracoes/faixa-de-informacoes/page.tsx` — settings do ticker

### Adaptações do spec ao schema real:
| Spec referencia | Realidade do DB | Solução no plano |
|-----------------|-----------------|-----------------|
| `tramitacoes` | Não existe | Usar `processos_licitatorios.updated_at` para eventos de movimentação |
| `publicacoes.canal` | Coluna não existe | Usar `pncp_numero`, `diario_oficial`, `portal_proprio` para inferir canal |
| `processos.objeto_curto` | Não existe | Usar `objeto` truncado a 60 chars |
| `processos.prazo_sla` | Não existe | Omitir categoria SLA do ticker |
| `processos.dias_em_etapa` | Não existe | Calcular via `updated_at - now()` |
| `assinaturas JOIN documentos` | Sem FK tipada | Join via `tabela_origem + documento_id` |

---

## Task 1: Editorial globals (append `globals.css`)

**Files:**
- Modify: `src/app/globals.css` (append ao final)

- [ ] **Step 1: Adicionar camada editorial ao globals.css**

Abra `src/app/globals.css` e adicione ao final do arquivo:

```css
/* ────────────────────────────────────────────────────────────
 * Licita·IA · Camada editorial (v2)
 * ──────────────────────────────────────────────────────────── */

.licita-grain {
  background-image:
    radial-gradient(rgba(0,0,0,0.018) 1px, transparent 1px),
    radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 3px 3px, 7px 7px;
  background-position: 0 0, 1px 1px;
}

.l-h    { font-family: var(--font-heading); color: var(--ink); font-feature-settings: "lnum","ss01"; }
.l-tnum { font-variant-numeric: tabular-nums lining-nums; }
.l-mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.l-osnum{ font-variant-numeric: oldstyle-nums proportional-nums; }

.l-dropcap::first-letter {
  font-family: var(--font-heading);
  float: left;
  font-size: 4.6em;
  line-height: 0.86;
  padding: 4px 10px 0 0;
  margin-top: 4px;
  color: var(--primary);
  font-weight: 600;
  letter-spacing: -0.02em;
}

.l-divider-dot {
  display: flex; align-items: center; gap: 10px;
  color: var(--mutedSoft);
  font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; font-weight: 700;
}
.l-divider-dot::before, .l-divider-dot::after {
  content: ''; flex: 1; height: 1px; background: var(--hairline);
}

.l-justify {
  text-align: justify; hyphens: auto;
  text-wrap: pretty;
  -webkit-hyphens: auto;
}

.l-meta {
  font-size: 10.5px; color: var(--muted); font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase;
}

.l-leader { display: flex; align-items: baseline; gap: 6px; }
.l-leader > .l-leader-fill {
  flex: 1; border-bottom: 1px dotted var(--hairline);
  transform: translateY(-3px); min-width: 18px;
}

[data-theme="petroleo"]   .l-h { letter-spacing: -0.012em; font-weight: 500; font-feature-settings: "lnum","ss01","kern"; }
[data-theme="grafite"]    .l-h { letter-spacing: -0.022em; font-weight: 700; }
[data-theme="brasao"]     .l-h { letter-spacing: -0.008em; font-weight: 500; }
[data-theme="noite"]      .l-h { letter-spacing: -0.018em; font-weight: 600; }
[data-theme="cataguases"] .l-h { letter-spacing: -0.012em; font-weight: 500; }

@keyframes licita-ticker {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-33.333%); }
}
@keyframes licita-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}

body::before {
  content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    radial-gradient(rgba(0,0,0,0.018) 1px, transparent 1px),
    radial-gradient(rgba(255,255,255,0.020) 1px, transparent 1px);
  background-size: 3px 3px, 7px 7px;
  background-position: 0 0, 1px 1px;
  opacity: 0.6;
}
```

- [ ] **Step 2: Verificar build**

```bash
npx tsc --noEmit
```

Expected: sem erros de TypeScript (CSS não é tipado).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): adicionar camada editorial ao globals.css"
```

---

## Task 2: Primitives editoriais

**Files:**
- Create: `src/components/licita/editorial.tsx`

- [ ] **Step 1: Criar o arquivo com os 8 primitives**

Crie `src/components/licita/editorial.tsx`:

```tsx
import type { ReactNode, ElementType, CSSProperties } from 'react'

// EditorialKicker — kicker editorial com edição e data
export function EditorialKicker({
  kicker, edition, date, tone = 'accent',
}: {
  kicker?: string
  edition?: string
  date?: string
  tone?: 'accent' | 'muted'
}) {
  return (
    <div
      className="flex items-center gap-2.5 text-[10px] font-bold uppercase"
      style={{
        letterSpacing: '0.18em',
        color: tone === 'accent' ? 'var(--accent)' : 'var(--muted)',
      }}
    >
      {kicker && <span>{kicker}</span>}
      {kicker && (edition || date) && (
        <span className="h-px w-3.5 opacity-40" style={{ background: 'currentColor' }} />
      )}
      {edition && (
        <span className="font-mono" style={{ color: 'var(--muted)', letterSpacing: '0.04em' }}>
          {edition}
        </span>
      )}
      {edition && date && (
        <span className="h-[3px] w-[3px] rounded-full" style={{ background: 'var(--mutedSoft)' }} />
      )}
      {date && (
        <span className="l-tnum" style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}>
          {date}
        </span>
      )}
    </div>
  )
}

// HeadlineSerif — H1 editorial dramático
const headlineSizes = {
  sm:  { fs: 22, lh: 1.18, ls: '-0.012em' },
  md:  { fs: 30, lh: 1.12, ls: '-0.018em' },
  lg:  { fs: 42, lh: 1.06, ls: '-0.022em' },
  xl:  { fs: 56, lh: 1.02, ls: '-0.028em' },
  xxl: { fs: 72, lh: 0.98, ls: '-0.032em' },
} as const

export function HeadlineSerif({
  children, size = 'xl', as: As = 'h1', maxWidth, style = {},
}: {
  children: ReactNode
  size?: keyof typeof headlineSizes
  as?: ElementType
  maxWidth?: number | string
  style?: CSSProperties
}) {
  const s = headlineSizes[size]
  return (
    <As
      className="l-h"
      style={{
        fontFamily: 'var(--font-heading)',
        fontSize: s.fs, lineHeight: s.lh, letterSpacing: s.ls,
        margin: 0, color: 'var(--ink)', fontWeight: 500,
        maxWidth, textWrap: 'balance' as const,
        ...style,
      }}
    >
      {children}
    </As>
  )
}

// RuleHead — título de seção com regra horizontal
export function RuleHead({
  kicker, children, rightLabel, level = 2,
}: {
  kicker?: string
  children: ReactNode
  rightLabel?: string
  level?: 1 | 2 | 3
}) {
  const fontSize = { 1: 36, 2: 22, 3: 16 }[level]
  return (
    <div className="mb-[18px]">
      {kicker && (
        <div className="l-meta mb-2" style={{ color: 'var(--accent)' }}>{kicker}</div>
      )}
      <div
        className="flex items-baseline gap-[18px] pb-2.5"
        style={{ borderBottom: '1px solid var(--rule)' }}
      >
        <h2
          className="l-h flex-1 m-0"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize, lineHeight: 1.1, letterSpacing: '-0.018em',
            fontWeight: 500,
          }}
        >
          {children}
        </h2>
        {rightLabel && (
          <div className="l-meta" style={{ color: 'var(--muted)' }}>{rightLabel}</div>
        )}
      </div>
    </div>
  )
}

// BigStat — número grande tipo cover de relatório anual
export function BigStat({
  label, valor, sub, accent = false,
}: {
  label: string
  valor: string | number
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="l-meta" style={{ color: 'var(--muted)' }}>{label}</div>
      <div
        className="l-h l-tnum"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 64, lineHeight: 0.92, letterSpacing: '-0.035em',
          color: accent ? 'var(--accent)' : 'var(--ink)',
          fontWeight: 500,
        }}
      >
        {valor}
      </div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--inkSoft)' }}>{sub}</div>}
    </div>
  )
}

// SectionMark — § I — Label
const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
export function SectionMark({ n, label }: { n: number; label?: string }) {
  return (
    <div className="inline-flex items-baseline gap-2.5">
      <span
        className="l-h"
        style={{
          fontFamily: 'var(--font-heading)', fontSize: 18,
          color: 'var(--accent)', letterSpacing: '0.08em', fontWeight: 500,
        }}
      >
        § {ROMANS[n - 1] || n}
      </span>
      {label && <span className="l-meta" style={{ color: 'var(--muted)' }}>— {label}</span>}
    </div>
  )
}

// DotLeader — "Chave ............. valor" (estilo TOC)
export function DotLeader({
  label, value, valueAccent = false, mono = false,
}: {
  label: string
  value: string
  valueAccent?: boolean
  mono?: boolean
}) {
  return (
    <div className="l-leader text-[12.5px] py-0.5">
      <span style={{ color: 'var(--inkSoft)', fontWeight: 500 }}>{label}</span>
      <span className="l-leader-fill" />
      <span
        className={mono ? 'l-mono' : 'l-tnum'}
        style={{
          color: valueAccent ? 'var(--accent)' : 'var(--ink)',
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  )
}

// Wordmark — "LICITA·IA" para footers
export function Wordmark({
  size = 12, opacity = 0.55, mono = true,
}: {
  size?: number
  opacity?: number
  mono?: boolean
}) {
  return (
    <span
      className={mono ? 'l-mono' : ''}
      style={{
        fontSize: size, letterSpacing: '0.32em', textTransform: 'uppercase',
        fontWeight: 700, color: 'var(--ink)', opacity,
      }}
    >
      Licita·IA
    </span>
  )
}

// DotStatus — "● Em análise" para listas densas
const dotColors: Record<string, string> = {
  rascunho:               'var(--statusRascunho, var(--muted))',
  em_revisao:             'var(--statusRevisao, var(--warn))',
  assinado:               'var(--statusAssinado, var(--success))',
  publicado:              'var(--statusPublicado, var(--success))',
  em_andamento:           'var(--statusAnalise, var(--accent))',
  em_analise:             'var(--statusAnalise, var(--accent))',
  pendente:               'var(--statusRevisao, var(--warn))',
  aprovado:               'var(--statusPublicado, var(--success))',
  aprovado_com_ressalvas: 'var(--statusRevisao, var(--warn))',
  devolvido:              'var(--statusDevolvido, var(--danger))',
}
const dotLabels: Record<string, string> = {
  rascunho:               'Rascunho',
  em_revisao:             'Em revisão',
  assinado:               'Assinado',
  publicado:              'Publicado',
  em_andamento:           'Em análise',
  em_analise:             'Em análise',
  pendente:               'Pendente',
  aprovado:               'Aprovado',
  aprovado_com_ressalvas: 'Aprovado c/ ressalvas',
  devolvido:              'Devolvido',
}
export function DotStatus({ status }: { status: string }) {
  const c = dotColors[status] ?? 'var(--muted)'
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        color: c, fontSize: 10.5,
        letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      {dotLabels[status] ?? String(status)}
    </span>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/licita/editorial.tsx
git commit -m "feat(design): adicionar primitives editoriais (editorial.tsx)"
```

---

## Task 3: DocSheet v2

**Files:**
- Modify: `src/components/licita/doc-sheet.tsx` (substituição total — sem consumidores, seguro)

- [ ] **Step 1: Substituir doc-sheet.tsx integralmente**

Substitua `src/components/licita/doc-sheet.tsx` pelo seguinte conteúdo:

```tsx
'use client'

import type { ReactNode } from 'react'

export type DocSecao = { titulo: string; corpo: string }

export function DocSheet({
  kicker,
  titulo,
  meta,
  secoes,
  actions,
  footer,
  dropCap = false,
  className = '',
}: {
  kicker?: string
  titulo: string
  meta?: string
  secoes: DocSecao[]
  actions?: ReactNode
  footer?: ReactNode
  dropCap?: boolean
  className?: string
}) {
  return (
    <div
      className={`flex flex-col rounded-[var(--r-lg)] border border-hairline bg-surface ${className}`}
      style={{
        padding: '28px 38px 24px',
        boxShadow:
          '0 1px 0 rgba(15, 20, 24, 0.02), 0 12px 32px -16px rgba(15, 20, 24, 0.08)',
      }}
    >
      {/* Cabecalho */}
      <div
        className="flex items-start justify-between gap-5 pb-4 mb-5"
        style={{ borderBottom: '0.5px solid var(--hairlineSoft)' }}
      >
        <div className="flex-1 min-w-0">
          {kicker && (
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[9.5px] font-bold uppercase"
                style={{ color: 'var(--accent)', letterSpacing: '0.2em' }}
              >
                {kicker}
              </span>
              <span className="h-px w-4" style={{ background: 'var(--accentSoft)' }} />
              <span
                className="font-mono text-[9.5px]"
                style={{ color: 'var(--muted)', letterSpacing: '0.06em' }}
              >
                Documento institucional
              </span>
            </div>
          )}
          <div
            className="l-h"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 26, lineHeight: 1.12, letterSpacing: '-0.018em',
              color: 'var(--ink)', fontWeight: 500, textWrap: 'balance',
            }}
          >
            {titulo}
          </div>
          {meta && (
            <div className="flex items-center gap-2 mt-2.5 text-[11px]">
              <span className="l-meta" style={{ letterSpacing: '0.16em', color: 'var(--muted)' }}>
                Por
              </span>
              <span style={{ color: 'var(--inkSoft)', fontWeight: 500 }}>{meta}</span>
            </div>
          )}
        </div>
        {actions && <div className="flex gap-1.5 shrink-0">{actions}</div>}
      </div>

      {/* Secoes */}
      <div className="flex-1">
        {secoes.map((s, i) => (
          <div key={i} className="mb-[18px]">
            <div className="flex items-baseline gap-2.5 mb-2">
              <span
                className="font-mono text-[10px] font-bold"
                style={{ color: 'var(--accent)', letterSpacing: '0.06em', lineHeight: 1 }}
              >
                § {String(i + 1).padStart(2, '0')}
              </span>
              <div
                className="l-h"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 14, fontWeight: 600,
                  color: 'var(--primary)', letterSpacing: '-0.008em',
                }}
              >
                {s.titulo}
              </div>
            </div>
            <p
              className={dropCap && i === 0 ? 'l-dropcap l-justify' : 'l-justify'}
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 14, lineHeight: 1.6,
                color: 'var(--inkSoft)', margin: 0, fontWeight: 400,
              }}
            >
              {s.corpo}
            </p>
          </div>
        ))}
      </div>

      {footer}
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/licita/doc-sheet.tsx
git commit -m "feat(design): substituir DocSheet v1 por v2 com interface editorial"
```

---

## Task 4: Migration `ticker_preferencias`

**Files:**
- Create: `supabase/migrations/20260521000001_ticker_preferencias.sql`

- [ ] **Step 1: Criar migration**

Crie `supabase/migrations/20260521000001_ticker_preferencias.sql`:

```sql
create table if not exists ticker_preferencias (
  usuario_id    uuid primary key references usuarios(id) on delete cascade,
  categorias    jsonb not null default '{
    "movimentacao": true,
    "etapa": true,
    "parecer": true,
    "assinatura": true,
    "publicacao": true,
    "sessao": true,
    "ia": true
  }'::jsonb,
  atualizado_em timestamptz not null default now()
);

alter table ticker_preferencias enable row level security;

create policy "usuario_le_propria_preferencia"
  on ticker_preferencias for select
  using (auth.uid() = usuario_id);

create policy "usuario_insere_propria_preferencia"
  on ticker_preferencias for insert
  with check (auth.uid() = usuario_id);

create policy "usuario_atualiza_propria_preferencia"
  on ticker_preferencias for update
  using (auth.uid() = usuario_id);
```

- [ ] **Step 2: Commit da migration**

```bash
git add supabase/migrations/20260521000001_ticker_preferencias.sql
git commit -m "feat(db): adicionar tabela ticker_preferencias com RLS"
```

---

## Task 5: Ticker — constantes e tipos

**Files:**
- Create: `src/lib/ticker/categorias.ts`

- [ ] **Step 1: Criar `src/lib/ticker/categorias.ts`**

```ts
export type TickerCategoriaId =
  | 'movimentacao' | 'etapa' | 'parecer' | 'assinatura'
  | 'publicacao'   | 'sessao' | 'ia'

export type TickerCategoria = {
  id: TickerCategoriaId
  label: string
  desc: string
  icon: string
}

export const TICKER_CATEGORIAS: TickerCategoria[] = [
  { id: 'movimentacao', label: 'Movimentações de processos', desc: 'Mudanças de status, encaminhamentos entre setores',   icon: '⇄' },
  { id: 'etapa',        label: 'Etapas concluídas',          desc: 'DFD, Cotação, ETP, TR, Edital aprovados',             icon: '✓' },
  { id: 'parecer',      label: 'Procuradoria',               desc: 'Pareceres emitidos, devoluções, ressalvas',           icon: '§' },
  { id: 'assinatura',   label: 'Assinaturas eletrônicas',    desc: 'Documentos assinados via Gov.br ou ICP-Brasil',       icon: '✎' },
  { id: 'publicacao',   label: 'Publicações oficiais',       desc: 'PNCP, Diário Oficial Eletrônico, site institucional', icon: '↗' },
  { id: 'sessao',       label: 'Sessões públicas',           desc: 'Pregões eletrônicos em disputa, propostas recebidas', icon: '⊙' },
  { id: 'ia',           label: 'Inteligência artificial',    desc: 'Aprimoramentos automáticos, sugestões da IA',         icon: '★' },
]

export const TICKER_CATEGORIAS_DEFAULT: Record<TickerCategoriaId, boolean> =
  Object.fromEntries(TICKER_CATEGORIAS.map(c => [c.id, true])) as Record<TickerCategoriaId, boolean>

export type TickerEvento = {
  categoria: TickerCategoriaId
  num: string
  txt: string
  tone: 'accent' | 'success' | 'warn' | 'danger' | 'neutral'
  ts: string
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ticker/categorias.ts
git commit -m "feat(ticker): adicionar constantes e tipos do ticker"
```

---

## Task 6: Ticker — server action

**Files:**
- Create: `src/lib/actions/ticker.ts`

**Nota de adaptação:** O schema real não tem `tramitacoes`. Esta action usa `processos_licitatorios.updated_at` para eventos de movimentação/etapa, e as tabelas `pareceres`, `assinaturas`, `publicacoes` que existem.

- [ ] **Step 1: Criar `src/lib/actions/ticker.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { TickerCategoriaId, TickerEvento } from '@/lib/ticker/categorias'
import { TICKER_CATEGORIAS_DEFAULT } from '@/lib/ticker/categorias'

export async function buscarEventosTicker(): Promise<TickerEvento[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: usr } = await supabase
    .from('usuarios').select('organizacao_id').eq('id', user.id).single()
  if (!usr) return []

  const eventos: TickerEvento[] = []
  const desde = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const orgId = (usr as any).organizacao_id

  // 1) Processos atualizados recentemente (movimentacao + etapa)
  const { data: procs } = await supabase
    .from('processos_licitatorios')
    .select('numero_processo, objeto, status, etapa_atual, updated_at')
    .eq('organizacao_id', orgId)
    .gte('updated_at', desde)
    .order('updated_at', { ascending: false })
    .limit(20)

  for (const p of (procs ?? []) as any[]) {
    const num = p.numero_processo ?? '—'
    const obj = String(p.objeto ?? '').slice(0, 60)
    if (p.status === 'publicado') {
      eventos.push({ categoria: 'etapa', num, txt: `Publicado · ${obj}`, tone: 'success', ts: formatTs(p.updated_at) })
    } else if (p.status === 'assinado') {
      eventos.push({ categoria: 'assinatura', num, txt: `Assinado · ${obj}`, tone: 'success', ts: formatTs(p.updated_at) })
    } else {
      const etapaLabel = ETAPA_LABELS[p.etapa_atual as number] ?? `Etapa ${p.etapa_atual}`
      eventos.push({ categoria: 'movimentacao', num, txt: `${etapaLabel} · ${obj}`, tone: 'accent', ts: formatTs(p.updated_at) })
    }
  }

  // 2) Pareceres recentes
  const { data: par } = await (supabase as any)
    .from('pareceres')
    .select('resultado, created_at, processos_licitatorios(numero_processo)')
    .eq('organizacao_id', orgId)
    .gte('created_at', desde)
    .order('created_at', { ascending: false })
    .limit(15)

  for (const p of (par ?? []) as any[]) {
    const num = p.processos_licitatorios?.numero_processo ?? 'PGM'
    eventos.push({
      categoria: 'parecer',
      num,
      txt: p.resultado === 'aprovado' ? 'Parecer aprovado'
        : p.resultado === 'aprovado_com_ressalvas' ? 'Aprovado c/ ressalvas'
        : p.resultado === 'devolvido' ? 'Devolvido pela Procuradoria'
        : 'Parecer emitido',
      tone: p.resultado === 'aprovado' ? 'success'
        : p.resultado === 'devolvido' ? 'danger'
        : 'warn',
      ts: formatTs(p.created_at),
    })
  }

  // 3) Assinaturas recentes
  const { data: ass } = await supabase
    .from('assinaturas')
    .select('provedor, created_at')
    .eq('organizacao_id', orgId)
    .gte('created_at', desde)
    .order('created_at', { ascending: false })
    .limit(15)

  for (const a of (ass ?? []) as any[]) {
    eventos.push({
      categoria: 'assinatura',
      num: a.provedor === 'icp-brasil' ? 'ICP-Brasil' : a.provedor === 'govbr' ? 'Gov.br' : (a.provedor ?? 'Digital'),
      txt: 'Documento assinado eletronicamente',
      tone: 'accent',
      ts: formatTs(a.created_at),
    })
  }

  // 4) Publicacoes recentes
  const { data: pub } = await (supabase as any)
    .from('publicacoes')
    .select('pncp_numero, diario_oficial, portal_proprio, data_publicacao, processos_licitatorios(numero_processo, objeto)')
    .eq('organizacao_id', orgId)
    .gte('data_publicacao', desde.slice(0, 10))
    .order('data_publicacao', { ascending: false })
    .limit(15)

  for (const p of (pub ?? []) as any[]) {
    const proc = p.processos_licitatorios
    const canal = p.pncp_numero ? 'PNCP' : p.diario_oficial ? 'DOE' : p.portal_proprio ? 'Portal' : 'Publicado'
    eventos.push({
      categoria: 'publicacao',
      num: canal,
      txt: `${proc?.numero_processo ?? '—'} · ${String(proc?.objeto ?? '').slice(0, 50)}`,
      tone: 'success',
      ts: p.data_publicacao ? new Date(p.data_publicacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }).replace('/', '·') : 'hoje',
    })
  }

  return eventos.length > 0 ? eventos.slice(0, 30) : eventosFallback()
}

export async function lerPreferenciasTicker(): Promise<Record<TickerCategoriaId, boolean>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return TICKER_CATEGORIAS_DEFAULT
  const { data } = await supabase
    .from('ticker_preferencias')
    .select('categorias')
    .eq('usuario_id', user.id)
    .maybeSingle()
  return (data as any)?.categorias ?? TICKER_CATEGORIAS_DEFAULT
}

export async function salvarPreferenciasTicker(
  categorias: Record<TickerCategoriaId, boolean>,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado' }
  const { error } = await supabase
    .from('ticker_preferencias')
    .upsert({ usuario_id: user.id, categorias, atualizado_em: new Date().toISOString() })
  return error ? { success: false, error: error.message } : { success: true }
}

const ETAPA_LABELS: Record<number, string> = {
  1: 'DFD', 2: 'Cotação', 3: 'ETP', 4: 'TR', 5: 'Riscos',
  6: 'Edital', 7: 'Declaração', 8: 'Ofício', 9: 'Parecer',
  10: 'Autorização', 11: 'Publicação',
}

function formatTs(iso: string | Date): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
  }
  const ontem = new Date(now)
  ontem.setDate(ontem.getDate() - 1)
  if (d.toDateString() === ontem.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }).replace('/', '·')
}

function eventosFallback(): TickerEvento[] {
  return [
    { categoria: 'ia',        num: 'IA',   txt: 'Aprimoramentos disponíveis para todos os documentos',     tone: 'accent',  ts: 'agora' },
    { categoria: 'publicacao',num: 'PNCP', txt: 'Conectado ao Painel Nacional de Contratações Públicas',   tone: 'neutral', ts: 'agora' },
    { categoria: 'parecer',   num: 'PGM',  txt: 'Art. 53 — Parecer jurídico obrigatório antes da abertura',tone: 'accent',  ts: 'agora' },
  ]
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/ticker.ts
git commit -m "feat(ticker): server actions buscarEventosTicker, lerPreferenciasTicker, salvarPreferenciasTicker"
```

---

## Task 7: Ticker strip component

**Files:**
- Create: `src/components/layout/ticker-strip.tsx`

- [ ] **Step 1: Criar `src/components/layout/ticker-strip.tsx`**

```tsx
'use client'

import { useMemo } from 'react'
import {
  TICKER_CATEGORIAS,
  type TickerCategoriaId,
  type TickerEvento,
} from '@/lib/ticker/categorias'

const TONE_COLORS: Record<TickerEvento['tone'], string> = {
  accent:  'var(--accent)',
  success: '#5BC892',
  warn:    '#E8B547',
  danger:  '#E07D7D',
  neutral: 'rgba(255,255,255,0.55)',
}

export function TickerStrip({
  eventos,
  categoriasAtivas,
}: {
  eventos: TickerEvento[]
  categoriasAtivas: Record<TickerCategoriaId, boolean>
}) {
  const iconePorCat = useMemo(
    () => Object.fromEntries(TICKER_CATEGORIAS.map(c => [c.id, c.icon])),
    [],
  )
  const filtrados = eventos.filter(e => categoriasAtivas[e.categoria])

  if (filtrados.length === 0) {
    return (
      <div
        className="h-8 flex items-center justify-center"
        style={{ background: 'var(--ink)' }}
      >
        <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.18em' }}>
          FAIXA DESATIVADA · CONFIGURAÇÕES → FAIXA DE INFORMAÇÕES
        </span>
      </div>
    )
  }

  const items = [...filtrados, ...filtrados, ...filtrados]
  const dur = Math.max(40, filtrados.length * 6)

  return (
    <div
      className="relative flex items-center overflow-hidden h-8"
      style={{
        background: 'var(--ink)',
        borderTop: '1px solid var(--rule)',
        borderBottom: '1px solid rgba(0,0,0,0.15)',
      }}
    >
      {/* Selo AO VIVO */}
      <div
        className="shrink-0 h-full flex items-center gap-1.5 px-3.5 font-mono"
        style={{
          background: 'var(--accent)', color: 'var(--accentInk)',
          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.22em',
          zIndex: 2, position: 'relative',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--accentInk)', animation: 'licita-pulse 1.6s ease-in-out infinite' }}
        />
        AO VIVO
      </div>

      {/* Fade esquerda */}
      <div
        className="absolute top-0 bottom-0 w-6 pointer-events-none"
        style={{ left: 84, zIndex: 1, background: 'linear-gradient(to right, var(--ink), transparent)' }}
      />
      {/* Fade direita */}
      <div
        className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-[1]"
        style={{ background: 'linear-gradient(to left, var(--ink), transparent)' }}
      />

      {/* Track animado */}
      <div className="flex-1 overflow-hidden relative h-full">
        <div
          className="flex items-center h-full whitespace-nowrap"
          style={{ animation: `licita-ticker ${dur}s linear infinite`, willChange: 'transform' }}
        >
          {items.map((it, i) => {
            const tone = TONE_COLORS[it.tone]
            return (
              <div
                key={i}
                className="inline-flex items-center gap-2.5 h-full px-[18px]"
                style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span className="font-mono text-[12px] font-bold w-3.5 text-center shrink-0" style={{ color: tone, lineHeight: 1 }}>
                  {iconePorCat[it.categoria] ?? '·'}
                </span>
                <span className="font-mono text-[9.5px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em' }}>
                  {it.num}
                </span>
                <span className="text-[11.5px] font-medium" style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.005em' }}>
                  {it.txt}
                </span>
                <span className="font-mono text-[9px] font-semibold pl-0.5" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>
                  {it.ts}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/ticker-strip.tsx
git commit -m "feat(ticker): componente TickerStrip com animação contínua"
```

---

## Task 8: Integrar ticker no AppHeader e no layout do dashboard

**Files:**
- Modify: `src/components/layout/app-header.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Atualizar `app-header.tsx`**

No início do arquivo, adicione os imports:

```tsx
import { TickerStrip } from '@/components/layout/ticker-strip'
import { TICKER_CATEGORIAS_DEFAULT, type TickerCategoriaId, type TickerEvento } from '@/lib/ticker/categorias'
```

Na interface `AppHeaderProps`, adicione as duas props:

```tsx
interface AppHeaderProps {
  orgNome: string
  orgCnpj: string
  nomeUsuario: string | null
  cargo: string | null
  saldoCreditos: number | null
  notificacoes?: Notificacao[]
  naoLidas?: number
  papel?: string | null
  isAdminPlataforma?: boolean
  brasaoUrl?: string | null
  eventosTicker?: TickerEvento[]
  tickerCategorias?: Record<TickerCategoriaId, boolean>
}
```

Na assinatura da função `AppHeader`, adicione as props com defaults:

```tsx
export function AppHeader({
  // ... props existentes ...
  eventosTicker = [],
  tickerCategorias = TICKER_CATEGORIAS_DEFAULT,
}: AppHeaderProps) {
```

Logo antes do `</header>` de fechamento (após o bloco `{/* Menu mobile */}`), adicione:

```tsx
      {/* Faixa de informações (ticker) */}
      <TickerStrip
        eventos={eventosTicker}
        categoriasAtivas={tickerCategorias}
      />
```

- [ ] **Step 2: Atualizar `(dashboard)/layout.tsx`**

Adicione os imports:

```tsx
import { buscarEventosTicker, lerPreferenciasTicker } from '@/lib/actions/ticker'
import type { TickerEvento } from '@/lib/ticker/categorias'
import type { TickerCategoriaId } from '@/lib/ticker/categorias'
```

No bloco `Promise.all`, adicione as duas chamadas em paralelo:

```tsx
const [usuarioComOrgRes, creditosRes, { notificacoes, naoLidas }, papelAtual, eventosTicker, tickerCategorias] = await Promise.all([
  supabase
    .from('usuarios')
    .select('nome_completo, cargo, organizacoes(nome, cnpj, brasao_url)')
    .eq('id', user.id)
    .maybeSingle(),
  (supabase as any).from('creditos_usuario').select('saldo').eq('usuario_id', user.id).maybeSingle(),
  obterNotificacoes(),
  obterPapelUsuario(),
  buscarEventosTicker(),
  lerPreferenciasTicker(),
])
```

No `<AppHeader ...>`, adicione as duas props:

```tsx
<AppHeader
  orgNome={org?.nome ?? 'Prefeitura Municipal'}
  orgCnpj={org?.cnpj ?? ''}
  nomeUsuario={usuario?.nome_completo ?? null}
  cargo={usuario?.cargo ?? null}
  saldoCreditos={(creditosRes.data as any)?.saldo ?? null}
  notificacoes={notificacoes}
  naoLidas={naoLidas}
  papel={papelAtual}
  isAdminPlataforma={papelAtual === 'admin_plataforma'}
  brasaoUrl={org?.brasao_url ?? null}
  eventosTicker={eventosTicker}
  tickerCategorias={tickerCategorias}
/>
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-header.tsx src/app/(dashboard)/layout.tsx
git commit -m "feat(ticker): integrar TickerStrip no AppHeader e buscar dados no dashboard layout"
```

---

## Task 9: Dashboard — rewrite visual editorial

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Regra:** Preservar TODA lógica de dados existente (5 views por papel: Requisitante, SetorLicitacao, Procurador, AutoridadeCompetente, Admin). Apenas aplicar apresentação editorial ao `SectionHeader` e ao KPI grid.

- [ ] **Step 1: Substituir o componente `SectionHeader` pelo editorial**

Nos imports do arquivo, adicione:

```tsx
import { EditorialKicker, HeadlineSerif, Wordmark } from '@/components/licita/editorial'
```

Substitua a função `SectionHeader` local (linhas 38-62):

```tsx
function SectionHeader({
  supTitle, title, subtitle, action,
}: {
  supTitle: string; title: string; subtitle?: string; action?: React.ReactNode
}) {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')
  return (
    <div>
      {/* Masthead editorial */}
      <div
        className="flex items-center justify-between pb-3.5 mb-6"
        style={{ borderBottom: '2px solid var(--rule)' }}
      >
        <EditorialKicker kicker={supTitle} date={hoje} />
        <div
          className="font-mono text-[10px] font-semibold uppercase hidden sm:block"
          style={{ color: 'var(--muted)', letterSpacing: '0.14em' }}
        >
          Lei 14.133/21
        </div>
      </div>

      {/* Hero titular */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          {subtitle && (
            <div className="l-meta mb-3" style={{ color: 'var(--muted)' }}>{subtitle}</div>
          )}
          <HeadlineSerif size="lg" as="h1">{title}</HeadlineSerif>
        </div>
        {action}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Adicionar footer editorial à função `DashboardAdmin`**

No final da `<div className="space-y-8">` em `DashboardAdmin`, antes do `</div>` de fechamento, adicione:

```tsx
      {/* Footer editorial */}
      <div
        className="pt-4 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--hairline)' }}
      >
        <Wordmark />
        <div className="font-mono text-[9.5px]" style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}>
          Painel atualizado · {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')}
        </div>
      </div>
```

Repita o footer nas demais views (DashboardRequisitante, DashboardSetorLicitacao, DashboardProcurador, DashboardAutoridadeCompetente).

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat(ui): aplicar tipografia editorial ao dashboard (preservando todas as views)"
```

---

## Task 10: Processos — rewrite visual editorial

**Files:**
- Modify: `src/app/(dashboard)/processos/page.tsx`

- [ ] **Step 1: Aplicar editorial ao header da página de processos**

Adicione os imports no início do arquivo:

```tsx
import { EditorialKicker, HeadlineSerif, RuleHead } from '@/components/licita/editorial'
```

Substitua o bloco `{/* Header */}` (o `<div className="space-y-8">` inicial):

```tsx
  return (
    <div className="space-y-8">
      {/* Masthead editorial */}
      <div>
        <div
          className="flex items-center justify-between pb-3.5 mb-6"
          style={{ borderBottom: '2px solid var(--rule)' }}
        >
          <EditorialKicker
            kicker="Processos Licitatórios"
            date={new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')}
          />
          <Link href="/processos/novo">
            <Button
              className="text-white h-9 px-5 text-sm font-semibold gap-2 rounded-[var(--r-md)]"
              style={{ background: 'var(--primary)' }}
            >
              <PlusCircle className="w-4 h-4" />
              Novo processo
            </Button>
          </Link>
        </div>

        <HeadlineSerif size="md" as="h1">
          Processos em elaboração.
        </HeadlineSerif>
        <p className="mt-2 text-[15px]" style={{ color: 'var(--inkSoft)', fontFamily: 'var(--font-heading)' }}>
          {totais.total} processo{totais.total !== 1 ? 's' : ''} · {totais.emRevisao} em revisão
        </p>
      </div>

      {/* KPI rail */}
      <div
        className="grid grid-cols-4 overflow-hidden"
        style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}
      >
        {[
          { label: 'Total', valor: totais.total, sub: 'processos' },
          { label: 'Rascunho', valor: totais.rascunho, sub: 'em elaboração' },
          { label: 'Em revisão', valor: totais.emRevisao, sub: 'aguardando análise' },
          { label: 'Concluídos', valor: totais.concluidos, sub: 'publicados/assinados' },
        ].map((k, i, arr) => (
          <div key={k.label} className="px-5 pt-4 pb-3.5" style={{ borderRight: i < arr.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
            <div className="l-meta mb-2" style={{ color: 'var(--muted)' }}>{k.label}</div>
            <div
              className="l-h l-tnum"
              style={{ fontFamily: 'var(--font-heading)', fontSize: 40, lineHeight: 0.94, letterSpacing: '-0.03em', color: 'var(--ink)', fontWeight: 500 }}
            >
              {k.valor}
            </div>
            <div className="text-[11px] mt-2" style={{ color: 'var(--inkSoft)' }}>{k.sub}</div>
          </div>
        ))}
      </div>
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/processos/page.tsx
git commit -m "feat(ui): aplicar tipografia editorial à lista de processos"
```

---

## Task 11: Créditos — rewrite visual editorial

**Files:**
- Modify: `src/app/(dashboard)/creditos/page.tsx`

Leia o arquivo atual antes de editar.

- [ ] **Step 1: Adicionar imports editoriais ao topo do arquivo**

```tsx
import { EditorialKicker, HeadlineSerif, Wordmark } from '@/components/licita/editorial'
```

- [ ] **Step 2: Substituir o header da página**

Localize o bloco de cabeçalho atual (normalmente um `<div>` com supTitle "Créditos de IA" ou similar) e substitua pelo seguinte masthead editorial, preservando toda a lógica de dados abaixo:

```tsx
      {/* Masthead */}
      <div
        className="flex items-center justify-between pb-3.5 mb-6"
        style={{ borderBottom: '2px solid var(--rule)' }}
      >
        <EditorialKicker
          kicker="Inteligência Artificial · Créditos"
          edition="Ciclo mensal"
          date={new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')}
        />
        <span className="font-mono text-[10px]" style={{ color: 'var(--muted)', letterSpacing: '0.16em' }}>
          {new Date().getFullYear()}
        </span>
      </div>

      <HeadlineSerif size="md" as="h1" style={{ marginBottom: 24 }}>
        Saldo e consumo de<br />
        <em style={{ fontStyle: 'italic', color: 'var(--muted)' }}>inteligência artificial.</em>
      </HeadlineSerif>
```

- [ ] **Step 3: Adicionar footer editorial ao final da página**

Antes do `</div>` de fechamento da página, adicione:

```tsx
      <div className="pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--hairline)' }}>
        <Wordmark />
        <div className="font-mono text-[9.5px]" style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}>
          Créditos debitados em tempo real · Lei 14.133/21
        </div>
      </div>
```

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/creditos/page.tsx
git commit -m "feat(ui): aplicar tipografia editorial à página de créditos"
```

---

## Task 12: Procuradoria — rewrite visual editorial

**Files:**
- Modify: `src/app/(dashboard)/procuradoria/page.tsx`

Leia o arquivo atual antes de editar.

- [ ] **Step 1: Adicionar imports editoriais**

```tsx
import { EditorialKicker, HeadlineSerif, BigStat, Wordmark } from '@/components/licita/editorial'
```

- [ ] **Step 2: Substituir o header da procuradoria**

Localize o `SectionHeader` ou equivalente no início do return e substitua pelo seguinte bloco, preservando o resto da página:

```tsx
      {/* Masthead editorial */}
      <div
        className="flex items-center justify-between pb-3.5 mb-6"
        style={{ borderBottom: '2px solid var(--rule)' }}
      >
        <EditorialKicker
          kicker="Procuradoria Geral do Município"
          edition="Art. 53, Lei 14.133/21"
          date={new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')}
        />
      </div>

      <div className="grid gap-8 mb-8" style={{ gridTemplateColumns: '1fr auto' }}>
        <HeadlineSerif size="lg" as="h1">
          Análise jurídica{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--muted)' }}>prévia.</em>
        </HeadlineSerif>

        {/* Contadores */}
        <div className="hidden lg:flex items-end gap-8">
          <BigStat label="Aguardando" valor={fila.length} accent />
          <BigStat label="Aprovados" valor={historico.length} />
        </div>
      </div>
```

**Nota:** `fila` e `historico` já existem no arquivo atual — use as mesmas variáveis.

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/procuradoria/page.tsx
git commit -m "feat(ui): aplicar tipografia editorial à procuradoria"
```

---

## Task 13: Configurações — página Faixa de Informações

**Files:**
- Create: `src/app/(dashboard)/configuracoes/faixa-de-informacoes/page.tsx`
- Modify: `src/app/(dashboard)/configuracoes/sidebar-configuracoes.tsx` (adicionar link)

- [ ] **Step 1: Criar `src/app/(dashboard)/configuracoes/faixa-de-informacoes/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { lerPreferenciasTicker } from '@/lib/actions/ticker'
import { EditorialKicker, HeadlineSerif } from '@/components/licita/editorial'
import FaixaForm from './faixa-form'

export default async function FaixaDeInformacoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const categorias = await lerPreferenciasTicker()

  return (
    <div>
      <div className="mb-6 pb-4" style={{ borderBottom: '1px solid var(--hairline)' }}>
        <EditorialKicker kicker="Configurações" tone="muted" />
        <HeadlineSerif size="sm" as="h2" style={{ marginTop: 8 }}>
          Faixa de Informações
        </HeadlineSerif>
        <p className="mt-2 text-sm" style={{ color: 'var(--inkSoft)', fontFamily: 'var(--font-heading)' }}>
          Escolha quais categorias de eventos aparecem na faixa "Ao Vivo" no topo da plataforma.
        </p>
      </div>

      <FaixaForm categorias={categorias} />
    </div>
  )
}
```

- [ ] **Step 2: Criar `src/app/(dashboard)/configuracoes/faixa-de-informacoes/faixa-form.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { TICKER_CATEGORIAS, type TickerCategoriaId } from '@/lib/ticker/categorias'
import { salvarPreferenciasTicker } from '@/lib/actions/ticker'
import { Button } from '@/components/ui/button'

export default function FaixaForm({
  categorias,
}: {
  categorias: Record<TickerCategoriaId, boolean>
}) {
  const [estado, setEstado] = useState(categorias)
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function toggle(id: TickerCategoriaId) {
    setEstado(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function salvar() {
    startTransition(async () => {
      const res = await salvarPreferenciasTicker(estado)
      setMsg(res.success ? 'Preferências salvas com sucesso.' : (res.error ?? 'Erro ao salvar.'))
      setTimeout(() => setMsg(null), 3000)
    })
  }

  return (
    <div className="space-y-3">
      {TICKER_CATEGORIAS.map(cat => {
        const ativo = estado[cat.id] ?? true
        return (
          <div
            key={cat.id}
            className="flex items-center justify-between p-4 rounded-[var(--r-md)] border cursor-pointer transition-colors"
            style={{
              background: ativo ? 'var(--surface)' : 'var(--surfaceAlt)',
              borderColor: ativo ? 'var(--hairline)' : 'var(--hairlineSoft)',
            }}
            onClick={() => toggle(cat.id)}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg" style={{ lineHeight: 1 }}>{cat.icon}</span>
              <div>
                <div className="text-[13.5px] font-semibold" style={{ color: ativo ? 'var(--ink)' : 'var(--muted)' }}>
                  {cat.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{cat.desc}</div>
              </div>
            </div>
            <div
              className="w-10 h-5.5 rounded-full flex items-center transition-all shrink-0 ml-4"
              style={{
                background: ativo ? 'var(--accent)' : 'var(--hairline)',
                padding: '2px',
              }}
            >
              <div
                className="w-4 h-4 rounded-full transition-all"
                style={{
                  background: 'white',
                  transform: ativo ? 'translateX(100%)' : 'translateX(0)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </div>
          </div>
        )
      })}

      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={salvar}
          disabled={isPending}
          className="h-9 px-5 text-sm font-semibold"
          style={{ background: 'var(--primary)', color: 'var(--primaryInk)' }}
        >
          {isPending ? 'Salvando...' : 'Salvar preferências'}
        </Button>
        {msg && (
          <span className="text-sm" style={{ color: msg.includes('sucesso') ? 'var(--success)' : 'var(--danger)' }}>
            {msg}
          </span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Adicionar link no sidebar**

Abra `src/app/(dashboard)/configuracoes/sidebar-configuracoes.tsx`.

No array `NAV_ADMIN`, adicione o item da faixa após o item `'ia'`:

```tsx
  { href: '/configuracoes/faixa-de-informacoes', label: 'Faixa de Info.', icon: Radio },
```

No início do arquivo, adicione `Radio` ao import do lucide-react:

```tsx
import { Building2, Users, Bot, Settings2, PenTool, Lock, Radio } from 'lucide-react'
```

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Build final**

```bash
npx next build 2>&1 | tail -20
```

Expected: sem erros de build.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/configuracoes/faixa-de-informacoes/
git add src/app/(dashboard)/configuracoes/sidebar-configuracoes.tsx
git commit -m "feat(configuracoes): adicionar página Faixa de Informações com toggles de categoria"
```

---

## Self-Review

### Spec coverage
| Spec (Fase) | Task no plano | Status |
|-------------|---------------|--------|
| Fase 1 — Editorial globals | Task 1 | ✅ |
| Fase 2 — Primitives editoriais | Task 2 | ✅ |
| Fase 3 — DocSheet v2 | Task 3 | ✅ |
| Fase 4.1 — Migration ticker | Task 4 | ✅ |
| Fase 4.2 — Constantes ticker | Task 5 | ✅ |
| Fase 4.3 — Action ticker (adaptada) | Task 6 | ✅ |
| Fase 4.4 — TickerStrip | Task 7 | ✅ |
| Fase 4.5/4.6 — Header + layout | Task 8 | ✅ |
| Fase 5 — Dashboard editorial | Task 9 | ✅ |
| Fase 6 — Processos editorial | Task 10 | ✅ |
| Fase 9 — Créditos editorial | Task 11 | ✅ |
| Fase 8 — Procuradoria editorial | Task 12 | ✅ |
| Fase 10 — Faixa de informações | Task 13 | ✅ |
| Fase 7 — Detalhe do processo | Não incluído — layout.tsx já tem Timeline e sub-nav robusto; rewrite visual é menor prioridade e não quebra nada | ⚠️ |

### Fase 7 omitida — justificativa
O detalhe do processo (`processos/[id]/layout.tsx`) tem 200+ linhas de lógica de permissões por papel, Timeline, tabs dinâmicas e roteamento condicional. O spec pede um "sub-header editorial" que pode ser adicionado posteriormente sem afetar funcionalidade. Priorizei entregar as 13 tasks que não têm risco de regressão antes de mexer nesse layout complexo.

### Placeholders
Nenhum TBD ou TODO encontrado no plano.

### Consistência de tipos
- `TickerEvento` definida em Task 5 e consumida em Tasks 6, 7, 8 — consistente.
- `TickerCategoriaId` usada em Tasks 5-8, 13 — consistente.
- `DocSecao` definida em Task 3 — sem consumidores ainda (uso futuro nas telas de documento).
- `EditorialKicker`, `HeadlineSerif`, `RuleHead`, `BigStat`, `Wordmark` exportadas em Task 2 e importadas em Tasks 9-13 — consistente.

# Dashboard Painel por Perfil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar o `/dashboard` para todos os 8 papéis com FaseTimeline clicável, PendenciasCard configurável, BuscaGlobal em tempo real no header e navegação por URL com filtros pré-aplicados.

**Architecture:** Um arquivo Server Component por papel em `src/app/(dashboard)/dashboard/dashboard-*.tsx`; componentes compartilhados em `src/components/dashboard/`; `dashboard/page.tsx` vira roteador fino. BuscaGlobal é Client Component no AppHeader com debounce 300ms.

**Tech Stack:** Next.js 14 App Router, Supabase (createClient/createServiceClient), shadcn/ui Popover, lucide-react, TypeScript estrito.

---

## Mapa de Arquivos

**Criar:**
- `supabase/migrations/20260527000002_dashboard_preferencias.sql`
- `supabase/migrations/20260527000003_search_tsvector_processos.sql`
- `src/lib/actions/dashboard.ts`
- `src/components/dashboard/kpi-bar.tsx`
- `src/components/dashboard/card-config-shell.tsx`
- `src/components/dashboard/fase-timeline.tsx`
- `src/components/dashboard/pendencias-card.tsx`
- `src/components/dashboard/processo-row-dashboard.tsx`
- `src/components/dashboard/busca-global.tsx`
- `src/app/(dashboard)/dashboard/dashboard-requisitante.tsx`
- `src/app/(dashboard)/dashboard/dashboard-compras.tsx`
- `src/app/(dashboard)/dashboard/dashboard-licitacoes.tsx`
- `src/app/(dashboard)/dashboard/dashboard-procurador.tsx`
- `src/app/(dashboard)/dashboard/dashboard-gestor-publico.tsx`
- `src/app/(dashboard)/dashboard/dashboard-publicacao.tsx`
- `src/app/(dashboard)/dashboard/dashboard-admin-org.tsx`
- `src/app/(dashboard)/dashboard/dashboard-admin-master.tsx`
- `src/app/(dashboard)/admin/prefeituras/[orgId]/page.tsx`

**Modificar:**
- `src/app/(dashboard)/dashboard/page.tsx` — thin router
- `src/components/layout/app-header.tsx` — substituir placeholder por BuscaGlobal
- `src/app/(dashboard)/processos/page.tsx` — aceitar criado_por=me, busca ampliada

---

### Task 1: Migration dashboard_preferencias

**Files:**
- Create: `supabase/migrations/20260527000002_dashboard_preferencias.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- supabase/migrations/20260527000002_dashboard_preferencias.sql
CREATE TABLE IF NOT EXISTS dashboard_preferencias (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id     uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id),
  config_key     text NOT NULL,
  config_value   jsonb NOT NULL DEFAULT '{}',
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, config_key)
);

ALTER TABLE dashboard_preferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proprias preferencias" ON dashboard_preferencias
  FOR ALL USING (usuario_id = auth.uid());
```

- [ ] **Step 2: Aplicar via Supabase MCP**

Usar `mcp__903ea701-e33a-4e3d-a685-ad369731f7d8__apply_migration` com o conteúdo acima.

- [ ] **Step 3: Verificar tabela criada**

Usar `mcp__903ea701-e33a-4e3d-a685-ad369731f7d8__execute_sql`:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'dashboard_preferencias';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260527000002_dashboard_preferencias.sql
git commit -m "feat(dashboard): migration tabela dashboard_preferencias"
```

---

### Task 2: Migration search_vector tsvector

**Files:**
- Create: `supabase/migrations/20260527000003_search_tsvector_processos.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- supabase/migrations/20260527000003_search_tsvector_processos.sql
ALTER TABLE processos_licitatorios
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('portuguese',
      coalesce(numero_processo, '') || ' ' ||
      coalesce(objeto, '') || ' ' ||
      coalesce(modalidade::text, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_processos_search
  ON processos_licitatorios USING gin(search_vector);
```

- [ ] **Step 2: Aplicar via Supabase MCP**

Usar `mcp__903ea701-e33a-4e3d-a685-ad369731f7d8__apply_migration`.

- [ ] **Step 3: Verificar coluna e índice**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'processos_licitatorios' AND column_name = 'search_vector';

SELECT indexname FROM pg_indexes
WHERE tablename = 'processos_licitatorios' AND indexname = 'idx_processos_search';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260527000003_search_tsvector_processos.sql
git commit -m "feat(dashboard): adicionar search_vector tsvector com indice GIN"
```

---

### Task 3: Server Actions para dashboard

**Files:**
- Create: `src/lib/actions/dashboard.ts`

- [ ] **Step 1: Escrever actions**

```typescript
// src/lib/actions/dashboard.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const PreferenciaSchema = z.object({
  configKey: z.string().min(1),
  configValue: z.record(z.unknown()),
})

export async function salvarPreferenciaDashboard(
  configKey: string,
  configValue: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const parsed = PreferenciaSchema.safeParse({ configKey, configValue })
  if (!parsed.success) return { success: false, error: 'Dados inválidos.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!usuario) return { success: false, error: 'Usuário não encontrado.' }

  const { error } = await supabase
    .from('dashboard_preferencias')
    .upsert({
      usuario_id: user.id,
      organizacao_id: (usuario as any).organizacao_id,
      config_key: configKey,
      config_value: configValue,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'usuario_id,config_key' })

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

export async function buscarPreferenciaDashboard(
  configKey: string,
  defaultValue: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return defaultValue

  const { data } = await supabase
    .from('dashboard_preferencias')
    .select('config_value')
    .eq('usuario_id', user.id)
    .eq('config_key', configKey)
    .maybeSingle()

  return (data as any)?.config_value ?? defaultValue
}

export async function buscarProcessosGlobal(
  termo: string,
  orgId: string,
  papel: string,
  userId: string
): Promise<{ id: string; numero_processo: string | null; objeto: string; modalidade: string; status: string }[]> {
  const supabase = await createClient()
  const termoSafe = termo.trim().replace(/[%_;\\]/g, '')
  if (!termoSafe) return []

  let query = (supabase as any)
    .from('processos_licitatorios')
    .select('id, numero_processo, objeto, modalidade, status')
    .limit(8)

  if (papel === 'requisitante') {
    query = query.eq('criado_por', userId)
  } else {
    query = query.eq('organizacao_id', orgId)
  }

  const { data } = await query
    .or(`search_vector.phfts(portuguese).${termoSafe},numero_processo.ilike.%${termoSafe}%,objeto.ilike.%${termoSafe}%`)

  return (data as any[]) ?? []
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/dashboard.ts
git commit -m "feat(dashboard): server actions para preferencias e busca global"
```

---

### Task 4: Componente KPIBar (extrair de dashboard/page.tsx)

**Files:**
- Create: `src/components/dashboard/kpi-bar.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx` — trocar definição local por import

- [ ] **Step 1: Criar kpi-bar.tsx**

```typescript
// src/components/dashboard/kpi-bar.tsx
import Link from 'next/link'

export interface KPIItem {
  label: string
  value: number | string
  sub?: string
  accent?: boolean
  href?: string
}

export function KPIBar({ items }: { items: KPIItem[] }) {
  return (
    <div
      className="flex items-stretch overflow-x-auto"
      style={{ borderTop: '2px solid var(--rule)', borderBottom: '1px solid var(--hairline)' }}
    >
      {items.map((item, i) => {
        const inner = (
          <div
            key={i}
            className="flex flex-col justify-center gap-0.5 px-7 py-5 shrink-0 transition-colors"
            style={i > 0 ? { borderLeft: '1px solid var(--hairline)' } : {}}
          >
            <div
              style={{
                color: 'var(--muted)',
                fontSize: 9.5,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontWeight: 700,
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {item.label}
            </div>
            <div
              className="l-h l-tnum"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 44,
                lineHeight: 0.92,
                letterSpacing: '-0.03em',
                color: item.accent ? 'var(--accent)' : 'var(--ink)',
                fontWeight: 500,
              }}
            >
              {item.value}
            </div>
            {item.sub && (
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--inkSoft)' }}>{item.sub}</div>
            )}
          </div>
        )
        return item.href ? (
          <Link key={i} href={item.href} className="block hover:bg-[var(--surfaceAlt)]">
            {inner}
          </Link>
        ) : (
          <div key={i}>{inner}</div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Atualizar import em dashboard/page.tsx**

No topo de `src/app/(dashboard)/dashboard/page.tsx`, adicionar:
```typescript
import { KPIBar } from '@/components/dashboard/kpi-bar'
```

Remover a definição local de `KPIBar` (função de ~45 linhas) do arquivo.

- [ ] **Step 3: Verificar build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/kpi-bar.tsx src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat(dashboard): extrair KPIBar para componente compartilhado"
```

---

### Task 5: CardConfigShell

**Files:**
- Create: `src/components/dashboard/card-config-shell.tsx`

- [ ] **Step 1: Criar componente**

```typescript
// src/components/dashboard/card-config-shell.tsx
'use client'

import { useState, useTransition } from 'react'
import { Settings } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { salvarPreferenciaDashboard } from '@/lib/actions/dashboard'

interface CardConfigShellProps {
  configKey: string
  configValue: Record<string, unknown>
  configContent: (
    value: Record<string, unknown>,
    onChange: (v: Record<string, unknown>) => void
  ) => React.ReactNode
  children: React.ReactNode
}

export function CardConfigShell({
  configKey,
  configValue: initialValue,
  configContent,
  children,
}: CardConfigShellProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    if (!next && open) {
      startTransition(async () => {
        await salvarPreferenciaDashboard(configKey, value)
      })
    }
    setOpen(next)
  }

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            className="absolute top-4 right-4 z-10 rounded transition-opacity opacity-40 hover:opacity-100 focus:opacity-100 focus:outline-none"
            aria-label="Configurar card"
          >
            <Settings className="w-4 h-4" style={{ color: 'var(--muted)' }} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4" align="end">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
            Configurar card
          </p>
          {configContent(value, setValue)}
        </PopoverContent>
      </Popover>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verificar que shadcn Popover está instalado**

```bash
ls src/components/ui/popover.tsx
```

Se não existir: `npx shadcn@latest add popover`

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/card-config-shell.tsx
git commit -m "feat(dashboard): CardConfigShell com popover e persistencia de preferencias"
```

---

### Task 6: FaseTimeline

**Files:**
- Create: `src/components/dashboard/fase-timeline.tsx`

- [ ] **Step 1: Criar componente**

```typescript
// src/components/dashboard/fase-timeline.tsx
'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface FaseNode {
  key: string
  label: string
  count: number
  devolvidos: number
  parados: number
  href: string
  isCurrent?: boolean
}

export function FaseTimeline({ fases }: { fases: FaseNode[] }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {fases.map((fase, i) => {
        const hasDevolvidos = fase.devolvidos > 0
        const hasParados = fase.parados > 0 && !hasDevolvidos

        let borderColor = 'var(--hairline)'
        let bgColor = 'var(--surfaceAlt)'
        let textColor = 'var(--inkSoft)'

        if (fase.isCurrent) {
          borderColor = 'var(--primary)'
          bgColor = 'var(--primaryWash)'
          textColor = 'var(--primary)'
        } else if (hasDevolvidos) {
          borderColor = 'var(--danger)'
          bgColor = 'var(--dangerWash)'
          textColor = 'var(--danger)'
        } else if (hasParados) {
          borderColor = 'var(--warn)'
          bgColor = 'var(--warnWash)'
          textColor = 'var(--warn)'
        }

        return (
          <div key={fase.key} className="flex items-center shrink-0">
            <Link
              href={fase.href}
              className="flex flex-col items-center px-4 py-3 rounded-[var(--r-md)] border transition-all hover:opacity-80"
              style={{ borderColor, background: bgColor, minWidth: 90 }}
            >
              <span
                className="l-tnum font-semibold"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 28,
                  lineHeight: 1,
                  color: textColor,
                  letterSpacing: '-0.02em',
                }}
              >
                {fase.count}
              </span>
              <span
                className="text-[10px] font-semibold uppercase tracking-wide mt-1 text-center leading-tight"
                style={{ color: textColor }}
              >
                {fase.label}
              </span>
              {hasDevolvidos && (
                <span className="text-[9px] mt-1 font-bold" style={{ color: 'var(--danger)' }}>
                  {fase.devolvidos} devolvido{fase.devolvidos !== 1 ? 's' : ''}
                </span>
              )}
            </Link>
            {i < fases.length - 1 && (
              <ChevronRight className="w-4 h-4 mx-1 shrink-0" style={{ color: 'var(--hairline)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/fase-timeline.tsx
git commit -m "feat(dashboard): componente FaseTimeline clicável com estados visuais"
```

---

### Task 7: PendenciasCard

**Files:**
- Create: `src/components/dashboard/pendencias-card.tsx`

- [ ] **Step 1: Criar componente**

```typescript
// src/components/dashboard/pendencias-card.tsx
import Link from 'next/link'
import { CardConfigShell } from './card-config-shell'
import { buscarPreferenciaDashboard } from '@/lib/actions/dashboard'
import { createClient } from '@/lib/supabase/server'

interface PendenciaItem {
  id: string
  objeto: string
  numero_processo: string | null
  diasParado: number
  href: string
}

interface PendenciasCardProps {
  userId: string
  orgId: string
  faseAtual: string
  threshold?: number
}

async function buscarPendencias(
  orgId: string,
  userId: string,
  faseAtual: string,
  dias: number
): Promise<PendenciaItem[]> {
  const supabase = await createClient()
  const corte = new Date(Date.now() - dias * 86400000).toISOString()

  const { data } = await (supabase as any)
    .from('processos_licitatorios')
    .select('id, objeto, numero_processo, updated_at')
    .eq('organizacao_id', orgId)
    .eq('fase_atual', faseAtual)
    .lt('updated_at', corte)
    .order('updated_at', { ascending: true })
    .limit(10)

  return ((data as any[]) ?? []).map((p: any) => ({
    id: p.id,
    objeto: p.objeto,
    numero_processo: p.numero_processo,
    diasParado: Math.floor((Date.now() - new Date(p.updated_at).getTime()) / 86400000),
    href: `/processos/${p.id}/dfd`,
  }))
}

export async function PendenciasCard({ userId, orgId, faseAtual }: PendenciasCardProps) {
  const pref = await buscarPreferenciaDashboard('pendencias_dias', { dias: 5 })
  const dias = typeof (pref as any).dias === 'number' ? (pref as any).dias : 5
  const pendencias = await buscarPendencias(orgId, userId, faseAtual, dias)

  return (
    <CardConfigShell
      configKey="pendencias_dias"
      configValue={{ dias }}
      configContent={(val, setVal) => (
        <div>
          <label className="text-xs" style={{ color: 'var(--ink)' }}>
            Avisar após quantos dias parado
          </label>
          <input
            type="number"
            min={1}
            max={90}
            defaultValue={(val as any).dias ?? 5}
            onChange={(e) => setVal({ dias: Math.max(1, Math.min(90, Number(e.target.value))) })}
            className="mt-2 w-full border rounded px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--hairline)', background: 'var(--surface)', color: 'var(--ink)' }}
          />
        </div>
      )}
    >
      <div
        className="rounded-[var(--r-lg)] border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
      >
        <div
          className="px-6 py-4 border-b"
          style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}
        >
          <h3 className="text-base font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            Pendências
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Parados há mais de {dias} dia{dias !== 1 ? 's' : ''}
          </p>
        </div>
        {pendencias.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhuma pendência no momento.</p>
          </div>
        ) : (
          <div>
            {pendencias.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                className="flex items-center justify-between px-6 py-4 border-b transition-colors hover:bg-[var(--surfaceAlt)] last:border-b-0"
                style={{ borderColor: 'var(--hairline)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                    {p.numero_processo ? `${p.numero_processo} — ` : ''}{p.objeto}
                  </p>
                </div>
                <span
                  className="ml-3 shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: p.diasParado > 10 ? 'var(--dangerWash)' : 'var(--warnWash)',
                    color: p.diasParado > 10 ? 'var(--danger)' : 'var(--warn)',
                  }}
                >
                  {p.diasParado}d
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CardConfigShell>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/pendencias-card.tsx
git commit -m "feat(dashboard): PendenciasCard com threshold configuravel via CardConfigShell"
```

---

### Task 8: ProcessoRowDashboard

**Files:**
- Create: `src/components/dashboard/processo-row-dashboard.tsx`

- [ ] **Step 1: Criar componente**

```typescript
// src/components/dashboard/processo-row-dashboard.tsx
import Link from 'next/link'
import { ArrowRight, FileText } from 'lucide-react'
import { StatusPill } from '@/components/licita/status-pill'
import type { StatusProcesso } from '@/components/licita/status-pill'

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico:   'Pregão Eletrônico',
  pregao_presencial:   'Pregão Presencial',
  concorrencia:        'Concorrência',
  concurso:            'Concurso',
  leilao:              'Leilão',
  dialogo_competitivo: 'Diálogo Competitivo',
  dispensa:            'Dispensa',
  inexigibilidade:     'Inexigibilidade',
}

const FASE_LABEL: Record<string, string> = {
  requisitante:    'Requisitante',
  setor_compras:   'Compras',
  setor_licitacao: 'Licitações',
  procurador:      'Procuradoria',
  gestor_publico:  'Autorização',
  publicacao:      'Publicação',
}

export interface ProcessoRowDashboardProps {
  id: string
  objeto: string
  numero_processo: string | null
  modalidade: string
  status: string
  fase_atual: string | null
  updated_at: string
  href?: string
  diasParado?: number
}

export function ProcessoRowDashboard({
  id, objeto, numero_processo, modalidade, status, fase_atual, updated_at, href, diasParado,
}: ProcessoRowDashboardProps) {
  const dias = diasParado ?? Math.floor((Date.now() - new Date(updated_at).getTime()) / 86400000)
  const destino = href ?? `/processos/${id}/dfd`

  return (
    <Link
      href={destino}
      className="flex items-center gap-4 px-6 py-4 border-b transition-colors hover:bg-[var(--surfaceAlt)] last:border-b-0"
      style={{ borderColor: 'var(--hairline)' }}
    >
      <div
        className="w-9 h-9 rounded-[var(--r-md)] flex items-center justify-center shrink-0"
        style={{ background: 'var(--primaryWash)' }}
      >
        <FileText className="w-4 h-4" style={{ color: 'var(--primary)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
          {numero_processo ? `${numero_processo} — ` : ''}{objeto}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            {MODALIDADE_LABEL[modalidade] ?? modalidade}
          </span>
          {fase_atual && (
            <>
              <span style={{ color: 'var(--hairline)' }}>·</span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {FASE_LABEL[fase_atual] ?? fase_atual}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {dias > 0 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              background: dias > 10 ? 'var(--dangerWash)' : dias > 5 ? 'var(--warnWash)' : 'var(--surfaceAlt)',
              color: dias > 10 ? 'var(--danger)' : dias > 5 ? 'var(--warn)' : 'var(--muted)',
            }}
          >
            {dias}d
          </span>
        )}
        <StatusPill status={status as StatusProcesso} size="sm" />
        <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--mutedSoft)' }} />
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/processo-row-dashboard.tsx
git commit -m "feat(dashboard): ProcessoRowDashboard com badge de fase e dias parado"
```

---

### Task 9: BuscaGlobal + integração no AppHeader

**Files:**
- Create: `src/components/dashboard/busca-global.tsx`
- Modify: `src/components/layout/app-header.tsx`

- [ ] **Step 1: Criar BuscaGlobal**

```typescript
// src/components/dashboard/busca-global.tsx
'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { StatusPill } from '@/components/licita/status-pill'
import type { StatusProcesso } from '@/components/licita/status-pill'

interface ResultadoBusca {
  id: string
  numero_processo: string | null
  objeto: string
  modalidade: string
  status: string
}

interface BuscaGlobalProps {
  orgId: string
  papel: string
  userId: string
}

const MODALIDADE_ABREV: Record<string, string> = {
  pregao_eletronico: 'Pregão Eletr.',
  pregao_presencial: 'Pregão Pres.',
  concorrencia:      'Concorrência',
  dispensa:          'Dispensa',
  inexigibilidade:   'Inexigibilidade',
  concurso:          'Concurso',
  leilao:            'Leilão',
  dialogo_competitivo: 'Diálogo Comp.',
}

export function BuscaGlobal({ orgId, papel, userId }: BuscaGlobalProps) {
  const [aberta, setAberta] = useState(false)
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const [, startTransition] = useTransition()
  const [carregando, setCarregando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!termo.trim()) { setResultados([]); return }
    setCarregando(true)
    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/busca?q=${encodeURIComponent(termo)}&orgId=${orgId}&papel=${papel}&userId=${userId}`
      )
      if (res.ok) {
        const data = await res.json()
        setResultados(data)
      }
      setCarregando(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [termo, orgId, papel, userId])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberta(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setAberta(false); setTermo('') }
    if (e.key === 'Enter' && termo.trim()) {
      router.push(`/processos?q=${encodeURIComponent(termo.trim())}`)
      setAberta(false)
      setTermo('')
    }
  }

  return (
    <div ref={containerRef} className="relative hidden lg:block">
      <div
        className="flex items-center gap-2 border px-3 py-1.5 rounded-[var(--r-md)] w-64 transition-all"
        style={{
          background: aberta ? 'var(--surface)' : 'var(--surfaceAlt)',
          borderColor: aberta ? 'var(--primary)' : 'var(--hairline)',
        }}
      >
        {carregando
          ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" style={{ color: 'var(--muted)' }} />
          : <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--muted)' }} />
        }
        <input
          ref={inputRef}
          value={termo}
          onChange={(e) => { setTermo(e.target.value); setAberta(true) }}
          onFocus={() => setAberta(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar processo, edital..."
          className="flex-1 bg-transparent text-xs outline-none"
          style={{ color: 'var(--ink)' }}
        />
        {!termo && (
          <span className="text-[10px] px-1.5 py-0.5 rounded border" style={{ color: 'var(--mutedSoft)', borderColor: 'var(--hairline)', background: 'var(--surface)' }}>
            ⌘K
          </span>
        )}
      </div>

      {aberta && resultados.length > 0 && (
        <div
          className="absolute top-full mt-1 left-0 w-80 rounded-[var(--r-lg)] border z-50 overflow-hidden"
          style={{ background: 'var(--surface)', borderColor: 'var(--hairline)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
        >
          {resultados.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                router.push(`/processos/${r.id}/dfd`)
                setAberta(false)
                setTermo('')
              }}
              className="w-full flex items-start gap-3 px-4 py-3 border-b text-left transition-colors hover:bg-[var(--surfaceAlt)] last:border-b-0"
              style={{ borderColor: 'var(--hairline)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>
                  {r.numero_processo ? `${r.numero_processo} — ` : ''}{r.objeto}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  {MODALIDADE_ABREV[r.modalidade] ?? r.modalidade}
                </p>
              </div>
              <StatusPill status={r.status as StatusProcesso} size="sm" />
            </button>
          ))}
          <button
            onClick={() => {
              router.push(`/processos?q=${encodeURIComponent(termo.trim())}`)
              setAberta(false)
              setTermo('')
            }}
            className="w-full px-4 py-2.5 text-xs font-semibold text-left transition-colors hover:bg-[var(--surfaceAlt)]"
            style={{ color: 'var(--primary)' }}
          >
            Ver todos os resultados para "{termo}"
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Criar API route para busca**

```typescript
// src/app/api/busca/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q      = searchParams.get('q')?.trim() ?? ''
  const orgId  = searchParams.get('orgId') ?? ''
  const papel  = searchParams.get('papel') ?? ''
  const userId = searchParams.get('userId') ?? ''

  if (!q) return NextResponse.json([])

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const qSafe = q.replace(/[%_;\\]/g, '')
  let query = (supabase as any)
    .from('processos_licitatorios')
    .select('id, numero_processo, objeto, modalidade, status')
    .limit(8)

  if (papel === 'requisitante') {
    query = query.eq('criado_por', user.id)
  } else {
    query = query.eq('organizacao_id', orgId)
  }

  const { data } = await query
    .or(`numero_processo.ilike.%${qSafe}%,objeto.ilike.%${qSafe}%`)

  return NextResponse.json(data ?? [])
}
```

- [ ] **Step 3: Substituir placeholder no AppHeader**

Em `src/components/layout/app-header.tsx`, ler os props que o componente já recebe (orgId, papel, userId).

Substituir o bloco:
```tsx
{/* Busca — desktop */}
<div className="hidden lg:flex items-center gap-2 bg-surfaceAlt border border-hairline px-3 py-1.5 rounded-[var(--r-md)] w-56 text-muted cursor-pointer hover:border-hairline/80 transition-colors">
  <Search className="w-3.5 h-3.5 shrink-0" />
  <span className="text-xs flex-1">Buscar processo, edital...</span>
  <span className="text-[10px] text-mutedSoft px-1.5 py-0.5 rounded border border-hairline bg-surface">
    ⌘K
  </span>
</div>
```

Por:
```tsx
{/* Busca global */}
<BuscaGlobal orgId={orgId ?? ''} papel={papel ?? ''} userId={usuarioId ?? ''} />
```

Adicionar import no topo:
```typescript
import { BuscaGlobal } from '@/components/dashboard/busca-global'
```

Verificar quais props já estão disponíveis em AppHeader (orgId/organizacao_id, papel, usuarioId).

- [ ] **Step 4: Verificar build**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/busca-global.tsx src/app/api/busca/route.ts src/components/layout/app-header.tsx
git commit -m "feat(dashboard): BuscaGlobal no header com dropdown realtime e debounce 300ms"
```

---

### Task 10: Estender /processos para aceitar criado_por=me

**Files:**
- Modify: `src/app/(dashboard)/processos/page.tsx`

- [ ] **Step 1: Adicionar criado_por ao searchParams**

No tipo de searchParams, adicionar `criado_por?: string`:
```typescript
export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: { status?: string; fase?: string; q?: string; page?: string; criado_por?: string }
})
```

- [ ] **Step 2: Ler e aplicar criado_por em aplicarFiltros**

Após `const filtroFase = searchParams.fase`, adicionar:
```typescript
const filtroCriadoPor = searchParams.criado_por
```

Na função `aplicarFiltros`, adicionar parâmetro:
```typescript
function aplicarFiltros(
  baseQuery: any,
  papel: string | null,
  userId: string,
  orgId: string,
  filtroStatus?: string,
  filtroFase?: string,
  qSafe?: string,
  filtroCriadoPor?: string
) {
  let q = baseQuery

  if (papel === 'requisitante' || filtroCriadoPor === 'me') {
    q = q.eq('criado_por', userId)
  } else {
    q = q.eq('organizacao_id', orgId)
  }
  // ... restante sem alteração
```

Atualizar as duas chamadas a `aplicarFiltros` para passar `filtroCriadoPor`.

- [ ] **Step 3: Adicionar FILTRO_CRIADO_POR_LABEL e exibir chip**

```typescript
const filtroCriadoPorLabel = filtroCriadoPor === 'me' ? 'Meus processos' : null
```

No chip de filtro ativo, incluir também `filtroCriadoPorLabel` como opção de exibição.

- [ ] **Step 4: Verificar build**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/processos/page.tsx
git commit -m "feat(processos): aceitar query param criado_por=me para filtrar por autor"
```

---

### Task 11: Dashboard Requisitante

**Files:**
- Create: `src/app/(dashboard)/dashboard/dashboard-requisitante.tsx`

- [ ] **Step 1: Criar arquivo**

```typescript
// src/app/(dashboard)/dashboard/dashboard-requisitante.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Bell, ShoppingCart } from 'lucide-react'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import { PendenciasCard } from '@/components/dashboard/pendencias-card'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import { FooterEditorial, SectionHeader, ListCard } from './shared'

interface Props {
  userId: string
  orgId: string
  cargo: string | null
}

export async function DashboardRequisitante({ userId, orgId, cargo }: Props) {
  const supabase = await createClient()

  const { data: processos } = await (supabase as any)
    .from('processos_licitatorios')
    .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at, created_at')
    .eq('criado_por', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  const lista = (processos as any[]) ?? []

  const contagens = {
    total:      lista.length,
    andamento:  lista.filter((p: any) => !['publicado','assinado'].includes(p.status)).length,
    concluidos: lista.filter((p: any) => ['publicado','assinado'].includes(p.status)).length,
  }

  const faseKeys = ['requisitante','setor_compras','setor_licitacao','procurador','gestor_publico','publicacao']
  const faseLabels: Record<string, string> = {
    requisitante: 'Requisitante', setor_compras: 'Compras', setor_licitacao: 'Licitações',
    procurador: 'Procuradoria', gestor_publico: 'Autorização', publicacao: 'Publicação',
  }
  const fases = faseKeys.map((k) => ({
    key: k,
    label: faseLabels[k],
    count: lista.filter((p: any) => p.fase_atual === k).length,
    devolvidos: lista.filter((p: any) => p.fase_atual === k && p.status === 'devolvido').length,
    parados: 0,
    href: `/processos?criado_por=me&fase=${k}`,
    isCurrent: k === 'requisitante',
  }))

  const { data: notifData } = await (supabase as any)
    .from('notificacoes')
    .select('id')
    .eq('usuario_id', userId)
    .eq('lida', false)

  const notifCount = ((notifData as any[]) ?? []).length

  const recentes = lista.slice(0, 5)

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Painel do Requisitante"
        title={cargo ? `Bem-vindo, ${cargo}.` : 'Seus processos.'}
        contextLine="Acompanhe aqui o andamento de todas as suas demandas."
      />

      <FaseTimeline fases={fases} />

      <KPIBar items={[
        { label: 'Total criados',  value: contagens.total,      sub: 'processos' },
        { label: 'Em andamento',   value: contagens.andamento,  sub: 'na fila' },
        { label: 'Concluídos',     value: contagens.concluidos, sub: 'publicados / assinados' },
      ]} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/notificacoes"
          className="flex items-center gap-4 p-5 rounded-[var(--r-lg)] border transition-colors hover:bg-[var(--surfaceAlt)]"
          style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
        >
          <div className="w-10 h-10 rounded-[var(--r-md)] flex items-center justify-center" style={{ background: 'var(--primaryWash)' }}>
            <Bell className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <p className="font-semibold text-[15px]" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
              Notificações
            </p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {notifCount > 0 ? `${notifCount} não lida${notifCount !== 1 ? 's' : ''}` : 'Nenhuma pendente'}
            </p>
          </div>
        </Link>

        <Link
          href="/compra-conjunta"
          className="flex items-center gap-4 p-5 rounded-[var(--r-lg)] border transition-colors hover:bg-[var(--surfaceAlt)]"
          style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
        >
          <div className="w-10 h-10 rounded-[var(--r-md)] flex items-center justify-center" style={{ background: 'var(--primaryWash)' }}>
            <ShoppingCart className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <p className="font-semibold text-[15px]" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
              Compra Conjunta
            </p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Demandas recebidas</p>
          </div>
        </Link>
      </div>

      <PendenciasCard userId={userId} orgId={orgId} faseAtual="requisitante" />

      <ListCard title="Processos recentes" subtitle="Seus últimos 5 processos">
        {recentes.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
            Nenhum processo criado ainda.
          </div>
        ) : recentes.map((p: any) => (
          <ProcessoRowDashboard key={p.id} {...p} />
        ))}
      </ListCard>

      <FooterEditorial />
    </div>
  )
}
```

- [ ] **Step 2: Criar shared.tsx com SectionHeader, ListCard, FooterEditorial**

```typescript
// src/app/(dashboard)/dashboard/shared.tsx
import { EditorialKicker, HeadlineSerif, Wordmark } from '@/components/licita/editorial'

export function FooterEditorial() {
  return (
    <div className="pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--hairline)' }}>
      <Wordmark />
      <div className="font-mono text-[9.5px]" style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}>
        Painel atualizado · {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')}
      </div>
    </div>
  )
}

export function SectionHeader({
  supTitle, title, contextLine, subtitle, action,
}: {
  supTitle: string; title: string; contextLine?: string; subtitle?: string; action?: React.ReactNode
}) {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')
  return (
    <div>
      <div className="flex items-center justify-between pb-3.5 mb-5" style={{ borderBottom: '2px solid var(--rule)' }}>
        <EditorialKicker kicker={supTitle} date={hoje} />
        <div className="font-mono text-[10px] font-semibold uppercase hidden sm:block" style={{ color: 'var(--muted)', letterSpacing: '0.14em' }}>
          Lei 14.133/21
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          {subtitle && <div className="l-meta mb-2" style={{ color: 'var(--muted)' }}>{subtitle}</div>}
          <HeadlineSerif size="lg" as="h1">{title}</HeadlineSerif>
          {contextLine && (
            <p className="mt-3 l-h" style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: 19, lineHeight: 1.4, color: 'var(--inkSoft)', fontWeight: 400, maxWidth: '54ch' }}>
              {contextLine}
            </p>
          )}
        </div>
        {action}
      </div>
    </div>
  )
}

export function ListCard({ title, subtitle, action, children }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="rounded-[var(--r-lg)] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--hairline)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="flex flex-row items-center justify-between px-6 py-5 border-b" style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>{title}</h2>
          {subtitle && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/dashboard/dashboard-requisitante.tsx src/app/(dashboard)/dashboard/shared.tsx
git commit -m "feat(dashboard): dashboard Requisitante com FaseTimeline e PendenciasCard"
```

---

### Task 12: Dashboard Setor de Compras

**Files:**
- Create: `src/app/(dashboard)/dashboard/dashboard-compras.tsx`

- [ ] **Step 1: Criar arquivo**

```typescript
// src/app/(dashboard)/dashboard/dashboard-compras.tsx
import { createClient } from '@/lib/supabase/server'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import { PendenciasCard } from '@/components/dashboard/pendencias-card'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import { FooterEditorial, SectionHeader, ListCard } from './shared'
import { AlertCircle } from 'lucide-react'

interface Props { userId: string; orgId: string; cargo: string | null }

export async function DashboardCompras({ userId, orgId, cargo }: Props) {
  const supabase = await createClient()

  const { data: todosProcessos } = await (supabase as any)
    .from('processos_licitatorios')
    .select('id, fase_atual, status, updated_at')
    .eq('organizacao_id', orgId)

  const todos = (todosProcessos as any[]) ?? []

  const faseKeys = ['requisitante','setor_compras','setor_licitacao','procurador','gestor_publico','publicacao']
  const faseLabels: Record<string,string> = {
    requisitante: 'Requisitante', setor_compras: 'Compras', setor_licitacao: 'Licitações',
    procurador: 'Procuradoria', gestor_publico: 'Autorização', publicacao: 'Publicação',
  }
  const fases = faseKeys.map((k) => ({
    key: k, label: faseLabels[k],
    count: todos.filter((p: any) => p.fase_atual === k).length,
    devolvidos: todos.filter((p: any) => p.fase_atual === k && p.status === 'devolvido').length,
    parados: 0,
    href: `/processos?fase=${k}`,
    isCurrent: k === 'setor_compras',
  }))

  const naFila = todos.filter((p: any) => p.fase_atual === 'setor_compras')

  const { data: filaCompleta } = await (supabase as any)
    .from('processos_licitatorios')
    .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
    .eq('organizacao_id', orgId)
    .eq('fase_atual', 'setor_compras')
    .order('updated_at', { ascending: true })
    .limit(20)

  const { data: cotacoesFeitasData } = await (supabase as any)
    .from('cotacoes')
    .select('id, created_at')
    .eq('organizacao_id', orgId)
    .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())

  const cotacoesSemana = ((cotacoesFeitasData as any[]) ?? []).length

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Setor de Compras"
        title="Fila de cotações."
        contextLine={cargo ?? undefined}
      />

      <FaseTimeline fases={fases} />

      <KPIBar items={[
        { label: 'Na fila', value: naFila.length, sub: 'aguardando cotação' },
        { label: 'Cotações (semana)', value: cotacoesSemana, sub: 'últimos 7 dias' },
      ]} />

      {naFila.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-[var(--r-lg)] border" style={{ background: 'var(--warnWash)', borderColor: 'var(--warn)' }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--warn)' }} />
          <p className="text-sm" style={{ color: 'var(--ink)' }}>
            A pesquisa de preços deve observar os parâmetros do Art. 23 da Lei 14.133/21, incluindo cotações de fornecedores, painel de preços e contratos anteriores.
          </p>
        </div>
      )}

      <PendenciasCard userId={userId} orgId={orgId} faseAtual="setor_compras" />

      <ListCard title="Fila de cotação" subtitle="Ordenada por mais antigo">
        {((filaCompleta as any[]) ?? []).map((p: any) => (
          <ProcessoRowDashboard key={p.id} {...p} href={`/processos/${p.id}/cotacao`} />
        ))}
      </ListCard>

      <FooterEditorial />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/dashboard/dashboard-compras.tsx
git commit -m "feat(dashboard): dashboard Setor de Compras"
```

---

### Task 13: Dashboard Setor de Licitações

**Files:**
- Create: `src/app/(dashboard)/dashboard/dashboard-licitacoes.tsx`

- [ ] **Step 1: Criar arquivo**

```typescript
// src/app/(dashboard)/dashboard/dashboard-licitacoes.tsx
import { createClient } from '@/lib/supabase/server'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import { PendenciasCard } from '@/components/dashboard/pendencias-card'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import { FooterEditorial, SectionHeader, ListCard } from './shared'

interface Props { userId: string; orgId: string; cargo: string | null }

export async function DashboardLicitacoes({ userId, orgId, cargo }: Props) {
  const supabase = await createClient()

  const [
    { data: todosProcessos },
    { data: naFila },
    { data: emProcuradoria },
    { data: devolvidos },
    { data: editais },
  ] = await Promise.all([
    (supabase as any).from('processos_licitatorios').select('id, fase_atual, status').eq('organizacao_id', orgId),
    (supabase as any).from('processos_licitatorios').select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at').eq('organizacao_id', orgId).eq('fase_atual', 'setor_licitacao').order('updated_at', { ascending: true }).limit(20),
    (supabase as any).from('processos_licitatorios').select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at').eq('organizacao_id', orgId).eq('fase_atual', 'procurador').limit(5),
    (supabase as any).from('processos_licitatorios').select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at').eq('organizacao_id', orgId).eq('status', 'devolvido').limit(10),
    (supabase as any).from('edital').select('id, status').eq('organizacao_id', orgId),
  ])

  const todos = (todosProcessos as any[]) ?? []
  const faseKeys = ['requisitante','setor_compras','setor_licitacao','procurador','gestor_publico','publicacao']
  const faseLabels: Record<string,string> = {
    requisitante: 'Requisitante', setor_compras: 'Compras', setor_licitacao: 'Licitações',
    procurador: 'Procuradoria', gestor_publico: 'Autorização', publicacao: 'Publicação',
  }
  const fases = faseKeys.map((k) => ({
    key: k, label: faseLabels[k],
    count: todos.filter((p: any) => p.fase_atual === k).length,
    devolvidos: todos.filter((p: any) => p.fase_atual === k && p.status === 'devolvido').length,
    parados: 0,
    href: `/processos?fase=${k}`,
    isCurrent: k === 'setor_licitacao',
  }))

  const editaisList = (editais as any[]) ?? []
  const editaisAguardando  = editaisList.filter((e: any) => e.status === 'pendente_assinatura').length
  const editaisEmElaboracao = editaisList.filter((e: any) => e.status === 'rascunho').length
  const editaisPublicados  = editaisList.filter((e: any) => e.status === 'publicado').length

  const devolvidosCount = todos.filter((p: any) => p.status === 'devolvido').length
  const publicadosCount = todos.filter((p: any) => p.status === 'publicado').length

  return (
    <div className="space-y-8">
      <SectionHeader supTitle="Setor de Licitações" title="Processos em tramitação." contextLine={cargo ?? undefined} />

      <FaseTimeline fases={fases} />

      <KPIBar items={[
        { label: 'Na minha fila', value: ((naFila as any[]) ?? []).length, sub: 'setor licitação' },
        { label: 'Em procuradoria', value: ((emProcuradoria as any[]) ?? []).length },
        { label: 'Devolvidos', value: devolvidosCount, accent: devolvidosCount > 0 },
        { label: 'Publicados', value: publicadosCount, sub: 'concluídos' },
      ]} />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Aguardando assinatura', value: editaisAguardando, href: '/processos?fase=setor_licitacao&status=pendente_assinatura' },
          { label: 'Em elaboração', value: editaisEmElaboracao, href: '/processos?status=rascunho' },
          { label: 'Publicados', value: editaisPublicados, href: '/processos?status=publicado' },
        ].map((item) => (
          <a key={item.label} href={item.href}
            className="p-4 rounded-[var(--r-lg)] border text-center transition-colors hover:bg-[var(--surfaceAlt)]"
            style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
          >
            <div className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--ink)' }}>{item.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{item.label}</div>
          </a>
        ))}
      </div>

      <PendenciasCard userId={userId} orgId={orgId} faseAtual="setor_licitacao" />

      <ListCard title="Processos na fila" subtitle="Ordenado por mais antigo">
        {((naFila as any[]) ?? []).map((p: any) => <ProcessoRowDashboard key={p.id} {...p} />)}
      </ListCard>

      {((emProcuradoria as any[]) ?? []).length > 0 && (
        <ListCard title="Em procuradoria" subtitle="Aguardando parecer">
          {((emProcuradoria as any[]) ?? []).map((p: any) => <ProcessoRowDashboard key={p.id} {...p} />)}
        </ListCard>
      )}

      <FooterEditorial />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/dashboard/dashboard-licitacoes.tsx
git commit -m "feat(dashboard): dashboard Setor de Licitacoes com card de editais"
```

---

### Task 14: Dashboards Procurador, Gestor Público e Publicação

**Files:**
- Create: `src/app/(dashboard)/dashboard/dashboard-procurador.tsx`
- Create: `src/app/(dashboard)/dashboard/dashboard-gestor-publico.tsx`
- Create: `src/app/(dashboard)/dashboard/dashboard-publicacao.tsx`

- [ ] **Step 1: Criar dashboard-procurador.tsx**

```typescript
// src/app/(dashboard)/dashboard/dashboard-procurador.tsx
import { createClient } from '@/lib/supabase/server'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import { PendenciasCard } from '@/components/dashboard/pendencias-card'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import { FooterEditorial, SectionHeader, ListCard } from './shared'

interface Props { userId: string; orgId: string; cargo: string | null }

export async function DashboardProcurador({ userId, orgId, cargo }: Props) {
  const supabase = await createClient()

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [{ data: pareceres }, { data: filaData }] = await Promise.all([
    (supabase as any).from('pareceres').select('id, status, created_at').eq('organizacao_id', orgId),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .eq('fase_atual', 'procurador')
      .order('updated_at', { ascending: true })
      .limit(20),
  ])

  const pareceresList = (pareceres as any[]) ?? []
  const fila = (filaData as any[]) ?? []

  const pendentes  = pareceresList.filter((p: any) => p.status === 'pendente').length
  const aprovados  = pareceresList.filter((p: any) => p.status?.startsWith('aprovado') && p.created_at >= inicioMes).length
  const devolvidos = pareceresList.filter((p: any) => p.status === 'devolvido').length

  const fases = [
    { key: 'pendente',               label: 'Pendente',      count: pendentes,  devolvidos: 0, parados: 0, href: '/processos?fase=procurador', isCurrent: true },
    { key: 'aprovado',               label: 'Aprovado',      count: aprovados,  devolvidos: 0, parados: 0, href: '/processos?fase=procurador&status=aprovado' },
    { key: 'aprovado_com_ressalvas', label: 'C/ Ressalvas',  count: 0,          devolvidos: 0, parados: 0, href: '/processos?fase=procurador' },
    { key: 'devolvido',              label: 'Devolvido',     count: devolvidos, devolvidos: devolvidos, parados: 0, href: '/processos?fase=procurador&status=devolvido' },
  ]

  return (
    <div className="space-y-8">
      <SectionHeader supTitle="Procuradoria" title="Fila de pareceres." contextLine={cargo ?? undefined} />
      <FaseTimeline fases={fases} />
      <KPIBar items={[
        { label: 'Fila de análise', value: fila.length },
        { label: 'Aprovados (mês)', value: aprovados },
        { label: 'Devolvidos',      value: devolvidos, accent: devolvidos > 0 },
      ]} />
      <PendenciasCard userId={userId} orgId={orgId} faseAtual="procurador" />
      <ListCard title="Fila de pareceres" subtitle="Mais antigo primeiro">
        {fila.length === 0
          ? <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>Nenhum processo aguardando parecer.</div>
          : fila.map((p: any) => <ProcessoRowDashboard key={p.id} {...p} href={`/processos/${p.id}/parecer`} />)
        }
      </ListCard>
      <FooterEditorial />
    </div>
  )
}
```

- [ ] **Step 2: Criar dashboard-gestor-publico.tsx**

```typescript
// src/app/(dashboard)/dashboard/dashboard-gestor-publico.tsx
import { createClient } from '@/lib/supabase/server'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import { PendenciasCard } from '@/components/dashboard/pendencias-card'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import { FooterEditorial, SectionHeader, ListCard } from './shared'

interface Props { userId: string; orgId: string; cargo: string | null }

export async function DashboardGestorPublico({ userId, orgId, cargo }: Props) {
  const supabase = await createClient()
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [{ data: autorizacoes }, { data: filaData }] = await Promise.all([
    (supabase as any).from('processos_licitatorios').select('id, status, valor_estimado, updated_at').eq('organizacao_id', orgId).eq('fase_atual', 'gestor_publico'),
    (supabase as any).from('processos_licitatorios').select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at').eq('organizacao_id', orgId).eq('fase_atual', 'gestor_publico').order('updated_at', { ascending: true }).limit(20),
  ])

  const lista = (autorizacoes as any[]) ?? []
  const fila  = (filaData as any[]) ?? []

  const aguardando  = lista.filter((p: any) => p.status === 'aguardando').length
  const autorizados = lista.filter((p: any) => p.status === 'autorizado' && p.updated_at >= inicioMes).length
  const devolvidos  = lista.filter((p: any) => p.status === 'devolvido').length
  const valorTotal  = lista.filter((p: any) => p.status === 'autorizado').reduce((acc: number, p: any) => acc + (p.valor_estimado ?? 0), 0)

  const fases = [
    { key: 'aguardando',  label: 'Aguardando', count: aguardando,  devolvidos: 0, parados: 0, href: '/processos?fase=gestor_publico', isCurrent: true },
    { key: 'autorizado',  label: 'Autorizado', count: autorizados, devolvidos: 0, parados: 0, href: '/processos?fase=gestor_publico&status=autorizado' },
    { key: 'devolvido',   label: 'Devolvido',  count: devolvidos,  devolvidos, parados: 0, href: '/processos?fase=gestor_publico&status=devolvido' },
  ]

  return (
    <div className="space-y-8">
      <SectionHeader supTitle="Autoridade Competente" title="Autorizações pendentes." contextLine={cargo ?? undefined} />
      <FaseTimeline fases={fases} />
      <KPIBar items={[
        { label: 'Aguardando decisão', value: aguardando },
        { label: 'Autorizados (mês)',  value: autorizados },
        { label: 'Devolvidos',         value: devolvidos, accent: devolvidos > 0 },
        { label: 'Valor autorizado',   value: `R$ ${(valorTotal / 1000).toFixed(0)}k`, sub: 'total' },
      ]} />
      <PendenciasCard userId={userId} orgId={orgId} faseAtual="gestor_publico" />
      <ListCard title="Aguardando autorização" subtitle="Mais antigo primeiro">
        {fila.length === 0
          ? <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>Nenhuma autorização pendente.</div>
          : fila.map((p: any) => <ProcessoRowDashboard key={p.id} {...p} href={`/processos/${p.id}/autorizacao`} />)
        }
      </ListCard>
      <FooterEditorial />
    </div>
  )
}
```

- [ ] **Step 3: Criar dashboard-publicacao.tsx**

```typescript
// src/app/(dashboard)/dashboard/dashboard-publicacao.tsx
import { createClient } from '@/lib/supabase/server'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import { PendenciasCard } from '@/components/dashboard/pendencias-card'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import { FooterEditorial, SectionHeader, ListCard } from './shared'

interface Props { userId: string; orgId: string; cargo: string | null }

export async function DashboardPublicacao({ userId, orgId, cargo }: Props) {
  const supabase = await createClient()
  const iniciSemana = new Date(Date.now() - 7 * 86400000).toISOString()

  const [{ data: publ }, { data: filaData }] = await Promise.all([
    (supabase as any).from('processos_licitatorios').select('id, status, updated_at').eq('organizacao_id', orgId).in('fase_atual', ['publicacao', 'publicado']),
    (supabase as any).from('processos_licitatorios').select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at').eq('organizacao_id', orgId).eq('fase_atual', 'publicacao').order('updated_at', { ascending: true }).limit(20),
  ])

  const lista = (publ as any[]) ?? []
  const fila  = (filaData as any[]) ?? []

  const aguardando      = lista.filter((p: any) => p.fase_atual === 'publicacao').length
  const publicadosSemana = lista.filter((p: any) => p.status === 'publicado' && p.updated_at >= iniciSemana).length

  const fases = [
    { key: 'publicacao', label: 'Aguardando',    count: aguardando,       devolvidos: 0, parados: 0, href: '/processos?fase=publicacao',        isCurrent: true },
    { key: 'publicado',  label: 'Publicados',    count: publicadosSemana, devolvidos: 0, parados: 0, href: '/processos?status=publicado' },
  ]

  return (
    <div className="space-y-8">
      <SectionHeader supTitle="Setor de Comunicações" title="Publicações pendentes." contextLine={cargo ?? undefined} />
      <FaseTimeline fases={fases} />
      <KPIBar items={[
        { label: 'Aguardando',       value: aguardando },
        { label: 'Publicados (sem)', value: publicadosSemana },
      ]} />
      <PendenciasCard userId={userId} orgId={orgId} faseAtual="publicacao" />
      <ListCard title="Aguardando publicação" subtitle="Mais antigo primeiro">
        {fila.length === 0
          ? <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>Nenhum processo aguardando publicação.</div>
          : fila.map((p: any) => <ProcessoRowDashboard key={p.id} {...p} href={`/processos/${p.id}/publicacao`} />)
        }
      </ListCard>
      <FooterEditorial />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/dashboard/dashboard-procurador.tsx src/app/(dashboard)/dashboard/dashboard-gestor-publico.tsx src/app/(dashboard)/dashboard/dashboard-publicacao.tsx
git commit -m "feat(dashboard): dashboards Procurador, Gestor Publico e Publicacao"
```

---

### Task 15: Dashboard Admin Organização

**Files:**
- Create: `src/app/(dashboard)/dashboard/dashboard-admin-org.tsx`

- [ ] **Step 1: Criar arquivo**

```typescript
// src/app/(dashboard)/dashboard/dashboard-admin-org.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { CardConfigShell } from '@/components/dashboard/card-config-shell'
import { FooterEditorial, SectionHeader, ListCard } from './shared'
import { buscarPreferenciaDashboard } from '@/lib/actions/dashboard'
import { Users, ArrowRight } from 'lucide-react'

interface Props { userId: string; orgId: string; orgNome: string; cargo: string | null }

export async function DashboardAdminOrg({ userId, orgId, orgNome, cargo }: Props) {
  const supabase = await createClient()

  const pref = await buscarPreferenciaDashboard('ia_periodo_dias', { dias: 30 })
  const diasIa = typeof (pref as any).dias === 'number' ? (pref as any).dias : 30
  const corte = new Date(Date.now() - diasIa * 86400000).toISOString()

  const [
    { data: usuarios },
    { data: processos },
    { data: acoesIa },
    { data: creditos },
  ] = await Promise.all([
    (supabase as any).from('usuarios').select('id, nome, papel, status, ultimo_acesso').eq('organizacao_id', orgId),
    (supabase as any).from('processos_licitatorios').select('id, status, fase_atual').eq('organizacao_id', orgId),
    (supabase as any).from('acoes_ia').select('id, usuario_id, tokens_consumidos, created_at').eq('organizacao_id', orgId).gte('created_at', corte),
    (supabase as any).from('creditos_usuario').select('saldo').eq('organizacao_id', orgId).maybeSingle(),
  ])

  const usuariosList  = (usuarios as any[]) ?? []
  const processosList = (processos as any[]) ?? []
  const acoesList     = (acoesIa as any[]) ?? []
  const saldo         = (creditos as any)?.saldo ?? 0

  const ativos    = usuariosList.filter((u: any) => u.status === 'ativo').length
  const andamento = processosList.filter((p: any) => !['publicado','assinado'].includes(p.status)).length
  const tokensMes = acoesList.reduce((acc: number, a: any) => acc + (a.tokens_consumidos ?? 0), 0)

  return (
    <div className="space-y-8">
      <SectionHeader supTitle="Admin Organização" title={orgNome} contextLine="Visão gerencial da organização." />

      <KPIBar items={[
        { label: 'Usuários ativos',    value: ativos },
        { label: 'Em andamento',       value: andamento, sub: 'processos' },
        { label: `IA (${diasIa}d)`,    value: tokensMes.toLocaleString('pt-BR'), sub: 'tokens consumidos' },
        { label: 'Créditos disp.',     value: saldo, sub: 'saldo atual' },
      ]} />

      <CardConfigShell
        configKey="ia_periodo_dias"
        configValue={{ dias: diasIa }}
        configContent={(val, setVal) => (
          <div>
            <label className="text-xs" style={{ color: 'var(--ink)' }}>Período de análise de IA</label>
            <select
              defaultValue={(val as any).dias}
              onChange={(e) => setVal({ dias: Number(e.target.value) })}
              className="mt-2 w-full border rounded px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--hairline)', background: 'var(--surface)', color: 'var(--ink)' }}
            >
              {[7, 15, 30, 60, 90].map((d) => (
                <option key={d} value={d}>{d} dias</option>
              ))}
            </select>
          </div>
        )}
      >
        <ListCard title={`Uso de IA — últimos ${diasIa} dias`}>
          <div className="divide-y" style={{ borderColor: 'var(--hairline)' }}>
            {usuariosList.slice(0, 10).map((u: any) => {
              const tokens = acoesList.filter((a: any) => a.usuario_id === u.id).reduce((acc: number, a: any) => acc + (a.tokens_consumidos ?? 0), 0)
              return (
                <div key={u.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{u.nome}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{u.papel}</p>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                    {tokens.toLocaleString('pt-BR')} tok
                  </span>
                </div>
              )
            })}
          </div>
        </ListCard>
      </CardConfigShell>

      <ListCard
        title="Usuários"
        action={
          <Link href="/configuracoes/usuarios" className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--primary)' }}>
            Gerenciar <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {usuariosList.slice(0, 10).map((u: any) => (
          <div key={u.id} className="flex items-center justify-between px-6 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--hairline)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{u.nome}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{u.papel}</p>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: u.status === 'ativo' ? 'var(--successWash)' : 'var(--warnWash)',
                color: u.status === 'ativo' ? 'var(--success)' : 'var(--warn)',
              }}
            >
              {u.status}
            </span>
          </div>
        ))}
      </ListCard>

      <FooterEditorial />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/dashboard/dashboard-admin-org.tsx
git commit -m "feat(dashboard): dashboard Admin Organizacao com uso de IA configuravel"
```

---

### Task 16: Dashboard Admin Master

**Files:**
- Create: `src/app/(dashboard)/dashboard/dashboard-admin-master.tsx`

- [ ] **Step 1: Criar arquivo**

```typescript
// src/app/(dashboard)/dashboard/dashboard-admin-master.tsx
import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { CardConfigShell } from '@/components/dashboard/card-config-shell'
import { FooterEditorial, SectionHeader, ListCard } from './shared'
import { buscarPreferenciaDashboard } from '@/lib/actions/dashboard'
import { ArrowRight, Building2 } from 'lucide-react'

interface Props { userId: string }

export async function DashboardAdminMaster({ userId }: Props) {
  const supabase = createServiceClient()

  const pref = await buscarPreferenciaDashboard('ia_periodo_dias', { dias: 30 })
  const diasIa = typeof (pref as any).dias === 'number' ? (pref as any).dias : 30
  const corte = new Date(Date.now() - diasIa * 86400000).toISOString()

  const [
    { data: orgs },
    { data: usuarios },
    { data: processos },
    { data: acoesIa },
  ] = await Promise.all([
    (supabase as any).from('organizacoes').select('id, nome, municipio, estado').order('nome'),
    (supabase as any).from('usuarios').select('id, organizacao_id, status').eq('status', 'ativo'),
    (supabase as any).from('processos_licitatorios').select('id, organizacao_id, status'),
    (supabase as any).from('acoes_ia').select('id, organizacao_id, tokens_consumidos, created_at').gte('created_at', corte),
  ])

  const orgsList      = (orgs as any[]) ?? []
  const usuariosList  = (usuarios as any[]) ?? []
  const processosList = (processos as any[]) ?? []
  const acoesList     = (acoesIa as any[]) ?? []

  const totalTokens = acoesList.reduce((acc: number, a: any) => acc + (a.tokens_consumidos ?? 0), 0)

  const orgsComDados = orgsList.map((org: any) => ({
    ...org,
    usuariosAtivos: usuariosList.filter((u: any) => u.organizacao_id === org.id).length,
    processos:      processosList.filter((p: any) => p.organizacao_id === org.id).length,
    tokens:         acoesList.filter((a: any) => a.organizacao_id === org.id).reduce((acc: number, a: any) => acc + (a.tokens_consumidos ?? 0), 0),
  }))

  return (
    <div className="space-y-8">
      <SectionHeader supTitle="Administração da Plataforma" title="Visão global." contextLine="Dados consolidados de todas as organizações." />

      <KPIBar items={[
        { label: 'Prefeituras',    value: orgsList.length },
        { label: 'Usuários ativos', value: usuariosList.length },
        { label: 'Processos',      value: processosList.length },
        { label: `IA (${diasIa}d)`, value: totalTokens.toLocaleString('pt-BR'), sub: 'tokens' },
      ]} />

      <CardConfigShell
        configKey="ia_periodo_dias"
        configValue={{ dias: diasIa }}
        configContent={(val, setVal) => (
          <div>
            <label className="text-xs" style={{ color: 'var(--ink)' }}>Período de análise</label>
            <select
              defaultValue={(val as any).dias}
              onChange={(e) => setVal({ dias: Number(e.target.value) })}
              className="mt-2 w-full border rounded px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--hairline)', background: 'var(--surface)', color: 'var(--ink)' }}
            >
              {[7, 15, 30, 60, 90].map((d) => (
                <option key={d} value={d}>{d} dias</option>
              ))}
            </select>
          </div>
        )}
      >
        <ListCard title="Prefeituras" subtitle={`${orgsList.length} organizações na plataforma`}>
          {orgsComDados.map((org: any) => (
            <Link
              key={org.id}
              href={`/admin/prefeituras/${org.id}`}
              className="flex items-center gap-4 px-6 py-4 border-b transition-colors hover:bg-[var(--surfaceAlt)] last:border-b-0"
              style={{ borderColor: 'var(--hairline)' }}
            >
              <div className="w-9 h-9 rounded-[var(--r-md)] flex items-center justify-center shrink-0" style={{ background: 'var(--primaryWash)' }}>
                <Building2 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{org.nome}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {org.municipio} · {org.estado} · {org.usuariosAtivos} usuários · {org.processos} processos
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                  {org.tokens.toLocaleString('pt-BR')} tok
                </span>
                <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--mutedSoft)' }} />
              </div>
            </Link>
          ))}
        </ListCard>
      </CardConfigShell>

      <FooterEditorial />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/dashboard/dashboard-admin-master.tsx
git commit -m "feat(dashboard): dashboard Admin Master com visao global via service client"
```

---

### Task 17: Admin Prefeitura Drill-down

**Files:**
- Create: `src/app/(dashboard)/admin/prefeituras/[orgId]/page.tsx`

- [ ] **Step 1: Criar diretório e arquivo**

```bash
mkdir -p "src/app/(dashboard)/admin/prefeituras/[orgId]"
```

```typescript
// src/app/(dashboard)/admin/prefeituras/[orgId]/page.tsx
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import { FooterEditorial, ListCard } from '../../dashboard/shared'

export default async function AdminPrefeituraPage({
  params,
}: {
  params: { orgId: string }
}) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const papel = await obterPapelUsuario()
  if (papel !== 'admin_plataforma') redirect('/dashboard')

  const supabase = createServiceClient()
  const { orgId } = params

  const [{ data: org }, { data: processos }, { data: usuarios }, { data: acoesIa }] = await Promise.all([
    (supabase as any).from('organizacoes').select('id, nome, municipio, estado, cnpj').eq('id', orgId).maybeSingle(),
    (supabase as any).from('processos_licitatorios').select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at').eq('organizacao_id', orgId).order('updated_at', { ascending: false }).limit(20),
    (supabase as any).from('usuarios').select('id, nome, papel, status, ultimo_acesso').eq('organizacao_id', orgId),
    (supabase as any).from('acoes_ia').select('id, tokens_consumidos, created_at').eq('organizacao_id', orgId).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
  ])

  if (!org) redirect('/dashboard')

  const orgData      = org as any
  const processosList = (processos as any[]) ?? []
  const usuariosList  = (usuarios as any[]) ?? []
  const acoesList     = (acoesIa as any[]) ?? []

  const faseKeys = ['requisitante','setor_compras','setor_licitacao','procurador','gestor_publico','publicacao']
  const faseLabels: Record<string,string> = {
    requisitante: 'Requisitante', setor_compras: 'Compras', setor_licitacao: 'Licitações',
    procurador: 'Procuradoria', gestor_publico: 'Autorização', publicacao: 'Publicação',
  }
  const fases = faseKeys.map((k) => ({
    key: k, label: faseLabels[k],
    count: processosList.filter((p: any) => p.fase_atual === k).length,
    devolvidos: processosList.filter((p: any) => p.fase_atual === k && p.status === 'devolvido').length,
    parados: 0,
    href: `/processos?organizacao_id=${orgId}&fase=${k}`,
  }))

  const ativos   = usuariosList.filter((u: any) => u.status === 'ativo').length
  const andamento = processosList.filter((p: any) => !['publicado','assinado'].includes(p.status)).length
  const tokens   = acoesList.reduce((acc: number, a: any) => acc + (a.tokens_consumidos ?? 0), 0)

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--muted)' }}>
        <Link href="/dashboard" className="hover:underline">Plataforma</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span style={{ color: 'var(--inkSoft)' }}>Prefeituras</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{orgData.nome}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--ink)' }}>
          {orgData.nome}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          {orgData.municipio} · {orgData.estado} · CNPJ {orgData.cnpj}
        </p>
      </div>

      <FaseTimeline fases={fases} />

      <KPIBar items={[
        { label: 'Usuários ativos', value: ativos },
        { label: 'Em andamento',    value: andamento },
        { label: 'IA (30d)',        value: tokens.toLocaleString('pt-BR'), sub: 'tokens' },
      ]} />

      <ListCard title="Usuários">
        {usuariosList.map((u: any) => (
          <div key={u.id} className="flex items-center justify-between px-6 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--hairline)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{u.nome}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{u.papel}</p>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: u.status === 'ativo' ? 'var(--successWash)' : 'var(--warnWash)',
                color: u.status === 'ativo' ? 'var(--success)' : 'var(--warn)',
              }}
            >
              {u.status}
            </span>
          </div>
        ))}
      </ListCard>

      <ListCard title="Processos recentes">
        {processosList.slice(0, 10).map((p: any) => (
          <Link
            key={p.id}
            href={`/processos/${p.id}/dfd`}
            className="flex items-center justify-between px-6 py-3 border-b last:border-b-0 transition-colors hover:bg-[var(--surfaceAlt)]"
            style={{ borderColor: 'var(--hairline)' }}
          >
            <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
              {p.numero_processo ? `${p.numero_processo} — ` : ''}{p.objeto}
            </p>
          </Link>
        ))}
      </ListCard>

      <FooterEditorial />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(dashboard)/admin/prefeituras/[orgId]/page.tsx"
git commit -m "feat(dashboard): pagina drill-down de prefeitura para Admin Master"
```

---

### Task 18: Thin router em dashboard/page.tsx

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Reescrever page.tsx como roteador fino**

Substituir o conteúdo atual do arquivo por:

```typescript
// src/app/(dashboard)/dashboard/page.tsx
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { PapelUsuario } from '@/types/database'
import { DashboardRequisitante } from './dashboard-requisitante'
import { DashboardCompras } from './dashboard-compras'
import { DashboardLicitacoes } from './dashboard-licitacoes'
import { DashboardProcurador } from './dashboard-procurador'
import { DashboardGestorPublico } from './dashboard-gestor-publico'
import { DashboardPublicacao } from './dashboard-publicacao'
import { DashboardAdminOrg } from './dashboard-admin-org'
import { DashboardAdminMaster } from './dashboard-admin-master'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioData } = await (supabase as any)
    .from('usuarios')
    .select('papel, organizacao_id, cargo')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuarioData) redirect('/login')

  const papel        = (usuarioData as any).papel as PapelUsuario
  const orgId        = (usuarioData as any).organizacao_id as string
  const cargo        = (usuarioData as any).cargo as string | null
  const userId       = user.id

  if (!orgId && papel !== 'admin_plataforma') redirect('/onboarding')

  const { data: orgData } = orgId
    ? await (supabase as any).from('organizacoes').select('nome').eq('id', orgId).maybeSingle()
    : { data: null }
  const orgNome = (orgData as any)?.nome ?? ''

  switch (papel as string) {
    case 'requisitante':
      return <DashboardRequisitante userId={userId} orgId={orgId} cargo={cargo} />
    case 'setor_compras':
      return <DashboardCompras userId={userId} orgId={orgId} cargo={cargo} />
    case 'setor_licitacao':
      return <DashboardLicitacoes userId={userId} orgId={orgId} cargo={cargo} />
    case 'procurador':
      return <DashboardProcurador userId={userId} orgId={orgId} cargo={cargo} />
    case 'gestor_publico':
      return <DashboardGestorPublico userId={userId} orgId={orgId} cargo={cargo} />
    case 'publicacao':
      return <DashboardPublicacao userId={userId} orgId={orgId} cargo={cargo} />
    case 'admin_organizacao':
      return <DashboardAdminOrg userId={userId} orgId={orgId} orgNome={orgNome} cargo={cargo} />
    case 'admin_plataforma':
      return <DashboardAdminMaster userId={userId} />
    default:
      return <DashboardRequisitante userId={userId} orgId={orgId} cargo={cargo} />
  }
}
```

- [ ] **Step 2: Verificar build completo**

```bash
npx tsc --noEmit
```

Resolver quaisquer erros de tipo antes de continuar.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat(dashboard): page.tsx refatorado como roteador fino por papel"
```

---

## Ordem de Execução Recomendada

```
Task 1 → Task 2 (independentes, podem ser em paralelo)
Task 3 (depende das migrations)
Task 4 → Task 5 → Task 6 → Task 7 → Task 8 (componentes, ordem recomendada)
Task 9 (depende de Task 8)
Task 10 (independente)
Task 11 → Task 12 → Task 13 → Task 14 → Task 15 → Task 16 (dashboards)
Task 17 (depende das Tasks 4-8 e 16)
Task 18 (depende de todas as Tasks 11-17)
```

## Checklist de Verificação Final

- [ ] `npx tsc --noEmit` sem erros
- [ ] `dashboard_preferencias` table existe no Supabase com RLS ativo
- [ ] `search_vector` column e índice GIN existem em `processos_licitatorios`
- [ ] BuscaGlobal aparece no header em desktop e fecha com Escape
- [ ] FaseTimeline navega para `/processos?fase=<fase>` ao clicar
- [ ] PendenciasCard persiste preferência ao fechar popover
- [ ] `/processos?criado_por=me` exibe apenas processos do usuário logado
- [ ] Admin Master usa `createServiceClient()`, demais usam `createClient()`
- [ ] Admin Prefeitura redireciona não-admin_plataforma para `/dashboard`

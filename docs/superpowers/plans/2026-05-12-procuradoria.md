# Procuradoria Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Procuradoria module — a dedicated `/procuradoria` route for legal reviewers to manage, draft, and emit legal opinions (pareceres) per Art. 53 of Lei 14.133/21, including AI-powered drafting, legal analysis, precedent discovery, and a platform-wide deadline configuration page.

**Architecture:** New `/procuradoria` route with 3-tab layout (Pendentes/Em análise/Histórico) is a Server Component backed by new server actions in `procuradoria.ts`; the `/processos/[id]/parecer` page is extended with veredito selector, AI minuta, AI analysis, process summary panel, document panel, and precedents panel with similarity modal. A new migration adds `configuracoes_plataforma`, `pareceres_precedentes` tables plus columns to `pareceres` and `organizacoes`.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind CSS, shadcn/ui (Card, Tabs, Badge, Dialog, Button, Textarea, Select, Progress), Supabase Postgres + RLS, Anthropic Claude via existing `executarIAComCreditos` wrapper, lucide-react icons.

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `supabase/migrations/20260512000006_procuradoria.sql` | All DB changes: new tables, ALTER pareceres, ALTER enum, ALTER organizacoes |
| `src/lib/actions/procuradoria.ts` | Server actions: `listarPareceresOrg`, `salvarVeredito`, `salvarConteudo`, `emitirParecer`, `gerarMinutaIA`, `analisarComIA`, `buscarPrecedentes`, `obterResumoProcesso`, `indexarPrecedente` |
| `src/lib/actions/configuracoes-plataforma.ts` | `obterConfiguracoes`, `salvarConfiguracao` |
| `src/app/(dashboard)/procuradoria/layout.tsx` | Role guard: procurador/admin_organizacao/admin_plataforma only |
| `src/app/(dashboard)/procuradoria/page.tsx` | Server Component: fetches pareceres + urgency configs, renders `ListaPareceres` |
| `src/app/(dashboard)/procuradoria/lista-pareceres.tsx` | Client Component: 3-tab layout, KPIs, urgency badges |
| `src/app/(dashboard)/admin/configuracoes-plataforma/page.tsx` | Platform config form (urgency/alert deadlines) |
| `src/app/(dashboard)/processos/[id]/parecer/resumo-processo.tsx` | Collapsible process summary panel (read-only) |
| `src/app/(dashboard)/processos/[id]/parecer/painel-documentos.tsx` | Collapsible documents panel with links |
| `src/app/(dashboard)/processos/[id]/parecer/modal-precedente.tsx` | Precedent modal with similarity bar and full text |

### Modified files
| File | What changes |
|---|---|
| `src/types/database.ts` | Add `em_analise` and `contrario` to `StatusParecer`; add `ConfiguracaoPlataformaRow`, `PrecedenteRow` interfaces |
| `src/app/(dashboard)/processos/[id]/parecer/page.tsx` | Fetch veredito, analise_ia, precedentes, resumo; pass to `EditorParecer` |
| `src/app/(dashboard)/processos/[id]/parecer/editor-parecer.tsx` | Full rewrite: veredito selector, debounce save, AI minuta/analysis buttons, panels |
| `src/app/(dashboard)/admin/sidebar-admin.tsx` | Add "Configuracoes da Plataforma" nav item |
| `src/components/layout/navbar.tsx` | Add "Procuradoria" nav link for procurador/admin roles |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260512000006_procuradoria.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260512000006_procuradoria.sql

-- 1. New table: configuracoes_plataforma
CREATE TABLE IF NOT EXISTS configuracoes_plataforma (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave       text NOT NULL UNIQUE,
  valor       text NOT NULL,
  descricao   text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES usuarios(id)
);

-- Seed default values
INSERT INTO configuracoes_plataforma (chave, valor, descricao)
VALUES
  ('prazo_urgencia_parecer_dias', '5',  'Dias sem parecer para badge URGENTE'),
  ('prazo_alerta_parecer_dias',   '10', 'Dias sem parecer para badge ATENCAO')
ON CONFLICT (chave) DO NOTHING;

-- RLS: all authenticated users can read; only admin_plataforma can write
ALTER TABLE configuracoes_plataforma ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura_autenticados" ON configuracoes_plataforma
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "escrita_admin_plataforma" ON configuracoes_plataforma
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.papel = 'admin_plataforma'
    )
  );

-- 2. Extend pareceres table
ALTER TABLE pareceres
  ADD COLUMN IF NOT EXISTS veredito           text CHECK (veredito IN ('aprovar','aprovar_com_ressalvas','contrario')),
  ADD COLUMN IF NOT EXISTS analise_ia         text,
  ADD COLUMN IF NOT EXISTS ressalvas          text,
  ADD COLUMN IF NOT EXISTS motivo_contrario   text,
  ADD COLUMN IF NOT EXISTS data_envio_procuradoria timestamptz;

-- Backfill data_envio_procuradoria for existing rows
UPDATE pareceres SET data_envio_procuradoria = created_at WHERE data_envio_procuradoria IS NULL;

-- 3. Extend status_parecer enum (Postgres requires specific syntax)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'em_analise'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'status_parecer')
  ) THEN
    ALTER TYPE status_parecer ADD VALUE 'em_analise' BEFORE 'aprovado';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'contrario'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'status_parecer')
  ) THEN
    ALTER TYPE status_parecer ADD VALUE 'contrario' AFTER 'aprovado_com_ressalvas';
  END IF;
END$$;

-- 4. Extend organizacoes table
ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS participa_pool_precedentes boolean NOT NULL DEFAULT false;

-- 5. New table: pareceres_precedentes
CREATE TABLE IF NOT EXISTS pareceres_precedentes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parecer_id      uuid NOT NULL REFERENCES pareceres(id) ON DELETE CASCADE,
  organizacao_id  uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  objeto_keywords text[],
  modalidade      text,
  faixa_valor     text,
  veredito        text NOT NULL,
  procurador_id   uuid REFERENCES usuarios(id),
  emitido_em      timestamptz NOT NULL DEFAULT now(),
  participa_pool  boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_precedentes_keywords
  ON pareceres_precedentes USING gin(objeto_keywords);
CREATE INDEX IF NOT EXISTS idx_precedentes_modalidade
  ON pareceres_precedentes(modalidade, faixa_valor);

-- RLS: org reads its own + pool entries
ALTER TABLE pareceres_precedentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura_precedentes" ON pareceres_precedentes
  FOR SELECT TO authenticated
  USING (
    organizacao_id = (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
    OR participa_pool = true
  );
CREATE POLICY "insercao_propria_org" ON pareceres_precedentes
  FOR INSERT TO authenticated
  WITH CHECK (
    organizacao_id = (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );
```

- [ ] **Step 2: Apply the migration**

Run in the project root:
```bash
npx supabase db push
```
Expected: migration applied without errors. If using Supabase MCP: use `apply_migration` tool with the SQL above.

- [ ] **Step 3: Verify new columns exist**

```bash
npx supabase db diff
```
Expected: no pending changes (all applied).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260512000006_procuradoria.sql
git commit -m "feat(db): migration procuradoria - configuracoes_plataforma, pareceres_precedentes, alter pareceres e organizacoes"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/types/database.ts`

- [ ] **Step 1: Update `StatusParecer`**

Find line:
```typescript
export type StatusParecer = 'pendente' | 'aprovado' | 'aprovado_com_ressalvas' | 'devolvido'
```
Replace with:
```typescript
export type StatusParecer = 'pendente' | 'em_analise' | 'aprovado' | 'aprovado_com_ressalvas' | 'contrario' | 'devolvido'
```

- [ ] **Step 2: Add new row interfaces** — append after the last existing interface in `src/types/database.ts`:

```typescript
export interface ConfiguracaoPlataformaRow {
  id: string
  chave: string
  valor: string
  descricao: string | null
  updated_at: string
  updated_by: string | null
}

export interface PrecedenteRow {
  id: string
  parecer_id: string
  organizacao_id: string
  objeto_keywords: string[] | null
  modalidade: string | null
  faixa_valor: string | null
  veredito: 'aprovar' | 'aprovar_com_ressalvas' | 'contrario'
  procurador_id: string | null
  emitido_em: string
  participa_pool: boolean
}

// Joined type returned by buscarPrecedentes (includes computed fields)
export interface PrecedenteComScore {
  id: string
  parecer_id: string
  objeto_processo: string
  modalidade: string | null
  faixa_valor: string | null
  veredito: 'aprovar' | 'aprovar_com_ressalvas' | 'contrario'
  procurador_nome: string | null   // null if from other org (anonymized)
  emitido_em: string
  score: number                    // 0-100 weighted similarity
  score_modalidade: number         // 0-100
  score_keywords: number           // 0-100
  score_valor: number              // 0-100
  mesma_org: boolean
  conteudo_parecer: string | null  // full text, loaded on modal open
}
```

- [ ] **Step 3: Update `ParecerRow` interface** — find and update the `ParecerRow` interface (or add it if it doesn't exist yet):

Search for `ParecerRow` in `src/types/database.ts`. If it exists, add the new columns. If not, append:

```typescript
export interface ParecerRow {
  id: string
  created_at: string
  updated_at: string
  processo_id: string
  organizacao_id: string
  procurador_id: string | null
  conteudo: string | null
  status: StatusParecer
  gerado_por_ia: boolean
  veredito: 'aprovar' | 'aprovar_com_ressalvas' | 'contrario' | null
  analise_ia: string | null
  ressalvas: string | null
  motivo_contrario: string | null
  data_envio_procuradoria: string | null
}
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: 0 errors (new fields are nullable so no existing code breaks).

- [ ] **Step 5: Commit**

```bash
git add src/types/database.ts
git commit -m "feat(types): adicionar StatusParecer em_analise/contrario, PrecedenteComScore, ConfiguracaoPlataformaRow"
```

---

## Task 3: Server Actions — `configuracoes-plataforma.ts`

**Files:**
- Create: `src/lib/actions/configuracoes-plataforma.ts`

- [ ] **Step 1: Create the file**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ConfiguracaoPlataformaRow } from '@/types/database'

export async function obterConfiguracoes(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('configuracoes_plataforma')
    .select('chave, valor')

  const resultado: Record<string, string> = {}
  for (const row of data ?? []) {
    resultado[row.chave] = row.valor
  }
  return resultado
}

const SchemaConfig = z.object({
  prazo_urgencia_parecer_dias: z.number().int().min(1).max(365),
  prazo_alerta_parecer_dias:   z.number().int().min(1).max(365),
}).refine(
  (d) => d.prazo_urgencia_parecer_dias < d.prazo_alerta_parecer_dias,
  { message: 'Prazo de urgencia deve ser menor que prazo de alerta.' }
)

export async function salvarConfiguracoes(
  input: { prazo_urgencia_parecer_dias: number; prazo_alerta_parecer_dias: number }
): Promise<{ success: boolean; error?: string }> {
  const parsed = SchemaConfig.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado.' }

  const updates: Array<Partial<ConfiguracaoPlataformaRow>> = [
    { chave: 'prazo_urgencia_parecer_dias', valor: String(parsed.data.prazo_urgencia_parecer_dias), updated_by: user.id, updated_at: new Date().toISOString() },
    { chave: 'prazo_alerta_parecer_dias',   valor: String(parsed.data.prazo_alerta_parecer_dias),   updated_by: user.id, updated_at: new Date().toISOString() },
  ]

  for (const update of updates) {
    const { error } = await (supabase as any)
      .from('configuracoes_plataforma')
      .update(update)
      .eq('chave', update.chave)

    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/admin/configuracoes-plataforma')
  return { success: true }
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/configuracoes-plataforma.ts
git commit -m "feat(actions): obterConfiguracoes e salvarConfiguracoes para admin_plataforma"
```

---

## Task 4: Server Actions — `procuradoria.ts`

**Files:**
- Create: `src/lib/actions/procuradoria.ts`

This is the largest action file. It has 9 exported functions.

- [ ] **Step 1: Create the file with types and helpers**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { executarIAComCreditos } from '@/lib/ai/wrapper'
import type { StatusParecer, PrecedenteComScore } from '@/types/database'

// Calcula a faixa de valor a partir de um numero
function calcularFaixaValor(valor: number | null): string {
  if (!valor) return 'indefinido'
  if (valor <= 50000)  return 'ate_50k'
  if (valor <= 100000) return '50k_100k'
  if (valor <= 500000) return '100k_500k'
  return 'acima_500k'
}

// Extrai keywords do objeto (palavras com 4+ chars, sem stopwords)
function extrairKeywords(objeto: string): string[] {
  const stopwords = new Set(['para', 'pela', 'pelo', 'como', 'com', 'que', 'dos', 'das', 'dos', 'uma', 'este', 'essa'])
  return objeto
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !stopwords.has(w))
    .slice(0, 20)
}

// Calcula score de similaridade entre dois conjuntos de keywords (Jaccard simplificado)
function scoreKeywords(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  const intersecao = [...setA].filter(k => setB.has(k)).length
  const uniao = new Set([...setA, ...setB]).size
  return Math.round((intersecao / uniao) * 100)
}

// Calcula score de faixa de valor (100 = mesma faixa, 50 = faixa adjacente, 0 = distante)
function scoreFaixaValor(a: string, b: string): number {
  const faixas = ['ate_50k', '50k_100k', '100k_500k', 'acima_500k', 'indefinido']
  const ia = faixas.indexOf(a)
  const ib = faixas.indexOf(b)
  if (ia === -1 || ib === -1 || ia === 4 || ib === 4) return 0
  const diff = Math.abs(ia - ib)
  if (diff === 0) return 100
  if (diff === 1) return 50
  return 0
}
```

- [ ] **Step 2: Add `listarPareceresOrg`**

Append to `src/lib/actions/procuradoria.ts`:

```typescript
export interface ParecerListItem {
  id: string
  processo_id: string
  status: StatusParecer
  veredito: string | null
  data_envio_procuradoria: string | null
  created_at: string
  processo: {
    objeto: string
    numero_processo: string | null
    modalidade: string
    valor_estimado: number | null
    secretaria_id: string | null
    secretaria_nome: string | null
  }
}

export async function listarPareceresOrg(): Promise<ParecerListItem[]> {
  const supabase = await createClient()

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .single()

  if (!usuarioRaw) return []
  const { organizacao_id } = usuarioRaw as { organizacao_id: string }

  const { data } = await (supabase as any)
    .from('pareceres')
    .select(`
      id,
      processo_id,
      status,
      veredito,
      data_envio_procuradoria,
      created_at,
      processos_licitatorios (
        objeto,
        numero_processo,
        modalidade,
        valor_estimado,
        secretaria_id,
        secretarias ( nome )
      )
    `)
    .eq('organizacao_id', organizacao_id)
    .order('created_at', { ascending: true })

  return (data ?? []).map((row: any) => ({
    id: row.id,
    processo_id: row.processo_id,
    status: row.status,
    veredito: row.veredito,
    data_envio_procuradoria: row.data_envio_procuradoria,
    created_at: row.created_at,
    processo: {
      objeto:          row.processos_licitatorios?.objeto ?? '',
      numero_processo: row.processos_licitatorios?.numero_processo ?? null,
      modalidade:      row.processos_licitatorios?.modalidade ?? '',
      valor_estimado:  row.processos_licitatorios?.valor_estimado ?? null,
      secretaria_id:   row.processos_licitatorios?.secretaria_id ?? null,
      secretaria_nome: row.processos_licitatorios?.secretarias?.nome ?? null,
    },
  }))
}
```

- [ ] **Step 3: Add `salvarVeredito` and `salvarConteudo`**

Append to `src/lib/actions/procuradoria.ts`:

```typescript
export async function salvarVeredito(
  parecerId: string,
  veredito: 'aprovar' | 'aprovar_com_ressalvas' | 'contrario'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  // Ao selecionar veredito pela primeira vez, muda status para em_analise
  const { data: current } = await (supabase as any)
    .from('pareceres')
    .select('status')
    .eq('id', parecerId)
    .single()

  const novoStatus: StatusParecer = (current?.status === 'pendente') ? 'em_analise' : current?.status

  const { error } = await (supabase as any)
    .from('pareceres')
    .update({ veredito, status: novoStatus, updated_at: new Date().toISOString() })
    .eq('id', parecerId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/procuradoria')
  return { success: true }
}

export async function salvarConteudo(
  parecerId: string,
  conteudo: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('pareceres')
    .update({ conteudo, updated_at: new Date().toISOString() })
    .eq('id', parecerId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
```

- [ ] **Step 4: Add `emitirParecer`**

Append to `src/lib/actions/procuradoria.ts`:

```typescript
export async function emitirParecer(
  parecerId: string,
  conteudo: string,
  veredito: 'aprovar' | 'aprovar_com_ressalvas' | 'contrario',
  extras: { ressalvas?: string; motivo_contrario?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!conteudo.trim()) return { success: false, error: 'O texto do parecer nao pode estar vazio.' }
  if (!veredito) return { success: false, error: 'Selecione o veredito antes de emitir.' }
  if (veredito === 'aprovar_com_ressalvas' && !extras.ressalvas?.trim()) {
    return { success: false, error: 'Informe as ressalvas antes de emitir.' }
  }
  if (veredito === 'contrario' && !extras.motivo_contrario?.trim()) {
    return { success: false, error: 'Informe o motivo do parecer contrario antes de emitir.' }
  }

  const supabase = await createClient()

  // Determina novo status do parecer
  const statusFinal: StatusParecer = veredito === 'contrario' ? 'contrario' : veredito === 'aprovado_com_ressalvas' ? 'aprovado_com_ressalvas' : 'aprovado'

  const { data: parecerAtual } = await (supabase as any)
    .from('pareceres')
    .select('processo_id, organizacao_id')
    .eq('id', parecerId)
    .single()

  if (!parecerAtual) return { success: false, error: 'Parecer nao encontrado.' }

  const { error } = await (supabase as any)
    .from('pareceres')
    .update({
      conteudo,
      veredito,
      status: statusFinal,
      ressalvas: extras.ressalvas ?? null,
      motivo_contrario: extras.motivo_contrario ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parecerId)

  if (error) return { success: false, error: error.message }

  // Avanca etapa do processo conforme veredito
  const proximaEtapa = veredito === 'contrario' ? null : 9 // 9 = autorizacao
  if (proximaEtapa) {
    await (supabase as any)
      .from('processos_licitatorios')
      .update({ etapa_atual: proximaEtapa })
      .eq('id', parecerAtual.processo_id)
  }

  // Notifica destinatários conforme veredito
  const { data: { user } } = await supabase.auth.getUser()
  const processoId = parecerAtual.processo_id
  const orgId = parecerAtual.organizacao_id

  if (veredito === 'contrario') {
    // Notifica setor de licitacao
    const { data: destinatarios } = await (supabase as any)
      .from('usuarios')
      .select('id')
      .eq('organizacao_id', orgId)
      .eq('papel', 'setor_licitacao')

    for (const dest of destinatarios ?? []) {
      await (supabase as any).from('notificacoes').insert({
        usuario_id: dest.id,
        titulo: 'Parecer contrario emitido',
        mensagem: 'A procuradoria emitiu parecer contrario. Acesse para decidir entre corrigir ou arquivar.',
        link: `/processos/${processoId}/parecer`,
        processo_id: processoId,
      })
    }
  } else {
    // Notifica autoridade competente
    const { data: destinatarios } = await (supabase as any)
      .from('usuarios')
      .select('id')
      .eq('organizacao_id', orgId)
      .eq('papel', 'autoridade_competente')

    for (const dest of destinatarios ?? []) {
      await (supabase as any).from('notificacoes').insert({
        usuario_id: dest.id,
        titulo: 'Parecer juridico aprovado',
        mensagem: 'Parecer juridico emitido com sucesso. O processo aguarda sua autorizacao.',
        link: `/processos/${processoId}/autorizacao`,
        processo_id: processoId,
      })
    }
  }

  // Indexa precedente para busca futura
  await indexarPrecedente(parecerId)

  revalidatePath(`/processos/${processoId}/parecer`)
  revalidatePath('/procuradoria')
  return { success: true }
}
```

- [ ] **Step 5: Add `gerarMinutaIA`**

Append to `src/lib/actions/procuradoria.ts`:

```typescript
export async function gerarMinutaIA(
  processoId: string,
  parecerId: string,
  veredito: 'aprovar' | 'aprovar_com_ressalvas' | 'contrario'
): Promise<{ success: boolean; conteudo?: string; error?: string }> {
  const supabase = await createClient()

  const [procRaw, trRaw, dfdRaw] = await Promise.all([
    supabase.from('processos_licitatorios').select('objeto, modalidade, valor_estimado').eq('id', processoId).single(),
    (supabase as any).from('termo_referencia').select('fundamentacao, modelo_execucao, requisitos_tecnicos').eq('processo_id', processoId).maybeSingle(),
    (supabase as any).from('dfd').select('justificativa_necessidade').eq('processo_id', processoId).maybeSingle(),
  ])

  const proc = procRaw.data as any
  const tr = trRaw.data as any
  const dfd = dfdRaw.data as any

  const vereditos: Record<typeof veredito, string> = {
    aprovar:                'FAVORAVEL ao prosseguimento do processo',
    aprovar_com_ressalvas:  'FAVORAVEL COM RESSALVAS, condicionando o prosseguimento ao atendimento das observacoes registradas',
    contrario:              'CONTRARIO ao prosseguimento, recomendando a devolucao para correcao das irregularidades apontadas',
  }

  const prompt = `<instrucoes>
Voce e um Procurador Juridico Municipal especialista em licitacoes publicas.
Redija uma MINUTA DE PARECER JURIDICO em conformidade com o Art. 53 da Lei 14.133/21.
O veredito do procurador e: ${vereditos[veredito]}.
Redija com linguagem juridica formal, sem travessao (em dash).
Use estrutura: EMENTA / RELATORIO / FUNDAMENTACAO JURIDICA / CONCLUSAO.
Retorne APENAS o texto do parecer, sem saudacoes ou explicacoes adicionais.
</instrucoes>

<dados_processo>
Objeto: ${proc?.objeto ?? 'Nao informado'}
Modalidade: ${proc?.modalidade ?? 'Nao informada'}
Valor estimado: ${proc?.valor_estimado ? `R$ ${proc.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Nao informado'}
Justificativa (DFD): ${dfd?.justificativa_necessidade ?? 'Nao disponivel'}
Fundamentacao (TR): ${tr?.fundamentacao ?? 'Nao disponivel'}
Requisitos tecnicos: ${tr?.requisitos_tecnicos ?? 'Nao disponivel'}
</dados_processo>`

  const resultado = await executarIAComCreditos({
    prompt,
    tipoAcao: 'gerar_documento',
    processoId,
    temperature: 0.3,
  })

  if (!resultado.success) return { success: false, error: resultado.error }

  // Marca parecer como gerado por IA
  await (supabase as any)
    .from('pareceres')
    .update({ gerado_por_ia: true, updated_at: new Date().toISOString() })
    .eq('id', parecerId)

  return { success: true, conteudo: resultado.texto }
}
```

- [ ] **Step 6: Add `analisarComIA`**

Append to `src/lib/actions/procuradoria.ts`:

```typescript
export async function analisarComIA(
  processoId: string,
  parecerId: string,
  textoParecer: string,
  veredito: string
): Promise<{ success: boolean; analise?: string; error?: string }> {
  if (textoParecer.length < 100) {
    return { success: false, error: 'Redija ao menos 100 caracteres antes de solicitar analise.' }
  }

  const supabase = await createClient()
  const procRaw = await supabase
    .from('processos_licitatorios')
    .select('objeto, modalidade')
    .eq('id', processoId)
    .single()

  const proc = procRaw.data as any

  const prompt = `<instrucoes>
Voce e um consultor juridico especialista em Lei 14.133/21.
Analise o PARECER JURIDICO abaixo e produza uma ANALISE CRITICA independente.
Voce deve:
1. Corroborar ou questionar os argumentos juridicos apresentados
2. Apontar riscos legais especificos ao objeto e modalidade
3. Citar artigos da Lei 14.133/21 aplicaveis
4. Indicar se o veredito ("${veredito}") esta juridicamente fundamentado
NÃO reescreva o parecer. Produza apenas a analise critica, de forma objetiva.
Inclua ao final: "Analise gerada por IA. A decisao final e de responsabilidade exclusiva do procurador signatario."
</instrucoes>

<contexto>
Objeto do processo: ${proc?.objeto ?? 'Nao informado'}
Modalidade: ${proc?.modalidade ?? 'Nao informada'}
Veredito proposto: ${veredito}
</contexto>

<texto_parecer>
${textoParecer}
</texto_parecer>`

  const resultado = await executarIAComCreditos({
    prompt,
    tipoAcao: 'aprimorar_texto',
    processoId,
    temperature: 0.2,
  })

  if (!resultado.success) return { success: false, error: resultado.error }

  // Salva analise no campo analise_ia
  await (supabase as any)
    .from('pareceres')
    .update({ analise_ia: resultado.texto, updated_at: new Date().toISOString() })
    .eq('id', parecerId)

  return { success: true, analise: resultado.texto }
}
```

- [ ] **Step 7: Add `buscarPrecedentes`**

Append to `src/lib/actions/procuradoria.ts`:

```typescript
export async function buscarPrecedentes(
  processoId: string
): Promise<PrecedenteComScore[]> {
  const supabase = await createClient()

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .single()

  if (!usuarioRaw) return []
  const orgId = (usuarioRaw as any).organizacao_id

  const procRaw = await supabase
    .from('processos_licitatorios')
    .select('objeto, modalidade, valor_estimado')
    .eq('id', processoId)
    .single()

  const proc = procRaw.data as any
  if (!proc) return []

  const keywordsAlvo = extrairKeywords(proc.objeto ?? '')
  const modalidadeAlvo = proc.modalidade ?? ''
  const faixaAlvo = calcularFaixaValor(proc.valor_estimado)

  // Busca precedentes da org + pool
  const { data: rawRows } = await (supabase as any)
    .from('pareceres_precedentes')
    .select(`
      id,
      parecer_id,
      organizacao_id,
      objeto_keywords,
      modalidade,
      faixa_valor,
      veredito,
      procurador_id,
      emitido_em,
      participa_pool,
      pareceres ( conteudo, processos_licitatorios ( objeto ) ),
      usuarios ( nome_completo )
    `)
    .or(`organizacao_id.eq.${orgId},participa_pool.eq.true`)
    .limit(50)

  const resultados: PrecedenteComScore[] = []

  for (const row of rawRows ?? []) {
    const kwRow = (row.objeto_keywords as string[]) ?? []
    const scoreKw  = scoreKeywords(keywordsAlvo, kwRow)
    const scoreMod = row.modalidade === modalidadeAlvo ? 100 : 0
    const scoreVal = scoreFaixaValor(faixaAlvo, row.faixa_valor ?? 'indefinido')

    // Score ponderado: modalidade 40%, keywords 40%, valor 20%
    const score = Math.round(scoreMod * 0.4 + scoreKw * 0.4 + scoreVal * 0.2)

    // Filtra: so retorna se score >= 30 (relevância mínima)
    if (score < 30) continue

    const mesmaOrg = row.organizacao_id === orgId

    resultados.push({
      id: row.id,
      parecer_id: row.parecer_id,
      objeto_processo: (row.pareceres as any)?.processos_licitatorios?.objeto ?? '',
      modalidade: row.modalidade,
      faixa_valor: row.faixa_valor,
      veredito: row.veredito,
      procurador_nome: mesmaOrg ? ((row.usuarios as any)?.nome_completo ?? null) : null,
      emitido_em: row.emitido_em,
      score,
      score_modalidade: scoreMod,
      score_keywords: scoreKw,
      score_valor: scoreVal,
      mesma_org: mesmaOrg,
      conteudo_parecer: mesmaOrg ? ((row.pareceres as any)?.conteudo ?? null) : null,
    })
  }

  // Ordena por score descendente
  resultados.sort((a, b) => b.score - a.score)
  return resultados.slice(0, 5)
}
```

- [ ] **Step 8: Add `indexarPrecedente` and `obterResumoProcesso`**

Append to `src/lib/actions/procuradoria.ts`:

```typescript
export async function indexarPrecedente(parecerId: string): Promise<void> {
  const supabase = await createClient()

  const { data: parecerRaw } = await (supabase as any)
    .from('pareceres')
    .select('processo_id, organizacao_id, procurador_id, veredito, created_at')
    .eq('id', parecerId)
    .single()

  if (!parecerRaw?.veredito) return // so indexa se tem veredito

  const procRaw = await supabase
    .from('processos_licitatorios')
    .select('objeto, modalidade, valor_estimado')
    .eq('id', parecerRaw.processo_id)
    .single()

  const proc = procRaw.data as any
  if (!proc) return

  const { data: orgRaw } = await (supabase as any)
    .from('organizacoes')
    .select('participa_pool_precedentes')
    .eq('id', parecerRaw.organizacao_id)
    .single()

  await (supabase as any)
    .from('pareceres_precedentes')
    .upsert({
      parecer_id:     parecerId,
      organizacao_id: parecerRaw.organizacao_id,
      objeto_keywords: extrairKeywords(proc.objeto ?? ''),
      modalidade:     proc.modalidade,
      faixa_valor:    calcularFaixaValor(proc.valor_estimado),
      veredito:       parecerRaw.veredito,
      procurador_id:  parecerRaw.procurador_id,
      emitido_em:     parecerRaw.created_at,
      participa_pool: (orgRaw as any)?.participa_pool_precedentes ?? false,
    }, { onConflict: 'parecer_id' })
}

export interface ResumoProcesso {
  objeto: string
  modalidade: string
  valor_estimado: number | null
  numero_processo: string | null
  secretaria_nome: string | null
  justificativa: string | null
  requisitos_tecnicos: string | null
  resultados_pretendidos: string | null
  riscos_criticos: Array<{ descricao: string; probabilidade: string; impacto: string }>
  historico_etapas: Array<{ etapa: string; data: string; responsavel: string | null }>
}

export async function obterResumoProcesso(processoId: string): Promise<ResumoProcesso | null> {
  const supabase = await createClient()

  const [procRaw, trRaw, etpRaw, dfdRaw, riscosRaw] = await Promise.all([
    supabase.from('processos_licitatorios').select('objeto, modalidade, valor_estimado, numero_processo, secretaria_id, secretarias(nome)').eq('id', processoId).single(),
    (supabase as any).from('termo_referencia').select('requisitos_tecnicos').eq('processo_id', processoId).maybeSingle(),
    (supabase as any).from('etp').select('resultados_pretendidos').eq('processo_id', processoId).maybeSingle(),
    (supabase as any).from('dfd').select('justificativa_necessidade').eq('processo_id', processoId).maybeSingle(),
    (supabase as any).from('mapa_riscos').select('descricao, probabilidade, impacto').eq('processo_id', processoId).in('impacto', ['alto', 'critico']).limit(5),
  ])

  const proc = procRaw.data as any
  if (!proc) return null

  return {
    objeto:                 proc.objeto ?? '',
    modalidade:             proc.modalidade ?? '',
    valor_estimado:         proc.valor_estimado ?? null,
    numero_processo:        proc.numero_processo ?? null,
    secretaria_nome:        (proc.secretarias as any)?.nome ?? null,
    justificativa:          (dfdRaw.data as any)?.justificativa_necessidade ?? null,
    requisitos_tecnicos:    (trRaw.data as any)?.requisitos_tecnicos ?? null,
    resultados_pretendidos: (etpRaw.data as any)?.resultados_pretendidos ?? null,
    riscos_criticos:        riscosRaw.data ?? [],
    historico_etapas:       [], // Extensao futura: log de transicoes de etapa
  }
}
```

- [ ] **Step 9: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 10: Commit**

```bash
git add src/lib/actions/procuradoria.ts
git commit -m "feat(actions): procuradoria.ts com listar, salvarVeredito, emitir, gerarMinutaIA, analisarComIA, buscarPrecedentes, indexar, obterResumo"
```

---

## Task 5: Admin — Configurações da Plataforma

**Files:**
- Create: `src/app/(dashboard)/admin/configuracoes-plataforma/page.tsx`
- Modify: `src/app/(dashboard)/admin/sidebar-admin.tsx`

- [ ] **Step 1: Create the config page**

```typescript
// src/app/(dashboard)/admin/configuracoes-plataforma/page.tsx
import ConfiguracoesPlatafoma from './configuracoes-form'
import { obterConfiguracoes } from '@/lib/actions/configuracoes-plataforma'

export default async function ConfiguracoesPlataformaPage() {
  const configs = await obterConfiguracoes()
  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">Configuracoes da Plataforma</h1>
        <p className="text-sm text-gray-500 mt-0.5">Parametros globais aplicados a toda a plataforma.</p>
      </div>
      <ConfiguracoesPlatafoma
        prazoUrgencia={Number(configs['prazo_urgencia_parecer_dias'] ?? 5)}
        prazoAlerta={Number(configs['prazo_alerta_parecer_dias'] ?? 10)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create the client form component**

Create: `src/app/(dashboard)/admin/configuracoes-plataforma/configuracoes-form.tsx`

```typescript
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { salvarConfiguracoes } from '@/lib/actions/configuracoes-plataforma'

export default function ConfiguracoesPlatafoma({
  prazoUrgencia,
  prazoAlerta,
}: {
  prazoUrgencia: number
  prazoAlerta: number
}) {
  const [urgencia, setUrgencia] = useState(prazoUrgencia)
  const [alerta, setAlerta]     = useState(prazoAlerta)
  const [salvando, setSalvando] = useState(false)

  async function handleSalvar() {
    setSalvando(true)
    const res = await salvarConfiguracoes({
      prazo_urgencia_parecer_dias: urgencia,
      prazo_alerta_parecer_dias:   alerta,
    })
    res.success
      ? toast.success('Configuracoes salvas.')
      : toast.error(res.error ?? 'Erro ao salvar.')
    setSalvando(false)
  }

  return (
    <Card className="border-gray-200">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle className="text-sm font-semibold text-gray-800">Prazos de Alerta para Pareceres</CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Urgencia de parecer (dias)
          </Label>
          <p className="text-xs text-gray-500">
            Dias sem parecer para exibir badge URGENTE vermelho.
          </p>
          <Input
            type="number"
            min={1}
            max={365}
            value={urgencia}
            onChange={e => setUrgencia(Number(e.target.value))}
            className="w-32"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Alerta de prazo (dias)
          </Label>
          <p className="text-xs text-gray-500">
            Dias sem parecer para exibir badge ATENCAO ambar.
          </p>
          <Input
            type="number"
            min={1}
            max={365}
            value={alerta}
            onChange={e => setAlerta(Number(e.target.value))}
            className="w-32"
          />
        </div>
        {urgencia >= alerta && (
          <p className="text-xs text-red-600">
            O prazo de urgencia deve ser menor que o prazo de alerta.
          </p>
        )}
      </CardContent>
      <CardFooter className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
        <Button
          onClick={handleSalvar}
          disabled={salvando || urgencia >= alerta}
          className="bg-blue-700 hover:bg-blue-800 text-white gap-2 h-9 text-sm"
        >
          {salvando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            : <><Save className="w-4 h-4" /> Salvar configuracoes</>}
        </Button>
      </CardFooter>
    </Card>
  )
}
```

- [ ] **Step 3: Add nav item to sidebar-admin.tsx**

In `src/app/(dashboard)/admin/sidebar-admin.tsx`, find the imports line:
```typescript
import {
  LayoutDashboard, BookOpen, Bot, Building2, Users,
  HelpCircle,
} from 'lucide-react'
```
Replace with:
```typescript
import {
  LayoutDashboard, BookOpen, Bot, Building2, Users,
  HelpCircle, Settings2,
} from 'lucide-react'
```

Then find the `NAV` array closing `]` and insert before it:
```typescript
  {
    href: '/admin/configuracoes-plataforma',
    label: 'Configuracoes',
    icon: Settings2,
    tooltip: 'Parametros globais da plataforma: prazos de alerta para pareceres e outras configuracoes.',
  },
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/admin/configuracoes-plataforma/ src/app/\(dashboard\)/admin/sidebar-admin.tsx
git commit -m "feat(admin): pagina de configuracoes da plataforma com prazos de parecer"
```

---

## Task 6: Route `/procuradoria` — Layout, Page e ListaPareceres

**Files:**
- Create: `src/app/(dashboard)/procuradoria/layout.tsx`
- Create: `src/app/(dashboard)/procuradoria/page.tsx`
- Create: `src/app/(dashboard)/procuradoria/lista-pareceres.tsx`

- [ ] **Step 1: Create layout.tsx (role guard)**

```typescript
// src/app/(dashboard)/procuradoria/layout.tsx
import { redirect } from 'next/navigation'
import { obterPapelUsuario } from '@/lib/actions/usuario'

export default async function ProcuradoriaLayout({ children }: { children: React.ReactNode }) {
  const papel = await obterPapelUsuario()
  const permitidos = ['procurador', 'admin_organizacao', 'admin_plataforma']
  if (!papel || !permitidos.includes(papel)) redirect('/dashboard')
  return <>{children}</>
}
```

- [ ] **Step 2: Create page.tsx (Server Component)**

```typescript
// src/app/(dashboard)/procuradoria/page.tsx
import { listarPareceresOrg } from '@/lib/actions/procuradoria'
import { obterConfiguracoes } from '@/lib/actions/configuracoes-plataforma'
import ListaPareceres from './lista-pareceres'

export default async function ProcuradoriaPage() {
  const [pareceres, configs] = await Promise.all([
    listarPareceresOrg(),
    obterConfiguracoes(),
  ])

  const prazoUrgencia = Number(configs['prazo_urgencia_parecer_dias'] ?? 5)
  const prazoAlerta   = Number(configs['prazo_alerta_parecer_dias']   ?? 10)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Procuradoria</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Fila de pareceres juridicos — Art. 53 da Lei 14.133/21
        </p>
      </div>
      <ListaPareceres
        pareceres={pareceres}
        prazoUrgenciaDias={prazoUrgencia}
        prazoAlertaDias={prazoAlerta}
      />
    </div>
  )
}
```

- [ ] **Step 3: Create lista-pareceres.tsx (Client Component)**

```typescript
// src/app/(dashboard)/procuradoria/lista-pareceres.tsx
'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Scale, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ParecerListItem } from '@/lib/actions/procuradoria'

// Mapeia modalidade para label legivel
const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico: 'Pregao Eletronico',
  pregao_presencial: 'Pregao Presencial',
  concorrencia:      'Concorrencia',
  concurso:          'Concurso',
  leilao:            'Leilao',
  dialogo_competitivo: 'Dialogo Competitivo',
  dispensa:          'Dispensa',
  inexigibilidade:   'Inexigibilidade',
}

function calcularBadgeUrgencia(
  dataEnvio: string | null,
  prazoUrgencia: number,
  prazoAlerta: number
): { tipo: 'urgente' | 'atencao' | 'novo' | null; diasDecorridos: number } {
  if (!dataEnvio) return { tipo: null, diasDecorridos: 0 }
  const hoje = new Date()
  const envio = new Date(dataEnvio)
  const diasDecorridos = Math.floor((hoje.getTime() - envio.getTime()) / (1000 * 60 * 60 * 24))

  if (diasDecorridos >= prazoUrgencia) return { tipo: 'urgente',  diasDecorridos }
  if (diasDecorridos >= prazoAlerta)   return { tipo: 'atencao',  diasDecorridos }
  if (diasDecorridos < 2)              return { tipo: 'novo',     diasDecorridos }
  return { tipo: null, diasDecorridos }
}

function BadgeUrgencia({ tipo, dias }: { tipo: 'urgente' | 'atencao' | 'novo' | null; dias: number }) {
  if (!tipo) return null
  const cfg = {
    urgente: { label: 'URGENTE', className: 'bg-red-50 text-red-700 border-red-200' },
    atencao: { label: 'ATENCAO', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    novo:    { label: 'NOVO',    className: 'bg-green-50 text-green-700 border-green-200' },
  }[tipo]
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 ${cfg.className}`}>
      {cfg.label}
    </Badge>
  )
}

function ItemParecer({
  item,
  prazoUrgencia,
  prazoAlerta,
}: {
  item: ParecerListItem
  prazoUrgencia: number
  prazoAlerta: number
}) {
  const { tipo, diasDecorridos } = calcularBadgeUrgencia(
    item.data_envio_procuradoria,
    prazoUrgencia,
    prazoAlerta
  )
  const temConteudo = item.status !== 'pendente'
  const labelBotao = temConteudo ? 'Abrir parecer' : 'Criar parecer'
  const valorFormatado = item.processo.valor_estimado
    ? `R$ ${item.processo.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : null

  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">
      <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
        <Scale className="w-4 h-4 text-blue-700" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">
          {item.processo.numero_processo && (
            <span className="text-gray-500 font-normal mr-1">{item.processo.numero_processo} —</span>
          )}
          {item.processo.objeto}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-500">
          <span>{MODALIDADE_LABEL[item.processo.modalidade] ?? item.processo.modalidade}</span>
          {valorFormatado && <><span>·</span><span>{valorFormatado}</span></>}
          {item.processo.secretaria_nome && <><span>·</span><span>{item.processo.secretaria_nome}</span></>}
          {item.data_envio_procuradoria && (
            <>
              <span>·</span>
              <span className={tipo === 'urgente' ? 'text-red-600 font-semibold' : ''}>
                Enviado ha {diasDecorridos === 0 ? 'hoje' : diasDecorridos === 1 ? 'ontem' : `${diasDecorridos} dias`}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <BadgeUrgencia tipo={tipo} dias={diasDecorridos} />
        <Link href={`/processos/${item.processo_id}/parecer`}>
          <Button
            variant={temConteudo ? 'outline' : 'default'}
            size="sm"
            className={temConteudo
              ? 'h-8 text-xs border-gray-200 text-gray-700'
              : 'h-8 text-xs bg-[#1A365D] hover:bg-[#1A365D]/90 text-white'}
          >
            {labelBotao} →
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function ListaPareceres({
  pareceres,
  prazoUrgenciaDias,
  prazoAlertaDias,
}: {
  pareceres: ParecerListItem[]
  prazoUrgenciaDias: number
  prazoAlertaDias: number
}) {
  const pendentes   = useMemo(() => pareceres.filter(p => p.status === 'pendente'), [pareceres])
  const emAnalise   = useMemo(() => pareceres.filter(p => p.status === 'em_analise'), [pareceres])
  const historico   = useMemo(() => pareceres.filter(p =>
    ['aprovado', 'aprovado_com_ressalvas', 'contrario', 'devolvido'].includes(p.status)
  ), [pareceres])

  const agora = new Date()
  const emitidosMes = useMemo(() => historico.filter(p => {
    const d = new Date(p.created_at)
    return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear()
  }).length, [historico])

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`bg-white border rounded-xl p-4 border-l-4 ${pendentes.length > 0 ? 'border-l-red-500' : 'border-l-gray-200'}`} style={{ borderLeftWidth: '3px' }}>
          <div className={`text-2xl font-bold ${pendentes.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>{pendentes.length}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Pendentes</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4" style={{ borderLeftWidth: '3px', borderLeftColor: '#B7935E' }}>
          <div className="text-2xl font-bold text-[#B7935E]">{emAnalise.length}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Em analise</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4" style={{ borderLeftWidth: '3px', borderLeftColor: '#38A169' }}>
          <div className="text-2xl font-bold text-green-600">{emitidosMes}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Emitidos este mes</div>
        </div>
      </div>

      {/* Abas */}
      <Tabs defaultValue="pendentes">
        <TabsList className="bg-white border border-gray-200 rounded-t-xl rounded-b-none w-full justify-start gap-0 h-auto p-0">
          <TabsTrigger
            value="pendentes"
            className="rounded-none rounded-tl-xl px-5 py-3 text-[12px] font-semibold data-[state=active]:border-b-2 data-[state=active]:border-[#B7935E] data-[state=active]:bg-white"
          >
            Pendentes
            {pendentes.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{pendentes.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="em_analise"
            className="rounded-none px-5 py-3 text-[12px] font-semibold data-[state=active]:border-b-2 data-[state=active]:border-[#B7935E] data-[state=active]:bg-white"
          >
            Em analise
            {emAnalise.length > 0 && (
              <span className="ml-2 bg-gray-200 text-gray-600 text-[10px] rounded-full px-1.5 py-0.5">{emAnalise.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="historico"
            className="rounded-none px-5 py-3 text-[12px] font-semibold data-[state=active]:border-b-2 data-[state=active]:border-[#B7935E] data-[state=active]:bg-white"
          >
            Historico
          </TabsTrigger>
        </TabsList>

        <div className="bg-white border border-t-0 border-gray-200 rounded-b-xl">
          <TabsContent value="pendentes" className="mt-0">
            {pendentes.length === 0
              ? <p className="text-center text-sm text-gray-400 py-10">Nenhum parecer pendente.</p>
              : pendentes.map(p => (
                  <ItemParecer key={p.id} item={p} prazoUrgencia={prazoUrgenciaDias} prazoAlerta={prazoAlertaDias} />
                ))}
          </TabsContent>
          <TabsContent value="em_analise" className="mt-0">
            {emAnalise.length === 0
              ? <p className="text-center text-sm text-gray-400 py-10">Nenhum parecer em analise.</p>
              : emAnalise.map(p => (
                  <ItemParecer key={p.id} item={p} prazoUrgencia={prazoUrgenciaDias} prazoAlerta={prazoAlertaDias} />
                ))}
          </TabsContent>
          <TabsContent value="historico" className="mt-0">
            {historico.length === 0
              ? <p className="text-center text-sm text-gray-400 py-10">Nenhum parecer emitido ainda.</p>
              : [...historico].reverse().map(p => (
                  <ItemParecer key={p.id} item={p} prazoUrgencia={prazoUrgenciaDias} prazoAlerta={prazoAlertaDias} />
                ))}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/procuradoria/
git commit -m "feat(procuradoria): rota /procuradoria com guard de papel, KPIs e lista por abas"
```

---

## Task 7: Componentes do Parecer — Resumo, Documentos e Modal de Precedente

**Files:**
- Create: `src/app/(dashboard)/processos/[id]/parecer/resumo-processo.tsx`
- Create: `src/app/(dashboard)/processos/[id]/parecer/painel-documentos.tsx`
- Create: `src/app/(dashboard)/processos/[id]/parecer/modal-precedente.tsx`

- [ ] **Step 1: Create resumo-processo.tsx**

```typescript
// src/app/(dashboard)/processos/[id]/parecer/resumo-processo.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ResumoProcesso } from '@/lib/actions/procuradoria'

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico: 'Pregao Eletronico',
  pregao_presencial: 'Pregao Presencial',
  concorrencia:      'Concorrencia',
  concurso:          'Concurso',
  leilao:            'Leilao',
  dialogo_competitivo: 'Dialogo Competitivo',
  dispensa:          'Dispensa',
  inexigibilidade:   'Inexigibilidade',
}

function CampoResumo({ label, valor }: { label: string; valor: string | null }) {
  if (!valor) return null
  const [expandido, setExpandido] = useState(false)
  const longo = valor.length > 200
  return (
    <div>
      <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-800 mt-0.5">
        {longo && !expandido ? valor.slice(0, 200) + '...' : valor}
        {longo && (
          <button
            onClick={() => setExpandido(!expandido)}
            className="ml-1 text-[11px] text-blue-600 hover:underline"
          >
            {expandido ? 'ver menos' : 'ver mais'}
          </button>
        )}
      </dd>
    </div>
  )
}

export default function ResumoProcesso({ resumo }: { resumo: ResumoProcesso }) {
  const [aberto, setAberto] = useState(true)

  return (
    <Card className="border-gray-200 shadow-sm">
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50/50 transition-colors rounded-t-xl"
      >
        <div>
          <span className="text-sm font-semibold text-gray-800">Resumo do Processo</span>
          <span className="ml-2 text-[11px] text-gray-400">dados para analise</span>
        </div>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {aberto && (
        <CardContent className="px-5 pb-5 pt-0 border-t border-gray-100">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-4">
            <CampoResumo label="Objeto"       valor={resumo.objeto} />
            <div>
              <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Modalidade</dt>
              <dd className="text-sm text-gray-800 mt-0.5">{MODALIDADE_LABEL[resumo.modalidade] ?? resumo.modalidade}</dd>
            </div>
            {resumo.valor_estimado && (
              <div>
                <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Valor estimado</dt>
                <dd className="text-sm text-gray-800 mt-0.5">
                  {resumo.valor_estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </dd>
              </div>
            )}
            {resumo.secretaria_nome && (
              <div>
                <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Secretaria</dt>
                <dd className="text-sm text-gray-800 mt-0.5">{resumo.secretaria_nome}</dd>
              </div>
            )}
            <CampoResumo label="Justificativa da contratacao" valor={resumo.justificativa} />
            <CampoResumo label="Principais requisitos tecnicos" valor={resumo.requisitos_tecnicos} />
            <CampoResumo label="Resultados pretendidos" valor={resumo.resultados_pretendidos} />
          </dl>

          {resumo.riscos_criticos.length > 0 && (
            <div className="mt-5 p-4 bg-red-50 border border-red-100 rounded-lg">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span className="text-xs font-semibold text-red-700">Riscos de alta criticidade identificados</span>
              </div>
              <ul className="space-y-1">
                {resumo.riscos_criticos.map((r, i) => (
                  <li key={i} className="text-xs text-red-800">
                    {r.descricao}
                    <span className="text-red-500 ml-1">(prob: {r.probabilidade}, impacto: {r.impacto})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Create painel-documentos.tsx**

```typescript
// src/app/(dashboard)/processos/[id]/parecer/painel-documentos.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface DocumentoLink {
  label: string
  href: string
  disponivel: boolean
}

export default function PainelDocumentos({
  processoId,
  documentosDisponiveis,
}: {
  processoId: string
  documentosDisponiveis: { dfd: boolean; etp: boolean; tr: boolean; edital: boolean }
}) {
  const [aberto, setAberto] = useState(false)

  const docs: DocumentoLink[] = [
    { label: 'DFD',    href: `/processos/${processoId}/dfd`,    disponivel: documentosDisponiveis.dfd    },
    { label: 'ETP',    href: `/processos/${processoId}/etp`,    disponivel: documentosDisponiveis.etp    },
    { label: 'TR',     href: `/processos/${processoId}/tr`,     disponivel: documentosDisponiveis.tr     },
    { label: 'Edital', href: `/processos/${processoId}/edital`, disponivel: documentosDisponiveis.edital },
  ]

  const disponiveis = docs.filter(d => d.disponivel)

  return (
    <Card className="border-gray-200 shadow-sm">
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">Documentos do processo</span>
          <span className="text-[11px] text-gray-400">({disponiveis.length} disponivel{disponiveis.length !== 1 ? 'is' : ''})</span>
        </div>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {aberto && (
        <CardContent className="px-5 pb-5 pt-0 border-t border-gray-100">
          <ul className="mt-4 space-y-2">
            {docs.map(doc => (
              <li key={doc.label}>
                {doc.disponivel ? (
                  <a
                    href={doc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-700 hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    {doc.label}
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </a>
                ) : (
                  <span className="flex items-center gap-2 text-sm text-gray-400">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    {doc.label} <span className="text-[11px]">(nao disponivel)</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  )
}
```

- [ ] **Step 3: Create modal-precedente.tsx**

```typescript
// src/app/(dashboard)/processos/[id]/parecer/modal-precedente.tsx
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { X, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import type { PrecedenteComScore } from '@/types/database'

const VEREDITO_CONFIG = {
  aprovar:                { label: 'Aprovado',           icon: CheckCircle,  color: 'text-green-600', bg: 'bg-green-50' },
  aprovar_com_ressalvas:  { label: 'Aprov. c/ Ressalvas', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  contrario:              { label: 'Contrario',          icon: XCircle,      color: 'text-red-600',   bg: 'bg-red-50'   },
}

function BarraSimilaridade({ label, score }: { label: string; score: number }) {
  const cor = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-gray-300'
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${cor}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-gray-700 w-8 text-right">{score}%</span>
    </div>
  )
}

export default function ModalPrecedente({
  precedente,
  veredito_atual,
  aberto,
  onFechar,
}: {
  precedente: PrecedenteComScore | null
  veredito_atual: string | null
  aberto: boolean
  onFechar: () => void
}) {
  if (!precedente) return null

  const vCfg = VEREDITO_CONFIG[precedente.veredito as keyof typeof VEREDITO_CONFIG]
  const VIcon = vCfg?.icon ?? CheckCircle
  const emLinha = precedente.veredito === veredito_atual

  return (
    <Dialog open={aberto} onOpenChange={v => !v && onFechar()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-sm font-semibold text-gray-800 leading-snug pr-6">
                {precedente.objeto_processo}
              </DialogTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className={`gap-1 text-[11px] ${vCfg?.bg} ${vCfg?.color} border-current/30`}>
                  <VIcon className="w-3 h-3" />
                  {vCfg?.label}
                </Badge>
                <Badge variant="outline" className={`text-[11px] ${emLinha ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
                  {emLinha ? 'Em linha com o veredito atual' : 'Diverge do veredito atual'}
                </Badge>
                {precedente.mesma_org
                  ? <Badge variant="outline" className="text-[11px] text-gray-600">
                      {precedente.procurador_nome ?? 'Procurador nao identificado'}
                    </Badge>
                  : <Badge variant="outline" className="text-[11px] text-gray-400">Procurador anonimo</Badge>
                }
                <span className="text-[11px] text-gray-400 self-center">
                  {new Date(precedente.emitido_em).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Barras de similaridade */}
        <div className="shrink-0 bg-gray-50 rounded-xl p-4 space-y-2.5 mx-0">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Grau de similaridade</p>
          <BarraSimilaridade label="Geral"      score={precedente.score} />
          <div className="border-t border-gray-200 pt-2 mt-2 space-y-2">
            <BarraSimilaridade label="Modalidade" score={precedente.score_modalidade} />
            <BarraSimilaridade label="Objeto"     score={precedente.score_keywords} />
            <BarraSimilaridade label="Valor"      score={precedente.score_valor} />
          </div>
        </div>

        {/* Texto do parecer */}
        <div className="flex-1 overflow-y-auto mt-2">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Texto do parecer</p>
          {precedente.conteudo_parecer ? (
            <pre className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
              {precedente.conteudo_parecer}
            </pre>
          ) : (
            <p className="text-sm text-gray-400 italic">
              Texto nao disponivel (parecer de outra organizacao com pool anonimizado).
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/processos/\[id\]/parecer/resumo-processo.tsx
git add src/app/\(dashboard\)/processos/\[id\]/parecer/painel-documentos.tsx
git add src/app/\(dashboard\)/processos/\[id\]/parecer/modal-precedente.tsx
git commit -m "feat(parecer): componentes resumo-processo, painel-documentos e modal-precedente"
```

---

## Task 8: Editor do Parecer — Rewrite

**Files:**
- Modify: `src/app/(dashboard)/processos/[id]/parecer/editor-parecer.tsx`
- Modify: `src/app/(dashboard)/processos/[id]/parecer/page.tsx`

- [ ] **Step 1: Update page.tsx to pass new data**

Replace the full content of `src/app/(dashboard)/processos/[id]/parecer/page.tsx`:

```typescript
import { obterParecer } from '@/lib/actions/parecer'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { buscarPrecedentes, obterResumoProcesso } from '@/lib/actions/procuradoria'
import { notFound } from 'next/navigation'
import EditorParecer from './editor-parecer'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import BotaoAssinatura from '@/components/assinatura/botao-assinatura'

export default async function ParecerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [parecer, papel, precedentes, resumo] = await Promise.all([
    obterParecer(id),
    obterPapelUsuario(),
    buscarPrecedentes(id),
    obterResumoProcesso(id),
  ])

  if (!parecer) return notFound()

  const podeAssinar = ['procurador', 'admin_organizacao', 'admin_plataforma'].includes(papel ?? '')

  // Verifica quais documentos existem para o painel lateral
  // (passamos flags booleanas; o resumo ja indicou quais tabelas retornaram dados)
  const documentosDisponiveis = {
    dfd:    !!resumo?.justificativa,
    etp:    !!resumo?.resultados_pretendidos,
    tr:     !!resumo?.requisitos_tecnicos,
    edital: true, // assume que se chegou na etapa parecer, edital existe
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Parecer Juridico</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Analise de regularidade do processo pela Procuradoria conforme Art. 53 da Lei 14.133/21.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {podeAssinar && (
            <BotaoAssinatura
              tabelaOrigem="pareceres"
              documentoId={(parecer as any).id}
              processoId={id}
              statusAtual={(parecer as any).status ?? 'rascunho'}
            />
          )}
          <BotoesExportacao tipo="parecer" processoId={id} nomeDocumento="Parecer" />
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg">
            <span className="font-medium">Art. 53</span>
          </div>
        </div>
      </div>
      <EditorParecer
        parecer={parecer as any}
        processoId={id}
        precedentes={precedentes}
        resumo={resumo}
        documentosDisponiveis={documentosDisponiveis}
      />
    </div>
  )
}
```

- [ ] **Step 2: Rewrite editor-parecer.tsx**

Replace full content of `src/app/(dashboard)/processos/[id]/parecer/editor-parecer.tsx`:

```typescript
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Loader2, Save, Wand2, CheckCircle, AlertCircle, XCircle,
  Clock, ChevronLeft, Send, Scale, Brain,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  salvarVeredito,
  salvarConteudo,
  emitirParecer,
  gerarMinutaIA,
  analisarComIA,
} from '@/lib/actions/procuradoria'
import ResumoProcesso from './resumo-processo'
import PainelDocumentos from './painel-documentos'
import ModalPrecedente from './modal-precedente'
import type { StatusParecer, PrecedenteComScore } from '@/types/database'
import type { ResumoProcesso as TResumoProcesso } from '@/lib/actions/procuradoria'

type Veredito = 'aprovar' | 'aprovar_com_ressalvas' | 'contrario'

const VEREDITO_CONFIG: Record<Veredito, { label: string; icon: React.ElementType; classes: string; bg: string }> = {
  aprovar:               { label: 'Aprovar',               icon: CheckCircle, classes: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  aprovar_com_ressalvas: { label: 'Aprovar com ressalvas',  icon: AlertCircle, classes: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  contrario:             { label: 'Parecer contrario',      icon: XCircle,     classes: 'text-red-600',   bg: 'bg-red-50 border-red-200' },
}

// Debounce helper
function useDebounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return useCallback((...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}

export default function EditorParecer({
  parecer,
  processoId,
  precedentes,
  resumo,
  documentosDisponiveis,
}: {
  parecer: any
  processoId: string
  precedentes: PrecedenteComScore[]
  resumo: TResumoProcesso | null
  documentosDisponiveis: { dfd: boolean; etp: boolean; tr: boolean; edital: boolean }
}) {
  const [conteudo, setConteudo]     = useState<string>(parecer.conteudo || '')
  const [veredito, setVeredito]     = useState<Veredito | null>(parecer.veredito ?? null)
  const [ressalvas, setRessalvas]   = useState<string>(parecer.ressalvas || '')
  const [motivoCon, setMotivoCon]   = useState<string>(parecer.motivo_contrario || '')
  const [analiseIA, setAnaliseIA]   = useState<string>(parecer.analise_ia || '')
  const [salvando, setSalvando]     = useState(false)
  const [emitindo, setEmitindo]     = useState(false)
  const [minutaLoading, setMinutaLoading] = useState(false)
  const [analiseLoading, setAnaliseLoading] = useState(false)
  const [geradoPorIA, setGeradoPorIA] = useState(false)
  const [precedenteSelecionado, setPrecedenteSelecionado] = useState<PrecedenteComScore | null>(null)

  // Debounce auto-save do conteudo (2s)
  const autoSalvar = useDebounce(async (texto: string) => {
    await salvarConteudo(parecer.id, texto)
  }, 2000)

  function handleConteudoChange(texto: string) {
    setConteudo(texto)
    autoSalvar(texto)
  }

  async function handleSelecionarVeredito(v: Veredito) {
    setVeredito(v)
    const res = await salvarVeredito(parecer.id, v)
    if (!res.success) toast.error(res.error ?? 'Erro ao salvar veredito.')
  }

  async function handleGerarMinuta() {
    if (!veredito) {
      toast.error('Selecione o veredito antes de gerar a minuta.')
      return
    }
    if (conteudo.trim()) {
      if (!confirm('O editor ja tem conteudo. Deseja substituir pela minuta gerada pela IA?')) return
    }
    setMinutaLoading(true)
    const res = await gerarMinutaIA(processoId, parecer.id, veredito)
    if (res.success && res.conteudo) {
      setConteudo(res.conteudo)
      setGeradoPorIA(true)
      toast.success('Minuta gerada pela IA. Revise antes de emitir.')
    } else {
      toast.error(res.error ?? 'Erro ao gerar minuta.')
    }
    setMinutaLoading(false)
  }

  async function handleAnalisarIA() {
    if (conteudo.length < 100) {
      toast.error('Redija ao menos 100 caracteres antes de solicitar analise.')
      return
    }
    setAnaliseLoading(true)
    const res = await analisarComIA(processoId, parecer.id, conteudo, veredito ?? 'indefinido')
    if (res.success && res.analise) {
      setAnaliseIA(res.analise)
      toast.success('Analise gerada. Verifique o painel abaixo.')
    } else {
      toast.error(res.error ?? 'Erro ao analisar.')
    }
    setAnaliseLoading(false)
  }

  async function handleEmitir() {
    if (!veredito) { toast.error('Selecione o veredito antes de emitir.'); return }
    setEmitindo(true)
    const res = await emitirParecer(parecer.id, conteudo, veredito, { ressalvas, motivo_contrario: motivoCon })
    if (res.success) {
      toast.success('Parecer emitido com sucesso.')
    } else {
      toast.error(res.error ?? 'Erro ao emitir.')
    }
    setEmitindo(false)
  }

  const podeEmitir = !!(veredito && conteudo.trim())

  return (
    <div className="space-y-4">
      {/* Resumo do processo */}
      {resumo && <ResumoProcesso resumo={resumo} />}

      {/* Editor principal */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-gray-800">Redacao do Parecer Juridico</CardTitle>
              {parecer.processos_licitatorios?.objeto && (
                <CardDescription className="text-xs mt-0.5 text-gray-500">
                  Objeto: {parecer.processos_licitatorios.objeto}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGerarMinuta}
                disabled={minutaLoading}
                className="h-8 text-xs text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 gap-1.5"
              >
                {minutaLoading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
                  : <><Wand2 className="w-3.5 h-3.5" /> Gerar minuta</>}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalisarIA}
                disabled={analiseLoading || conteudo.length < 100}
                title={conteudo.length < 100 ? 'Redija ao menos 100 caracteres' : 'Analisar com IA'}
                className="h-8 text-xs text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 gap-1.5"
              >
                {analiseLoading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando...</>
                  : <><Brain className="w-3.5 h-3.5" /> Analisar com IA</>}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* Seletor de veredito */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Veredito</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(VEREDITO_CONFIG) as [Veredito, typeof VEREDITO_CONFIG[Veredito]][]).map(([v, cfg]) => {
                const Icon = cfg.icon
                const ativo = veredito === v
                return (
                  <button
                    key={v}
                    onClick={() => handleSelecionarVeredito(v)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${
                      ativo
                        ? `${cfg.bg} ${cfg.classes} border-current/30 shadow-sm`
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${ativo ? cfg.classes : 'text-gray-400'}`} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
            {!veredito && (
              <p className="text-xs text-amber-600 mt-1.5">Selecione o veredito para habilitar a geracao de minuta e a emissao.</p>
            )}
          </div>

          {/* Campo de ressalvas ou motivo contrário */}
          {veredito === 'aprovar_com_ressalvas' && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-amber-700">Ressalvas <span className="text-red-500">*</span></Label>
              <Textarea
                rows={3}
                placeholder="Descreva as ressalvas que condicionam a aprovacao..."
                value={ressalvas}
                onChange={e => setRessalvas(e.target.value)}
                className="border-amber-200 text-sm"
              />
            </div>
          )}
          {veredito === 'contrario' && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-red-700">Motivo do parecer contrario <span className="text-red-500">*</span></Label>
              <Textarea
                rows={3}
                placeholder="Descreva os motivos que fundamentam o parecer contrario..."
                value={motivoCon}
                onChange={e => setMotivoCon(e.target.value)}
                className="border-red-200 text-sm"
              />
            </div>
          )}

          {geradoPorIA && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-100 rounded-lg text-xs text-purple-700">
              <Wand2 className="w-3.5 h-3.5 shrink-0" />
              Conteudo gerado pela IA. Revise e ajuste conforme necessario antes de emitir.
            </div>
          )}

          {/* Editor de texto */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Texto do Parecer</Label>
            <Textarea
              rows={18}
              placeholder={'EMENTA:\n\nRELATORIO:\n\nFUNDAMENTACAO JURIDICA:\n\nCONCLUSAO:'}
              value={conteudo}
              onChange={e => handleConteudoChange(e.target.value)}
              className="font-mono text-sm text-gray-800 leading-relaxed resize-y"
            />
            <p className="text-[11px] text-gray-400">{conteudo.length} caracteres — salvo automaticamente</p>
          </div>

          {/* Analise da IA */}
          {analiseIA && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-800">Analise juridica da IA</span>
              </div>
              <pre className="text-xs text-blue-900 whitespace-pre-wrap leading-relaxed font-sans">
                {analiseIA}
              </pre>
            </div>
          )}

          {/* Painel de precedentes */}
          {precedentes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-gray-400" />
                Pareceres precedentes similares
              </Label>
              <div className="space-y-2">
                {precedentes.map(p => {
                  const vCfg = VEREDITO_CONFIG[p.veredito as Veredito]
                  const emLinha = p.veredito === veredito
                  const cor = p.score >= 70 ? 'bg-green-500' : p.score >= 40 ? 'bg-amber-500' : 'bg-gray-300'
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPrecedenteSelecionado(p)}
                      className="w-full text-left p-3.5 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{p.objeto_processo}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {vCfg && (
                              <Badge variant="outline" className={`text-[10px] gap-1 ${vCfg.bg} ${vCfg.classes} border-current/20`}>
                                <vCfg.icon className="w-2.5 h-2.5" />
                                {vCfg.label}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${emLinha ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}
                            >
                              {emLinha ? 'Em linha' : 'Divergente'}
                            </Badge>
                            <span className="text-[10px] text-gray-400">
                              {p.mesma_org && p.procurador_nome ? p.procurador_nome : 'Procurador anonimo'}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${cor}`} style={{ width: `${p.score}%` }} />
                            </div>
                            <span className="text-[11px] font-bold text-gray-700">{p.score}%</span>
                          </div>
                          <span className="text-[10px] text-gray-400 group-hover:text-blue-600">ver parecer →</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl gap-3">
          <div className="flex items-center gap-2">
            <Link href={`/processos/${processoId}/edital`}>
              <Button variant="outline" className="gap-1.5 h-9 text-sm">
                <ChevronLeft className="w-4 h-4" /> Edital
              </Button>
            </Link>
          </div>
          <Button
            onClick={handleEmitir}
            disabled={emitindo || !podeEmitir}
            className="bg-[#1A365D] hover:bg-[#1A365D]/90 text-white gap-2 h-9 text-sm"
          >
            {emitindo
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Emitindo...</>
              : <><Send className="w-4 h-4" /> Emitir parecer</>}
          </Button>
        </CardFooter>
      </Card>

      {/* Painel de documentos */}
      <PainelDocumentos processoId={processoId} documentosDisponiveis={documentosDisponiveis} />

      {/* Modal de precedente */}
      <ModalPrecedente
        precedente={precedenteSelecionado}
        veredito_atual={veredito}
        aberto={!!precedenteSelecionado}
        onFechar={() => setPrecedenteSelecionado(null)}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: 0 errors. If there are type errors on the `parecer` `any` casts, they are acceptable since the `pareceres` table type hasn't been regenerated from Supabase yet.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/processos/\[id\]/parecer/editor-parecer.tsx
git add src/app/\(dashboard\)/processos/\[id\]/parecer/page.tsx
git commit -m "feat(parecer): rewrite editor com veredito, minuta IA, analise IA, resumo, precedentes e painel documentos"
```

---

## Task 9: Navbar — Link Procuradoria

**Files:**
- Modify: `src/components/layout/navbar.tsx`

The Navbar currently has no "Procuradoria" link. It also doesn't know the logged-in user's `papel`, only whether they are `isAdminPlataforma`. We need to add a `papel` prop and conditionally render the Procuradoria link.

- [ ] **Step 1: Check how Navbar is called in layout.tsx**

The layout at `src/app/(dashboard)/layout.tsx` already fetches `papelAtual`. We just need to pass it to Navbar.

- [ ] **Step 2: Update NavbarProps and NAV_LINKS in navbar.tsx**

In `src/components/layout/navbar.tsx`, find:

```typescript
interface NavbarProps {
  user: User
  nomeUsuario?: string | null
  saldoCreditos?: number | null
  notificacoes?: Notificacao[]
  naoLidas?: number
  isAdminPlataforma?: boolean
}
```

Replace with:

```typescript
interface NavbarProps {
  user: User
  nomeUsuario?: string | null
  saldoCreditos?: number | null
  notificacoes?: Notificacao[]
  naoLidas?: number
  isAdminPlataforma?: boolean
  papel?: string | null
}
```

- [ ] **Step 3: Add Procuradoria to the import list**

Find:
```typescript
import { LogOut, Settings, FileText, LayoutDashboard, Users, Zap, ChevronDown, Menu, X, Building2, TrendingUp, ShieldCheck, Bell, Share2 } from 'lucide-react'
```
Replace with:
```typescript
import { LogOut, Settings, FileText, LayoutDashboard, Users, Zap, ChevronDown, Menu, X, Building2, TrendingUp, ShieldCheck, Bell, Share2, Scale } from 'lucide-react'
```

- [ ] **Step 4: Add Procuradoria link in desktop nav, after the NAV_LINKS map**

Find this block in navbar.tsx:
```typescript
          {isAdminPlataforma && (
              <Link
                href="/admin/painel"
```

Insert before that block:
```typescript
            {['procurador', 'admin_organizacao', 'admin_plataforma'].includes(papel ?? '') && (
              <Link
                href="/procuradoria"
                className={`relative inline-flex items-center gap-1.5 px-3 text-[13px] font-semibold tracking-wide transition-colors border-b-2 ${
                  isActive('/procuradoria')
                    ? 'border-[#B7935E] text-[#1A365D]'
                    : 'border-transparent text-[#43474E] hover:text-[#1A365D] hover:border-[#B7935E]/30'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                Procuradoria
              </Link>
            )}
```

- [ ] **Step 5: Add Procuradoria link in mobile nav (after the NAV_LINKS.map in mobile section)**

Find:
```typescript
            {isAdminPlataforma && (
              <Link
                href="/admin/painel"
                onClick={() => setMenuMobileAberto(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors text-[#43474E] hover:bg-[#F4F3F7] hover:text-[#1A365D]"
              >
                <ShieldCheck className="w-4 h-4" />
                Admin
              </Link>
            )}
```

Insert before:
```typescript
            {['procurador', 'admin_organizacao', 'admin_plataforma'].includes(papel ?? '') && (
              <Link
                href="/procuradoria"
                onClick={() => setMenuMobileAberto(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                  isActive('/procuradoria')
                    ? 'bg-[#1A365D]/5 text-[#1A365D] border-l-2 border-[#B7935E]'
                    : 'text-[#43474E] hover:bg-[#F4F3F7] hover:text-[#1A365D]'
                }`}
              >
                <Scale className="w-4 h-4" />
                Procuradoria
              </Link>
            )}
```

- [ ] **Step 6: Pass `papel` from layout to Navbar**

In `src/app/(dashboard)/layout.tsx`, find:
```typescript
      <Navbar
        user={user}
        nomeUsuario={(usuarioRes.data as any)?.nome_completo ?? null}
        saldoCreditos={(creditosRes.data as any)?.saldo ?? null}
        notificacoes={notificacoes}
        naoLidas={naoLidas}
        isAdminPlataforma={papelAtual === 'admin_plataforma'}
      />
```

Replace with:
```typescript
      <Navbar
        user={user}
        nomeUsuario={(usuarioRes.data as any)?.nome_completo ?? null}
        saldoCreditos={(creditosRes.data as any)?.saldo ?? null}
        notificacoes={notificacoes}
        naoLidas={naoLidas}
        isAdminPlataforma={papelAtual === 'admin_plataforma'}
        papel={papelAtual}
      />
```

- [ ] **Step 7: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/navbar.tsx src/app/\(dashboard\)/layout.tsx
git commit -m "feat(navbar): link Procuradoria visivel para procurador e admins"
```

---

## Task 10: Build Check and Smoke Test

**Files:** (read-only verification)

- [ ] **Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 2: Run linter**

```bash
npx eslint src/lib/actions/procuradoria.ts src/lib/actions/configuracoes-plataforma.ts src/app/\(dashboard\)/procuradoria/ src/app/\(dashboard\)/processos/\[id\]/parecer/ --max-warnings 0
```
Expected: 0 errors, 0 warnings. Fix any issues.

- [ ] **Step 3: Run build**

```bash
npx next build
```
Expected: Build completes without errors. Warnings about `any` in existing files are acceptable.

- [ ] **Step 4: Smoke test — navigate to /procuradoria as procurador**

Start dev server:
```bash
npx next dev
```

As a user with `papel = 'procurador'`:
1. Navigate to `/procuradoria` — verify 3 tabs appear, KPIs show
2. Click "Criar parecer" on a pending item — verify redirects to `/processos/[id]/parecer`
3. On the parecer page: verify resumo do processo panel is visible
4. Select a veredito — verify status changes to `em_analise` (check in Supabase)
5. Click "Gerar minuta" — verify text appears in editor
6. Type 100+ chars manually — verify "Analisar com IA" button becomes enabled
7. Click "Analisar com IA" — verify analysis panel appears
8. Click "Emitir parecer" — verify success toast and redirect

As a user with another role (e.g. `requisitante`):
- Navigate to `/procuradoria` — should redirect to `/dashboard`

- [ ] **Step 5: Smoke test — admin configuracoes**

As `admin_plataforma`:
1. Navigate to `/admin/configuracoes-plataforma`
2. Change urgency to 3, alert to 8
3. Click "Salvar" — verify success toast
4. Navigate back to `/procuradoria` — verify urgency badges use new values

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: build check e smoke test modulo procuradoria completo"
```

---

## Self-Review: Spec Coverage

| Spec requirement | Task that covers it |
|---|---|
| Rota /procuradoria com guard por papel | Task 6 layout.tsx |
| 3 abas: Pendentes, Em análise, Histórico | Task 6 lista-pareceres.tsx |
| 8 campos por item da lista | Task 6 ItemParecer component |
| Badge de urgência com configuração de admin | Task 3 + Task 5 + Task 6 |
| KPIs no topo | Task 6 ListaPareceres |
| Botão contextual Criar/Abrir parecer | Task 6 ItemParecer |
| Seletor de veredito (3 opções) | Task 8 EditorParecer |
| Status muda pendente → em_analise ao selecionar veredito | Task 4 salvarVeredito |
| Campo ressalvas obrigatório (aprovar_com_ressalvas) | Task 8 EditorParecer |
| Motivo obrigatório (contrario) | Task 8 EditorParecer |
| Minuta gerada por IA (requer veredito selecionado) | Task 4 gerarMinutaIA + Task 8 |
| Editor com debounce auto-save | Task 8 useDebounce |
| Botão "Analisar com IA" (min 100 chars) | Task 4 analisarComIA + Task 8 |
| Análise salva em analise_ia | Task 4 analisarComIA |
| Aviso "decisão é do procurador" no prompt de IA | Task 4 (incluído no prompt) |
| Emitir parecer com validações | Task 4 emitirParecer |
| Avançar processo para autorizacao | Task 4 emitirParecer (etapa_atual = 9) |
| Notificação setor licitação (contrario) | Task 4 emitirParecer |
| Notificação autoridade competente (aprovado) | Task 4 emitirParecer |
| Painel de precedentes (só se relevante) | Task 4 buscarPrecedentes (score >= 30) |
| Barra de similaridade visual com breakdown | Task 7 modal-precedente.tsx |
| Modal de precedente com texto completo | Task 7 modal-precedente.tsx |
| Indicação Em linha / Divergente | Task 7 + Task 8 EditorParecer |
| Indexar precedente ao emitir | Task 4 indexarPrecedente |
| Pool coletivo opt-in por organização | Task 4 buscarPrecedentes + indexarPrecedente |
| Resumo do processo (painel colapsável) | Task 7 resumo-processo.tsx |
| Painel de documentos (links para abrir) | Task 7 painel-documentos.tsx |
| Tabela configuracoes_plataforma | Task 1 migration |
| Tabela pareceres_precedentes com GIN index | Task 1 migration |
| ALTER pareceres: veredito, analise_ia, ressalvas, motivo_contrario | Task 1 migration |
| ALTER status_parecer enum: em_analise, contrario | Task 1 migration |
| ALTER organizacoes: participa_pool_precedentes | Task 1 migration |
| /admin/configuracoes-plataforma com form numérico | Task 5 |
| Link "Configuracoes da Plataforma" no sidebar admin | Task 5 |
| Link "Procuradoria" na navbar para procurador/admins | Task 9 |

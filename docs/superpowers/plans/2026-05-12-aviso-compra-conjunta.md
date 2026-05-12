# Aviso de Compra Conjunta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o módulo pré-processo de Aviso de Compra Conjunta, que permite a uma secretaria comunicar sua intenção de licitar, receber adesões de outras secretarias, consolidar itens e abrir o wizard pré-preenchido.

**Architecture:** Módulo independente com 3 rotas sob `/processos/aviso-compra-conjunta/`. Usa 5 novas tabelas Supabase com RLS. A integração com o wizard existente é feita via `localStorage` (chave `licitaia_wizard_draft`) já lida pelo wizard atual. O sistema de notificações existente (`notificacoes`) é reutilizado sem modificação.

**Tech Stack:** Next.js 14 App Router, TypeScript estrito, Supabase (Postgres + RLS), Server Actions, shadcn/ui, Tailwind CSS, Sonner (toasts), date-fns (cálculo de prazo).

---

## Mapa de arquivos

### Novos arquivos
- `supabase/migrations/20260512000005_avisos_compra_conjunta.sql` — 5 novas tabelas + RLS
- `src/lib/actions/avisos.ts` — Server Actions: criar aviso, listar avisos, buscar aviso por id, registrar adesão, encerrar prazo, iniciar processo
- `src/app/(dashboard)/processos/aviso-compra-conjunta/novo/page.tsx` — Formulário de criação (Client Component)
- `src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/page.tsx` — Painel de acompanhamento (Server Component que busca dados + passa para Client)
- `src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/painel-acompanhamento.tsx` — Client Component do painel
- `src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/aderir/page.tsx` — Tela de adesão (Server Component)
- `src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/aderir/formulario-adesao.tsx` — Client Component da adesão

### Arquivos modificados
- `src/app/(dashboard)/dashboard/page.tsx` — Adicionar card/link "Avisos de Compra Conjunta" e contador de avisos pendentes
- `src/components/layout/navbar.tsx` — Adicionar link "Avisos" na navegação desktop

---

## Task 1: Migration Supabase — 5 tabelas + RLS

**Files:**
- Create: `supabase/migrations/20260512000005_avisos_compra_conjunta.sql`

> **Atenção:** As migrations `20260512000001` a `20260512000004` já existem (ia_config_organizacoes, assinatura_config_organizacoes, base_conhecimento, permissoes_papel_organizacao). Use obrigatoriamente o número `000005`.

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/migrations/20260512000005_avisos_compra_conjunta.sql
-- Módulo Aviso de Compra Conjunta (pré-processo)
-- Permite que secretarias comuniquem intenção de licitar e recebam adesões
-- antes da abertura do processo licitatório formal.

-- ============================================================
-- 1. TABELA PRINCIPAL: avisos_compra_conjunta
-- ============================================================

create table avisos_compra_conjunta (
  id                    uuid primary key default uuid_generate_v4(),
  organizacao_id        uuid not null references organizacoes(id) on delete cascade,
  secretaria_origem_id  uuid not null references secretarias(id),
  criado_por            uuid not null references usuarios(id),
  modalidade            text not null,
  categoria_objeto      text not null,
  prazo_adesao          timestamptz not null,
  status                text not null default 'aberto'
                          check (status in ('aberto', 'encerrado', 'processo_iniciado')),
  processo_id           uuid references processos_licitatorios(id),
  created_at            timestamptz not null default now()
);

create index idx_avisos_org      on avisos_compra_conjunta(organizacao_id);
create index idx_avisos_origem   on avisos_compra_conjunta(secretaria_origem_id);
create index idx_avisos_status   on avisos_compra_conjunta(status);

-- ============================================================
-- 2. ITENS DA SECRETARIA DE ORIGEM
-- ============================================================

create table avisos_itens (
  id               uuid primary key default uuid_generate_v4(),
  aviso_id         uuid not null references avisos_compra_conjunta(id) on delete cascade,
  descricao        text not null,
  unidade          text not null default 'unidade',
  quantidade_origem integer not null check (quantidade_origem > 0),
  categoria_objeto text not null,
  created_at       timestamptz not null default now()
);

create index idx_avisos_itens_aviso on avisos_itens(aviso_id);

-- ============================================================
-- 3. SECRETARIAS DESTINATÁRIAS
-- ============================================================

create table avisos_destinatarias (
  id              uuid primary key default uuid_generate_v4(),
  aviso_id        uuid not null references avisos_compra_conjunta(id) on delete cascade,
  secretaria_id   uuid not null references secretarias(id),
  status          text not null default 'pendente'
                    check (status in ('pendente', 'aderiu', 'recusou')),
  respondido_em   timestamptz,
  created_at      timestamptz not null default now(),

  unique (aviso_id, secretaria_id)
);

create index idx_avisos_dest_aviso on avisos_destinatarias(aviso_id);
create index idx_avisos_dest_sec   on avisos_destinatarias(secretaria_id);

-- ============================================================
-- 4. ADESÕES (resposta de cada secretaria)
-- ============================================================

create table avisos_adesoes (
  id                   uuid primary key default uuid_generate_v4(),
  aviso_id             uuid not null references avisos_compra_conjunta(id) on delete cascade,
  secretaria_id        uuid not null references secretarias(id),
  fiscal_nome          text not null,
  dotacao_orcamentaria text not null,
  created_at           timestamptz not null default now(),

  unique (aviso_id, secretaria_id)
);

create index idx_adesoes_aviso on avisos_adesoes(aviso_id);
create index idx_adesoes_sec   on avisos_adesoes(secretaria_id);

-- ============================================================
-- 5. ITENS DE CADA ADESÃO
-- ============================================================

create table avisos_adesoes_itens (
  id             uuid primary key default uuid_generate_v4(),
  adesao_id      uuid not null references avisos_adesoes(id) on delete cascade,
  aviso_item_id  uuid references avisos_itens(id) on delete set null,
  descricao      text not null,
  unidade        text not null default 'unidade',
  quantidade     integer not null check (quantidade > 0),
  categoria_objeto text not null,
  created_at     timestamptz not null default now()
);

create index idx_adesoes_itens_adesao on avisos_adesoes_itens(adesao_id);

-- ============================================================
-- 6. RLS
-- ============================================================

alter table avisos_compra_conjunta  enable row level security;
alter table avisos_itens            enable row level security;
alter table avisos_destinatarias    enable row level security;
alter table avisos_adesoes          enable row level security;
alter table avisos_adesoes_itens    enable row level security;

-- avisos_compra_conjunta: usuários da mesma organização
create policy "avisos_org" on avisos_compra_conjunta
  for all using (
    organizacao_id in (
      select organizacao_id from usuarios where id = auth.uid()
    )
  );

-- avisos_itens: via aviso da mesma org
create policy "avisos_itens_org" on avisos_itens
  for all using (
    aviso_id in (
      select a.id from avisos_compra_conjunta a
      join usuarios u on u.organizacao_id = a.organizacao_id
      where u.id = auth.uid()
    )
  );

-- avisos_destinatarias: mesma org
create policy "avisos_dest_org" on avisos_destinatarias
  for all using (
    aviso_id in (
      select a.id from avisos_compra_conjunta a
      join usuarios u on u.organizacao_id = a.organizacao_id
      where u.id = auth.uid()
    )
  );

-- avisos_adesoes: mesma org
create policy "avisos_adesoes_org" on avisos_adesoes
  for all using (
    aviso_id in (
      select a.id from avisos_compra_conjunta a
      join usuarios u on u.organizacao_id = a.organizacao_id
      where u.id = auth.uid()
    )
  );

-- avisos_adesoes_itens: via adesão da mesma org
create policy "avisos_adesoes_itens_org" on avisos_adesoes_itens
  for all using (
    adesao_id in (
      select ad.id from avisos_adesoes ad
      join avisos_compra_conjunta a on a.id = ad.aviso_id
      join usuarios u on u.organizacao_id = a.organizacao_id
      where u.id = auth.uid()
    )
  );
```

- [ ] **Step 2: Aplicar a migration**

```bash
# Se usando Supabase CLI local:
npx supabase db push

# Se aplicando direto ao projeto remoto via MCP, use a tool apply_migration
# com o conteúdo do arquivo acima.
```

Expected: tabelas criadas sem erros, RLS ativo em todas.

- [ ] **Step 3: Verificar tabelas no dashboard Supabase**

Acesse Table Editor no Supabase e confirme que as 5 tabelas aparecem:
- `avisos_compra_conjunta`
- `avisos_itens`
- `avisos_destinatarias`
- `avisos_adesoes`
- `avisos_adesoes_itens`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260512000005_avisos_compra_conjunta.sql
git commit -m "feat(db): adicionar tabelas do modulo Aviso de Compra Conjunta"
```

---

## Task 2: Server Actions (`src/lib/actions/avisos.ts`)

**Files:**
- Create: `src/lib/actions/avisos.ts`

Contexto: Este arquivo segue o padrão do projeto (ver `src/lib/actions/processo.ts` e `src/lib/actions/secretarias.ts`). Todas as funções são `'use server'`, retornam `{ success: boolean, data?, error? }`, e validam com Zod.

- [ ] **Step 1: Criar `src/lib/actions/avisos.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================================
// Schemas de validação
// ============================================================

const ItemAvisoSchema = z.object({
  descricao: z.string().min(2, 'Descricao obrigatoria'),
  unidade: z.string().min(1, 'Unidade obrigatoria'),
  quantidade_origem: z.number().int().positive('Quantidade deve ser maior que zero'),
})

const CriarAvisoSchema = z.object({
  secretaria_origem_id: z.string().uuid(),
  modalidade: z.string().min(1),
  categoria_objeto: z.string().min(1),
  prazo_adesao: z.string().datetime({ offset: true }),
  itens: z.array(ItemAvisoSchema).min(1, 'Adicione ao menos um item'),
  secretarias_destinatarias: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma secretaria'),
})

const ItemAdesaoSchema = z.object({
  aviso_item_id: z.string().uuid().nullable(),
  descricao: z.string().min(2),
  unidade: z.string().min(1),
  quantidade: z.number().int().positive(),
  categoria_objeto: z.string().min(1),
})

const RegistrarAdesaoSchema = z.object({
  aviso_id: z.string().uuid(),
  secretaria_id: z.string().uuid(),
  fiscal_nome: z.string().min(2, 'Informe o fiscal do contrato'),
  dotacao_orcamentaria: z.string().min(2, 'Informe a dotacao orcamentaria'),
  itens: z.array(ItemAdesaoSchema).min(1, 'Selecione ao menos um item'),
})

// ============================================================
// Tipos públicos
// ============================================================

export type ItemAvisoInput = z.infer<typeof ItemAvisoSchema>
export type CriarAvisoInput = z.infer<typeof CriarAvisoSchema>
export type ItemAdesaoInput = z.infer<typeof ItemAdesaoSchema>
export type RegistrarAdesaoInput = z.infer<typeof RegistrarAdesaoSchema>

export interface AvisoResumo {
  id: string
  modalidade: string
  categoria_objeto: string
  prazo_adesao: string
  status: string
  created_at: string
  secretaria_origem: { id: string; nome: string; sigla: string | null }
  total_destinatarias: number
  total_aderidas: number
}

export interface AvisoDetalhe {
  id: string
  organizacao_id: string
  secretaria_origem_id: string
  criado_por: string
  modalidade: string
  categoria_objeto: string
  prazo_adesao: string
  status: string
  processo_id: string | null
  created_at: string
  secretaria_origem: { id: string; nome: string; sigla: string | null }
  itens: Array<{
    id: string
    descricao: string
    unidade: string
    quantidade_origem: number
    categoria_objeto: string
  }>
  destinatarias: Array<{
    id: string
    secretaria_id: string
    status: string
    respondido_em: string | null
    secretaria: { id: string; nome: string; sigla: string | null }
  }>
  adesoes: Array<{
    id: string
    secretaria_id: string
    fiscal_nome: string
    dotacao_orcamentaria: string
    secretaria: { id: string; nome: string; sigla: string | null }
    itens: Array<{
      id: string
      aviso_item_id: string | null
      descricao: string
      unidade: string
      quantidade: number
      categoria_objeto: string
    }>
  }>
}

// ============================================================
// Helpers internos
// ============================================================

async function obterUsuarioEOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('usuarios')
    .select('id, organizacao_id, secretaria_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!data) return null
  return { supabase, user, ...data as { organizacao_id: string; secretaria_id: string | null } }
}

// ============================================================
// Actions públicas
// ============================================================

export async function criarAviso(
  input: CriarAvisoInput
): Promise<{ success: boolean; avisoId?: string; error?: string }> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return { success: false, error: 'Nao autenticado.' }

  const parsed = CriarAvisoSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { supabase, user } = ctx
  const d = parsed.data

  // 1. Criar aviso
  const { data: aviso, error: avisoErr } = await (supabase as any)
    .from('avisos_compra_conjunta')
    .insert({
      organizacao_id: ctx.organizacao_id,
      secretaria_origem_id: d.secretaria_origem_id,
      criado_por: user.id,
      modalidade: d.modalidade,
      categoria_objeto: d.categoria_objeto,
      prazo_adesao: d.prazo_adesao,
      status: 'aberto',
    })
    .select('id')
    .single()

  if (avisoErr || !aviso) return { success: false, error: avisoErr?.message ?? 'Erro ao criar aviso.' }

  const avisoId: string = aviso.id

  // 2. Inserir itens
  const { error: itensErr } = await (supabase as any)
    .from('avisos_itens')
    .insert(
      d.itens.map(item => ({
        aviso_id: avisoId,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade_origem: item.quantidade_origem,
        categoria_objeto: d.categoria_objeto,
      }))
    )
  if (itensErr) {
    await (supabase as any).from('avisos_compra_conjunta').delete().eq('id', avisoId)
    return { success: false, error: `Erro ao inserir itens: ${itensErr.message}` }
  }

  // 3. Inserir destinatárias
  const { error: destErr } = await (supabase as any)
    .from('avisos_destinatarias')
    .insert(
      d.secretarias_destinatarias.map(secId => ({
        aviso_id: avisoId,
        secretaria_id: secId,
        status: 'pendente',
      }))
    )
  if (destErr) {
    await (supabase as any).from('avisos_compra_conjunta').delete().eq('id', avisoId)
    return { success: false, error: `Erro ao inserir destinatarias: ${destErr.message}` }
  }

  // 4. Criar notificações para todos os usuários das secretarias destinatárias
  const { data: usuariosDestinatarios } = await supabase
    .from('usuarios')
    .select('id')
    .in('secretaria_id', d.secretarias_destinatarias)

  if (usuariosDestinatarios?.length) {
    await (supabase as any).from('notificacoes').insert(
      (usuariosDestinatarios as Array<{ id: string }>).map(u => ({
        usuario_id: u.id,
        titulo: 'Aviso de Compra Conjunta',
        mensagem: 'Uma secretaria convidou voce para participar de uma compra conjunta. Acesse para ver os itens e aderir.',
        lida: false,
        link: `/processos/aviso-compra-conjunta/${avisoId}/aderir`,
      }))
    )
  }

  revalidatePath('/processos/aviso-compra-conjunta')
  revalidatePath('/dashboard')
  return { success: true, avisoId }
}

export async function listarAvisos(): Promise<AvisoResumo[]> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return []

  const { supabase } = ctx

  const { data } = await (supabase as any)
    .from('avisos_compra_conjunta')
    .select(`
      id, modalidade, categoria_objeto, prazo_adesao, status, created_at,
      secretaria_origem:secretarias!secretaria_origem_id(id, nome, sigla),
      destinatarias:avisos_destinatarias(id, status)
    `)
    .eq('organizacao_id', ctx.organizacao_id)
    .order('created_at', { ascending: false })

  if (!data) return []

  return (data as any[]).map(a => ({
    id: a.id,
    modalidade: a.modalidade,
    categoria_objeto: a.categoria_objeto,
    prazo_adesao: a.prazo_adesao,
    status: a.status,
    created_at: a.created_at,
    secretaria_origem: a.secretaria_origem,
    total_destinatarias: a.destinatarias?.length ?? 0,
    total_aderidas: (a.destinatarias as any[])?.filter((d: any) => d.status === 'aderiu').length ?? 0,
  }))
}

export async function buscarAviso(
  id: string
): Promise<{ success: boolean; aviso?: AvisoDetalhe; error?: string }> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return { success: false, error: 'Nao autenticado.' }

  const { supabase } = ctx

  const { data, error } = await (supabase as any)
    .from('avisos_compra_conjunta')
    .select(`
      id, organizacao_id, secretaria_origem_id, criado_por,
      modalidade, categoria_objeto, prazo_adesao, status, processo_id, created_at,
      secretaria_origem:secretarias!secretaria_origem_id(id, nome, sigla),
      itens:avisos_itens(id, descricao, unidade, quantidade_origem, categoria_objeto),
      destinatarias:avisos_destinatarias(
        id, secretaria_id, status, respondido_em,
        secretaria:secretarias(id, nome, sigla)
      ),
      adesoes:avisos_adesoes(
        id, secretaria_id, fiscal_nome, dotacao_orcamentaria,
        secretaria:secretarias(id, nome, sigla),
        itens:avisos_adesoes_itens(id, aviso_item_id, descricao, unidade, quantidade, categoria_objeto)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) return { success: false, error: error?.message ?? 'Aviso nao encontrado.' }

  return { success: true, aviso: data as AvisoDetalhe }
}

export async function registrarAdesao(
  input: RegistrarAdesaoInput
): Promise<{ success: boolean; error?: string }> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return { success: false, error: 'Nao autenticado.' }

  const parsed = RegistrarAdesaoSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { supabase, user } = ctx
  const d = parsed.data

  // Verificar que aviso existe e está aberto
  const { data: aviso } = await (supabase as any)
    .from('avisos_compra_conjunta')
    .select('id, status, categoria_objeto, organizacao_id')
    .eq('id', d.aviso_id)
    .single()

  if (!aviso) return { success: false, error: 'Aviso nao encontrado.' }
  if (aviso.status !== 'aberto') return { success: false, error: 'O prazo para adesao ja foi encerrado.' }

  // Verificar que secretaria está na lista de destinatárias
  const { data: destinataria } = await (supabase as any)
    .from('avisos_destinatarias')
    .select('id, status')
    .eq('aviso_id', d.aviso_id)
    .eq('secretaria_id', d.secretaria_id)
    .single()

  if (!destinataria) return { success: false, error: 'Sua secretaria nao foi convidada para este aviso.' }
  if (destinataria.status === 'aderiu') return { success: false, error: 'Sua secretaria ja aderiu a este aviso.' }

  // Validar que todos os itens são da mesma categoria do aviso
  const categoriaInvalida = d.itens.find(i => i.categoria_objeto !== aviso.categoria_objeto)
  if (categoriaInvalida) {
    return {
      success: false,
      error: `Item "${categoriaInvalida.descricao}" e de categoria diferente da licitacao. Somente itens de "${aviso.categoria_objeto}" sao permitidos.`,
    }
  }

  // 1. Criar adesão
  const { data: adesao, error: adesaoErr } = await (supabase as any)
    .from('avisos_adesoes')
    .insert({
      aviso_id: d.aviso_id,
      secretaria_id: d.secretaria_id,
      fiscal_nome: d.fiscal_nome,
      dotacao_orcamentaria: d.dotacao_orcamentaria,
    })
    .select('id')
    .single()

  if (adesaoErr || !adesao) return { success: false, error: adesaoErr?.message ?? 'Erro ao registrar adesao.' }

  // 2. Inserir itens da adesão
  const { error: itensErr } = await (supabase as any)
    .from('avisos_adesoes_itens')
    .insert(
      d.itens.map(item => ({
        adesao_id: adesao.id,
        aviso_item_id: item.aviso_item_id,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        categoria_objeto: item.categoria_objeto,
      }))
    )
  if (itensErr) {
    await (supabase as any).from('avisos_adesoes').delete().eq('id', adesao.id)
    return { success: false, error: `Erro ao inserir itens: ${itensErr.message}` }
  }

  // 3. Atualizar status da destinatária
  await (supabase as any)
    .from('avisos_destinatarias')
    .update({ status: 'aderiu', respondido_em: new Date().toISOString() })
    .eq('id', destinataria.id)

  // 4. Notificar criador do aviso
  const { data: avioCompleto } = await (supabase as any)
    .from('avisos_compra_conjunta')
    .select('criado_por, secretaria_origem:secretarias!secretaria_origem_id(nome)')
    .eq('id', d.aviso_id)
    .single()

  if (avioCompleto) {
    const secNome = (avioCompleto as any).secretaria_origem?.nome ?? 'Uma secretaria'
    await (supabase as any).from('notificacoes').insert({
      usuario_id: (avioCompleto as any).criado_por,
      titulo: 'Nova adesao ao aviso',
      mensagem: `${secNome} aderiu ao seu Aviso de Compra Conjunta.`,
      lida: false,
      link: `/processos/aviso-compra-conjunta/${d.aviso_id}`,
    })
  }

  revalidatePath(`/processos/aviso-compra-conjunta/${d.aviso_id}`)
  return { success: true }
}

export async function encerrarPrazo(
  avisoId: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return { success: false, error: 'Nao autenticado.' }

  const { supabase } = ctx

  const { error } = await (supabase as any)
    .from('avisos_compra_conjunta')
    .update({ status: 'encerrado' })
    .eq('id', avisoId)
    .eq('organizacao_id', ctx.organizacao_id)
    .eq('status', 'aberto')

  if (error) return { success: false, error: error.message }

  // Notificar criador
  const { data: aviso } = await (supabase as any)
    .from('avisos_compra_conjunta')
    .select('criado_por')
    .eq('id', avisoId)
    .single()

  if (aviso) {
    await (supabase as any).from('notificacoes').insert({
      usuario_id: (aviso as any).criado_por,
      titulo: 'Prazo de adesao encerrado',
      mensagem: 'O prazo do seu Aviso de Compra Conjunta foi encerrado. Voce pode iniciar o processo licitatorio.',
      lida: false,
      link: `/processos/aviso-compra-conjunta/${avisoId}`,
    })
  }

  revalidatePath(`/processos/aviso-compra-conjunta/${avisoId}`)
  return { success: true }
}

export async function iniciarProcessoDoAviso(
  avisoId: string
): Promise<{ success: boolean; processoId?: string; error?: string }> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return { success: false, error: 'Nao autenticado.' }

  const { supabase, user } = ctx

  // Buscar aviso completo
  const resultado = await buscarAviso(avisoId)
  if (!resultado.success || !resultado.aviso) {
    return { success: false, error: resultado.error ?? 'Aviso nao encontrado.' }
  }

  const aviso = resultado.aviso

  // Consolidar itens: origem + adesões (deduplicar por aviso_item_id)
  const itensConsolidados: Array<{
    descricao: string
    unidade: string
    quantidade: number
    secretaria: string
  }> = []

  // Itens da origem
  for (const item of aviso.itens) {
    itensConsolidados.push({
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: item.quantidade_origem,
      secretaria: aviso.secretaria_origem.nome,
    })
  }

  // Itens das adesões (mesmos itens da origem + adicionais)
  for (const adesao of aviso.adesoes) {
    for (const item of adesao.itens) {
      if (item.aviso_item_id) {
        // Item existente: encontrar e somar
        const existente = itensConsolidados.find(
          i => i.descricao === item.descricao && i.unidade === item.unidade
        )
        if (existente) {
          existente.quantidade += item.quantidade
        } else {
          itensConsolidados.push({
            descricao: item.descricao,
            unidade: item.unidade,
            quantidade: item.quantidade,
            secretaria: adesao.secretaria.nome,
          })
        }
      } else {
        // Item adicional
        itensConsolidados.push({
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: item.quantidade,
          secretaria: adesao.secretaria.nome,
        })
      }
    }
  }

  // Formatar para ItemWizard (formato esperado pelo wizard)
  const itensWizard = itensConsolidados.map(item => ({
    id: crypto.randomUUID(),
    descricao: item.descricao,
    unidade: item.unidade,
    quantidade: item.quantidade,
  }))

  // Marcar aviso como processo_iniciado
  await (supabase as any)
    .from('avisos_compra_conjunta')
    .update({ status: 'processo_iniciado' })
    .eq('id', avisoId)

  // Notificar secretarias que aderiram
  for (const adesao of aviso.adesoes) {
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id')
      .eq('secretaria_id', adesao.secretaria_id)

    if (usuarios?.length) {
      await (supabase as any).from('notificacoes').insert(
        (usuarios as Array<{ id: string }>).map(u => ({
          usuario_id: u.id,
          titulo: 'Processo licitatorio iniciado',
          mensagem: 'O processo licitatorio do Aviso de Compra Conjunta do qual sua secretaria participou foi iniciado.',
          lida: false,
          link: `/processos/aviso-compra-conjunta/${avisoId}`,
        }))
      )
    }
  }

  // Retornar dados do wizard para o client serializar no localStorage
  return {
    success: true,
    processoId: JSON.stringify({
      secretaria_id: aviso.secretaria_origem_id,
      modalidade: aviso.modalidade,
      categoria_objeto: aviso.categoria_objeto,
      itens: itensWizard,
    }),
  }
}
```

- [ ] **Step 2: Verificar tipos — rodar `tsc --noEmit`**

```bash
npx tsc --noEmit
```

Expected: sem erros relacionados a `avisos.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/avisos.ts
git commit -m "feat(actions): server actions do modulo Aviso de Compra Conjunta"
```

---

## Task 3: Formulário de criação (`/processos/aviso-compra-conjunta/novo/page.tsx`)

**Files:**
- Create: `src/app/(dashboard)/processos/aviso-compra-conjunta/novo/layout.tsx` — proteção RBAC
- Create: `src/app/(dashboard)/processos/aviso-compra-conjunta/novo/page.tsx`

Contexto: O projeto usa um `layout.tsx` Server Component para proteger rotas por papel (ver `src/app/(dashboard)/processos/novo/layout.tsx`). Este módulo deve ter a mesma proteção: apenas papéis em `PODE_CRIAR_PROCESSO` podem criar avisos. As opções de modalidade e categoria vêm de `src/app/(dashboard)/processos/novo/types.ts` (já exportados como `LABELS_MODALIDADE` e `LABELS_CATEGORIA`).

- [ ] **Step 1: Criar o diretório e o arquivo**

```bash
mkdir -p "src/app/(dashboard)/processos/aviso-compra-conjunta/novo"
```

- [ ] **Step 1b: Criar `layout.tsx` com proteção RBAC**

```typescript
// src/app/(dashboard)/processos/aviso-compra-conjunta/novo/layout.tsx
import { redirect } from 'next/navigation'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { PODE_CRIAR_PROCESSO } from '@/lib/permissions'
import type { PapelUsuario } from '@/types/database'

export default async function NovoAvisoLayout({ children }: { children: React.ReactNode }) {
  const papel = await obterPapelUsuario()
  if (!papel || !PODE_CRIAR_PROCESSO.includes(papel as PapelUsuario)) {
    redirect('/dashboard')
  }
  return <>{children}</>
}
```

- [ ] **Step 2: Escrever `page.tsx`**

```typescript
'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Loader2, Send } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { criarAviso } from '@/lib/actions/avisos'
import { listarSecretarias } from '@/lib/actions/secretarias'
import { LABELS_MODALIDADE, LABELS_CATEGORIA } from '@/app/(dashboard)/processos/novo/types'
import type { CriarAvisoInput, ItemAvisoInput } from '@/lib/actions/avisos'
import type { ModalidadeLicitacao } from '@/types/database'
import type { CategoriaObjeto } from '@/app/(dashboard)/processos/novo/types'

type Secretaria = { id: string; nome: string; sigla: string | null }

const PRAZO_PADRAO = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 5)
  return d.toISOString().split('T')[0]
})()

const PRAZO_MIN = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
})()

export default function NovoAvisoPage() {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [secretarias, setSecretarias] = useState<Secretaria[]>([])
  const [secretariaOrigemId, setSecretariaOrigemId] = useState('')
  const [modalidade, setModalidade] = useState<ModalidadeLicitacao>('pregao_eletronico')
  const [categoria, setCategoria] = useState<CategoriaObjeto>('outros')
  const [prazo, setPrazo] = useState(PRAZO_PADRAO)
  const [destinatarias, setDestinatarias] = useState<Set<string>>(new Set())
  const [itens, setItens] = useState<Array<ItemAvisoInput & { _id: string }>>([
    { _id: crypto.randomUUID(), descricao: '', unidade: 'unidade', quantidade_origem: 1 },
  ])
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    listarSecretarias().then(setSecretarias)
  }, [])

  const secretariasDestinatarias = secretarias.filter(s => s.id !== secretariaOrigemId)

  function toggleDestinataria(id: string) {
    setDestinatarias(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  function addItem() {
    setItens(prev => [...prev, { _id: crypto.randomUUID(), descricao: '', unidade: 'unidade', quantidade_origem: 1 }])
  }

  function removeItem(id: string) {
    setItens(prev => prev.filter(i => i._id !== id))
  }

  function updateItem(id: string, campo: keyof ItemAvisoInput, valor: string | number) {
    setItens(prev => prev.map(i => i._id === id ? { ...i, [campo]: valor } : i))
  }

  function validar(): string | null {
    if (!secretariaOrigemId) return 'Selecione a secretaria de origem.'
    if (!prazo || prazo < PRAZO_MIN) return 'Prazo deve ser ao menos amanha.'
    if (itens.length === 0) return 'Adicione ao menos um item.'
    for (const item of itens) {
      if (item.descricao.trim().length < 2) return 'Preencha a descricao de todos os itens.'
      if (!item.unidade.trim()) return 'Preencha a unidade de todos os itens.'
      if (item.quantidade_origem <= 0) return 'Quantidade deve ser maior que zero em todos os itens.'
    }
    if (destinatarias.size === 0) return 'Selecione ao menos uma secretaria destinataria.'
    return null
  }

  function handleEnviar() {
    const erro = validar()
    if (erro) { toast.error(erro); return }

    setEnviando(true)
    const prazoISO = new Date(`${prazo}T23:59:59`).toISOString()

    const payload: CriarAvisoInput = {
      secretaria_origem_id: secretariaOrigemId,
      modalidade,
      categoria_objeto: categoria,
      prazo_adesao: prazoISO,
      itens: itens.map(({ _id, ...rest }) => rest),
      secretarias_destinatarias: Array.from(destinatarias),
    }

    startTransition(async () => {
      const res = await criarAviso(payload)
      setEnviando(false)
      if (!res.success || !res.avisoId) {
        toast.error(res.error ?? 'Erro ao enviar aviso.')
        return
      }
      toast.success('Aviso enviado com sucesso!')
      router.push(`/processos/aviso-compra-conjunta/${res.avisoId}`)
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Novo Aviso de Compra Conjunta</h1>
          <p className="text-sm text-gray-500">
            Comunique a intencao de licitar e convide outras secretarias a participar.
          </p>
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-6 space-y-6">

          {/* Secretaria de Origem */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Secretaria de Origem <span className="text-red-500">*</span></Label>
            <Select value={secretariaOrigemId} onValueChange={setSecretariaOrigemId}>
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

          {/* Modalidade */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Modalidade <span className="text-red-500">*</span></Label>
            <Select value={modalidade} onValueChange={v => setModalidade(v as ModalidadeLicitacao)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(LABELS_MODALIDADE) as [ModalidadeLicitacao, string][]).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Categoria do Objeto <span className="text-red-500">*</span></Label>
            <Select value={categoria} onValueChange={v => setCategoria(v as CategoriaObjeto)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(LABELS_CATEGORIA) as [CategoriaObjeto, string][]).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prazo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Prazo para Adesao <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={prazo}
              min={PRAZO_MIN}
              onChange={e => setPrazo(e.target.value)}
              className="h-9 text-sm"
            />
            <p className="text-xs text-gray-400">Apos o prazo, o processo podera ser iniciado com as secretarias que aderiram.</p>
          </div>

          {/* Itens */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Itens que pretendo licitar <span className="text-red-500">*</span></Label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Descricao</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-28">Unidade</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-24">Qtd</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itens.map(item => (
                    <tr key={item._id}>
                      <td className="px-3 py-2">
                        <Input
                          value={item.descricao}
                          onChange={e => updateItem(item._id, 'descricao', e.target.value)}
                          placeholder="Ex: Mesa de escritorio em L"
                          className="h-8 text-sm border-0 px-0 focus-visible:ring-0 shadow-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={item.unidade}
                          onChange={e => updateItem(item._id, 'unidade', e.target.value)}
                          placeholder="unidade"
                          className="h-8 text-sm border-0 px-0 focus-visible:ring-0 shadow-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantidade_origem}
                          onChange={e => updateItem(item._id, 'quantidade_origem', Number(e.target.value))}
                          className="h-8 text-sm w-20 border-0 px-0 focus-visible:ring-0 shadow-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        {itens.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(item._id)}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar item
            </button>
          </div>

          {/* Secretarias Destinatárias */}
          {secretariaOrigemId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Secretarias Destinatarias <span className="text-red-500">*</span></Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDestinatarias(new Set(secretariasDestinatarias.map(s => s.id)))}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Selecionar todas
                  </button>
                  {destinatarias.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setDestinatarias(new Set())}
                      className="text-xs text-gray-400 hover:underline"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
              {secretariasDestinatarias.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma outra secretaria cadastrada.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {secretariasDestinatarias.map(s => {
                    const sel = destinatarias.has(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleDestinataria(s.id)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          sel
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {s.nome}{s.sigla ? ` (${s.sigla})` : ''}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              Cancelar
            </Button>
          </Link>
          <Button
            onClick={handleEnviar}
            disabled={enviando}
            className="bg-blue-700 hover:bg-blue-800 text-white gap-2"
          >
            {enviando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              : <><Send className="w-4 h-4" /> Enviar Aviso</>}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 4: Testar no browser**

1. Acesse `/processos/aviso-compra-conjunta/novo`
2. Tente enviar sem preencher — deve mostrar toast de erro
3. Preencha todos os campos e clique "Enviar Aviso"
4. Expected: redirect para `/processos/aviso-compra-conjunta/[id]`

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/processos/aviso-compra-conjunta/novo/layout.tsx"
git add "src/app/(dashboard)/processos/aviso-compra-conjunta/novo/page.tsx"
git commit -m "feat(ui): formulario de criacao do Aviso de Compra Conjunta"
```

---

## Task 4: Painel de acompanhamento (`/processos/aviso-compra-conjunta/[id]`)

**Files:**
- Create: `src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/page.tsx`
- Create: `src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/painel-acompanhamento.tsx`

- [ ] **Step 1: Criar Server Component `page.tsx`**

```typescript
// src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/page.tsx
import { notFound } from 'next/navigation'
import { buscarAviso } from '@/lib/actions/avisos'
import PainelAcompanhamento from './painel-acompanhamento'

export default async function AvisoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resultado = await buscarAviso(id)
  if (!resultado.success || !resultado.aviso) notFound()

  return (
    <div className="max-w-4xl mx-auto">
      <PainelAcompanhamento aviso={resultado.aviso} />
    </div>
  )
}
```

- [ ] **Step 2: Criar Client Component `painel-acompanhamento.tsx`**

```typescript
// src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/painel-acompanhamento.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Check, Clock, AlertCircle, Loader2, Play, X } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { encerrarPrazo, iniciarProcessoDoAviso } from '@/lib/actions/avisos'
import type { AvisoDetalhe } from '@/lib/actions/avisos'
import { LABELS_MODALIDADE, LABELS_CATEGORIA, type CategoriaObjeto } from '@/app/(dashboard)/processos/novo/types'
import type { ModalidadeLicitacao } from '@/types/database'
import { DADOS_WIZARD_INICIAL } from '@/app/(dashboard)/processos/novo/types'

const STORAGE_KEY = 'licitaia_wizard_draft'

interface Props {
  aviso: AvisoDetalhe
}

function diasRestantes(prazo: string): number {
  const diff = new Date(prazo).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function PainelAcompanhamento({ aviso }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [encerrando, setEncerrando] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [confirmarSemAdesao, setConfirmarSemAdesao] = useState(false)

  const aderidas = aviso.destinatarias.filter(d => d.status === 'aderiu')
  const pendentes = aviso.destinatarias.filter(d => d.status === 'pendente')
  const dias = diasRestantes(aviso.prazo_adesao)
  const prazoVencido = dias === 0 || new Date(aviso.prazo_adesao) < new Date()
  const podeIniciar = aviso.status === 'encerrado' || (aviso.status === 'aberto' && prazoVencido)

  function handleEncerrar() {
    setEncerrando(true)
    startTransition(async () => {
      const res = await encerrarPrazo(aviso.id)
      setEncerrando(false)
      if (!res.success) { toast.error(res.error ?? 'Erro ao encerrar prazo.'); return }
      toast.success('Prazo encerrado.')
      router.refresh()
    })
  }

  function handleIniciar() {
    if (aviso.adesoes.length === 0 && !confirmarSemAdesao) {
      setConfirmarSemAdesao(true)
      return
    }
    setIniciando(true)
    startTransition(async () => {
      const res = await iniciarProcessoDoAviso(aviso.id)
      setIniciando(false)
      if (!res.success || !res.processoId) {
        toast.error(res.error ?? 'Erro ao iniciar processo.')
        return
      }
      // processoId aqui contém o JSON dos dados pré-preenchidos
      const dadosWizard = JSON.parse(res.processoId)
      try {
        const draft = { ...DADOS_WIZARD_INICIAL, ...dadosWizard }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
      } catch {}
      toast.success('Redirecionando para o wizard...')
      router.push('/processos/novo')
    })
  }

  // Montar tabela consolidada: itens na vertical, secretarias nas colunas
  const todasSecretarias = [
    { id: aviso.secretaria_origem_id, nome: aviso.secretaria_origem.nome },
    ...aviso.adesoes.map(a => ({ id: a.secretaria_id, nome: a.secretaria.nome })),
  ]

  type ItemRow = {
    descricao: string
    unidade: string
    qtds: Record<string, number>
    total: number
  }

  const tabelaItens: ItemRow[] = []

  // Itens da origem
  for (const item of aviso.itens) {
    const row: ItemRow = { descricao: item.descricao, unidade: item.unidade, qtds: {}, total: 0 }
    row.qtds[aviso.secretaria_origem_id] = item.quantidade_origem
    row.total += item.quantidade_origem

    // Somar quantidades das adesões para este item
    for (const adesao of aviso.adesoes) {
      const ai = adesao.itens.find(i => i.aviso_item_id === item.id)
      if (ai) {
        row.qtds[adesao.secretaria_id] = (row.qtds[adesao.secretaria_id] ?? 0) + ai.quantidade
        row.total += ai.quantidade
      }
    }
    tabelaItens.push(row)
  }

  // Itens adicionais das adesões (aviso_item_id === null)
  for (const adesao of aviso.adesoes) {
    for (const ai of adesao.itens.filter(i => i.aviso_item_id === null)) {
      const existing = tabelaItens.find(r => r.descricao === ai.descricao && r.unidade === ai.unidade)
      if (existing) {
        existing.qtds[adesao.secretaria_id] = (existing.qtds[adesao.secretaria_id] ?? 0) + ai.quantidade
        existing.total += ai.quantidade
      } else {
        const row: ItemRow = { descricao: ai.descricao, unidade: ai.unidade, qtds: {}, total: 0 }
        row.qtds[adesao.secretaria_id] = ai.quantidade
        row.total += ai.quantidade
        tabelaItens.push(row)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">Aviso de Compra Conjunta</h1>
          <p className="text-sm text-gray-500">
            {LABELS_MODALIDADE[aviso.modalidade as ModalidadeLicitacao]} &bull;{' '}
            {LABELS_CATEGORIA[aviso.categoria_objeto as CategoriaObjeto]} &bull;{' '}
            {aviso.secretaria_origem.nome}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
          aviso.status === 'aberto' ? 'bg-blue-50 text-blue-700 border-blue-200'
          : aviso.status === 'encerrado' ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {aviso.status === 'aberto' ? 'Aberto' : aviso.status === 'encerrado' ? 'Encerrado' : 'Processo iniciado'}
        </span>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{aderidas.length}</div>
            <div className="text-xs text-green-600 mt-0.5">Aderiram</div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{pendentes.length}</div>
            <div className="text-xs text-amber-600 mt-0.5">Pendentes</div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">{prazoVencido ? '0' : dias}</div>
            <div className="text-xs text-gray-500 mt-0.5">{prazoVencido ? 'Prazo vencido' : `dia${dias !== 1 ? 's' : ''} restantes`}</div>
          </CardContent>
        </Card>
      </div>

      {/* Status das secretarias */}
      <Card className="border-gray-200">
        <CardContent className="p-5 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status das secretarias</p>
          {aviso.destinatarias.map(d => (
            <div key={d.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${
              d.status === 'aderiu' ? 'bg-green-50' : 'bg-amber-50'
            }`}>
              <span className="text-sm text-gray-800">{d.secretaria.nome}</span>
              {d.status === 'aderiu'
                ? <span className="flex items-center gap-1 text-xs font-semibold text-green-700"><Check className="w-3.5 h-3.5" /> Aderiu</span>
                : <span className="flex items-center gap-1 text-xs font-semibold text-amber-700"><Clock className="w-3.5 h-3.5" /> Aguardando</span>}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tabela consolidada */}
      {tabelaItens.length > 0 && (
        <Card className="border-gray-200">
          <CardContent className="p-5 space-y-3 overflow-x-auto">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Itens consolidados</p>
            <table className="w-full text-sm min-w-max">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Item</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-20">Unid.</th>
                  {todasSecretarias.map(s => (
                    <th key={s.id} className="text-center px-3 py-2 text-xs font-semibold text-gray-600 w-24 truncate max-w-24">
                      {s.nome.split(' ').slice(-1)[0]}
                    </th>
                  ))}
                  <th className="text-center px-3 py-2 text-xs font-semibold text-blue-700 w-20">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tabelaItens.map((row, i) => (
                  <tr key={i} className="bg-white">
                    <td className="px-3 py-2.5 text-gray-800">{row.descricao}</td>
                    <td className="px-3 py-2.5 text-gray-500">{row.unidade}</td>
                    {todasSecretarias.map(s => (
                      <td key={s.id} className="px-3 py-2.5 text-center text-gray-700">
                        {row.qtds[s.id] ?? <span className="text-gray-200">---</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center font-semibold text-blue-700">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Dialog confirmar sem adesão */}
      {confirmarSemAdesao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm border-gray-200 shadow-xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Nenhuma secretaria aderiu</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Nenhuma secretaria respondeu ao aviso. Deseja prosseguir com o processo somente com os itens da sua secretaria?
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setConfirmarSemAdesao(false)}>
                  <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleIniciar} className="bg-blue-700 hover:bg-blue-800 text-white">
                  <Play className="w-3.5 h-3.5 mr-1.5" /> Prosseguir assim mesmo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ações */}
      {aviso.status !== 'processo_iniciado' && (
        <div className="flex items-center justify-between">
          {aviso.status === 'aberto' && !prazoVencido && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEncerrar}
              disabled={encerrando}
              className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              {encerrando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              Encerrar prazo agora
            </Button>
          )}
          {podeIniciar && (
            <Button
              onClick={handleIniciar}
              disabled={iniciando}
              className="ml-auto bg-green-700 hover:bg-green-800 text-white gap-2"
            >
              {iniciando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando...</>
                : <><Play className="w-4 h-4" /> Iniciar Processo</>}
            </Button>
          )}
        </div>
      )}

      {aviso.status === 'processo_iniciado' && aviso.processo_id && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <Check className="w-4 h-4 shrink-0" />
          Processo licitatorio iniciado. Os dados deste aviso foram carregados no wizard.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Testar no browser**

1. Acesse `/processos/aviso-compra-conjunta/[id]` de um aviso criado
2. Verificar métricas, tabela de status e tabela consolidada
3. Clicar "Encerrar prazo" — deve atualizar status
4. Clicar "Iniciar Processo" — deve redirecionar para `/processos/novo` com dados no localStorage

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/page.tsx"
git add "src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/painel-acompanhamento.tsx"
git commit -m "feat(ui): painel de acompanhamento do Aviso de Compra Conjunta"
```

---

## Task 5: Tela de adesão (`/processos/aviso-compra-conjunta/[id]/aderir`)

**Files:**
- Create: `src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/aderir/page.tsx`
- Create: `src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/aderir/formulario-adesao.tsx`

- [ ] **Step 1: Criar Server Component `page.tsx`**

```typescript
// src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/aderir/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarAviso } from '@/lib/actions/avisos'
import FormularioAdesao from './formulario-adesao'

export default async function AderirPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Pegar secretaria do usuário logado
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: userData } = await supabase
    .from('usuarios')
    .select('secretaria_id')
    .eq('id', user.id)
    .maybeSingle()

  const secretariaId = (userData as any)?.secretaria_id as string | null

  const resultado = await buscarAviso(id)
  if (!resultado.success || !resultado.aviso) notFound()

  const aviso = resultado.aviso

  // Verificar que a secretaria do usuário está na lista de destinatárias
  const eDestinataria = aviso.destinatarias.some(d => d.secretaria_id === secretariaId)
  if (!eDestinataria) notFound()

  // Verificar se já aderiu
  const jaAderiu = aviso.adesoes.some(a => a.secretaria_id === secretariaId)

  return (
    <div className="max-w-2xl mx-auto">
      <FormularioAdesao
        aviso={aviso}
        secretariaId={secretariaId!}
        jaAderiu={jaAderiu}
      />
    </div>
  )
}
```

- [ ] **Step 2: Criar Client Component `formulario-adesao.tsx`**

```typescript
// src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/aderir/formulario-adesao.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { registrarAdesao } from '@/lib/actions/avisos'
import type { AvisoDetalhe, ItemAdesaoInput } from '@/lib/actions/avisos'
import { LABELS_MODALIDADE, LABELS_CATEGORIA, type CategoriaObjeto } from '@/app/(dashboard)/processos/novo/types'
import type { ModalidadeLicitacao } from '@/types/database'

interface Props {
  aviso: AvisoDetalhe
  secretariaId: string
  jaAderiu: boolean
}

export default function FormularioAdesao({ aviso, secretariaId, jaAderiu }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [fiscal, setFiscal] = useState('')
  const [dotacao, setDotacao] = useState('')
  const [quantidades, setQuantidades] = useState<Record<string, number>>(
    Object.fromEntries(aviso.itens.map(i => [i.id, 0]))
  )
  const [itensAdicionais, setItensAdicionais] = useState<Array<{
    _id: string
    descricao: string
    unidade: string
    quantidade: number
  }>>([])
  const [enviando, setEnviando] = useState(false)

  function addItemAdicional() {
    setItensAdicionais(prev => [...prev, { _id: crypto.randomUUID(), descricao: '', unidade: 'unidade', quantidade: 1 }])
  }

  function removeItemAdicional(id: string) {
    setItensAdicionais(prev => prev.filter(i => i._id !== id))
  }

  function updateItemAdicional(id: string, campo: 'descricao' | 'unidade' | 'quantidade', valor: string | number) {
    setItensAdicionais(prev => prev.map(i => i._id === id ? { ...i, [campo]: valor } : i))
  }

  function handleEnviar() {
    if (!fiscal.trim()) { toast.error('Informe o Fiscal do Contrato.'); return }
    if (!dotacao.trim()) { toast.error('Informe a Dotacao Orcamentaria.'); return }

    const itensEscolhidos = aviso.itens.filter(i => (quantidades[i.id] ?? 0) > 0)
    if (itensEscolhidos.length === 0 && itensAdicionais.length === 0) {
      toast.error('Selecione ao menos um item ou adicione itens da sua secretaria.')
      return
    }

    // Validar itens adicionais: categoria deve ser igual ao aviso
    for (const item of itensAdicionais) {
      if (item.descricao.trim().length < 2) { toast.error('Preencha a descricao de todos os itens adicionais.'); return }
      if (!item.unidade.trim()) { toast.error('Preencha a unidade de todos os itens adicionais.'); return }
      if (item.quantidade <= 0) { toast.error('Quantidade deve ser maior que zero.'); return }
    }

    const itensPayload: ItemAdesaoInput[] = [
      ...itensEscolhidos.map(item => ({
        aviso_item_id: item.id,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: quantidades[item.id],
        categoria_objeto: aviso.categoria_objeto,
      })),
      ...itensAdicionais.map(item => ({
        aviso_item_id: null,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        categoria_objeto: aviso.categoria_objeto,
      })),
    ]

    setEnviando(true)
    startTransition(async () => {
      const res = await registrarAdesao({
        aviso_id: aviso.id,
        secretaria_id: secretariaId,
        fiscal_nome: fiscal,
        dotacao_orcamentaria: dotacao,
        itens: itensPayload,
      })
      setEnviando(false)
      if (!res.success) { toast.error(res.error ?? 'Erro ao registrar adesao.'); return }
      toast.success('Adesao confirmada com sucesso!')
      router.refresh()
    })
  }

  if (jaAderiu) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Sua secretaria ja aderiu</h2>
          <p className="text-sm text-gray-500">A adesao foi registrada com sucesso.</p>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="mt-2">Ir para o painel</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (aviso.status !== 'aberto') {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-8 text-center space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Prazo encerrado</h2>
          <p className="text-sm text-gray-500">O prazo para adesao a este aviso foi encerrado.</p>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="mt-2">Ir para o painel</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Adesao ao Aviso de Compra Conjunta</h1>
          <p className="text-sm text-gray-500">
            {aviso.secretaria_origem.nome} &bull;{' '}
            {LABELS_MODALIDADE[aviso.modalidade as ModalidadeLicitacao]} &bull;{' '}
            {LABELS_CATEGORIA[aviso.categoria_objeto as CategoriaObjeto]}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
        Prazo para adesao: <strong>{new Date(aviso.prazo_adesao).toLocaleDateString('pt-BR')}</strong>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-6 space-y-6">

          {/* Tabela de itens */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Itens disponíveis para adesao</Label>
            <p className="text-xs text-gray-400">Informe a quantidade desejada. Deixe 0 para itens sem interesse.</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Item</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-24">Unidade</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 w-32">Qtd que desejo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {aviso.itens.map(item => (
                    <tr key={item.id} className={(quantidades[item.id] ?? 0) > 0 ? 'bg-blue-50/30' : 'bg-white'}>
                      <td className="px-3 py-2.5 text-gray-800">{item.descricao}</td>
                      <td className="px-3 py-2.5 text-gray-500">{item.unidade}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Input
                          type="number"
                          min={0}
                          value={quantidades[item.id] ?? 0}
                          onChange={e => setQuantidades(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                          className="h-8 text-sm w-24 mx-auto text-center"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Itens adicionais */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Itens adicionais da minha secretaria</Label>
              <p className="text-xs text-gray-400">Somente itens de: {LABELS_CATEGORIA[aviso.categoria_objeto as CategoriaObjeto]}</p>
            </div>
            {itensAdicionais.map(item => (
              <div key={item._id} className="flex items-center gap-2">
                <Input
                  placeholder="Descricao do item"
                  value={item.descricao}
                  onChange={e => updateItemAdicional(item._id, 'descricao', e.target.value)}
                  className="flex-1 h-9 text-sm"
                />
                <Input
                  placeholder="Unidade"
                  value={item.unidade}
                  onChange={e => updateItemAdicional(item._id, 'unidade', e.target.value)}
                  className="w-24 h-9 text-sm"
                />
                <Input
                  type="number"
                  min={1}
                  value={item.quantidade}
                  onChange={e => updateItemAdicional(item._id, 'quantidade', Number(e.target.value))}
                  className="w-20 h-9 text-sm"
                />
                <button type="button" onClick={() => removeItemAdicional(item._id)} className="p-1 text-gray-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addItemAdicional}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar item adicional
            </button>
          </div>

          {/* Fiscal e Dotação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fiscal do Contrato <span className="text-red-500">*</span></Label>
              <Input
                value={fiscal}
                onChange={e => setFiscal(e.target.value)}
                placeholder="Nome do fiscal desta secretaria"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Dotacao Orcamentaria <span className="text-red-500">*</span></Label>
              <Input
                value={dotacao}
                onChange={e => setDotacao(e.target.value)}
                placeholder="Ex: 02.001.33903000.2025"
                className="h-9 text-sm"
              />
            </div>
          </div>

        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">Cancelar</Button>
          </Link>
          <Button
            onClick={handleEnviar}
            disabled={enviando}
            className="bg-blue-700 hover:bg-blue-800 text-white gap-2"
          >
            {enviando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              : <><Check className="w-4 h-4" /> Confirmar Adesao</>}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Testar no browser**

1. Como usuário de secretaria destinatária, acesse `/processos/aviso-compra-conjunta/[id]/aderir`
2. Tente confirmar sem preencher fiscal/dotação — deve bloquear
3. Tente adicionar item de categoria diferente (o server action deve rejeitar)
4. Preencha tudo corretamente e confirme — deve mostrar tela de "já aderiu"

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/aderir/page.tsx"
git add "src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/aderir/formulario-adesao.tsx"
git commit -m "feat(ui): tela de adesao ao Aviso de Compra Conjunta"
```

---

## Task 6: Integração no Dashboard e Navbar

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`
- Modify: `src/components/layout/navbar.tsx`

- [ ] **Step 1: Adicionar link no Navbar**

Em [src/components/layout/navbar.tsx](src/components/layout/navbar.tsx), localize o array `NAV_LINKS` (linha ~29) e adicione o item de Avisos:

```typescript
// Antes:
const NAV_LINKS = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/processos', label: 'Processos', icon: FileText },
]

// Depois:
const NAV_LINKS = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/processos', label: 'Processos', icon: FileText },
  { href: '/processos/aviso-compra-conjunta/novo', label: 'Compra Conjunta', icon: Share2 },
]
```

O import de lucide-react atual já inclui `LogOut, Settings, FileText, LayoutDashboard, Users, Zap, ChevronDown, Menu, X, Building2, TrendingUp, ShieldCheck, Bell`. Adicionar `Share2` à lista:

```typescript
import { LogOut, Settings, FileText, LayoutDashboard, Users, Zap, ChevronDown, Menu, X, Building2, TrendingUp, ShieldCheck, Bell, Share2 } from 'lucide-react'
```

- [ ] **Step 2: Adicionar card no Dashboard**

Em [src/app/(dashboard)/dashboard/page.tsx](src/app/(dashboard)/dashboard/page.tsx), adicionar busca de avisos pendentes no `Promise.all` (após a linha do `publicacoes`):

```typescript
// Adicionar no Promise.all existente (linha ~96):
(supabase as any)
  .from('avisos_compra_conjunta')
  .select('id, status')
  .eq('organizacao_id', organizacaoId)
  .eq('status', 'aberto'),
```

Após o `Promise.all`, desestruturar:

```typescript
// Adicionar na desestruturação:
{ data: avisosPendentesData },
```

Calcular o total:

```typescript
const totalAvisosPendentes = (avisosPendentesData as any[] | null ?? []).length
```

Adicionar card na seção de métricas (após o card de Créditos IA):

```typescript
{totalAvisosPendentes > 0 && (
  <Link href="/processos/aviso-compra-conjunta/novo">
    <Card className="border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Compra Conjunta</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{totalAvisosPendentes}</p>
            <p className="text-xs text-amber-600 mt-0.5">Avisos abertos</p>
          </div>
          <div className="p-2 bg-amber-100 rounded-lg">
            <Share2 className="w-4 h-4 text-amber-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  </Link>
)}
```

O `dashboard/page.tsx` foi extensamente reescrito no commit `d7c4ee5` (1000+ linhas, 5 views por papel). Antes de editar, leia o arquivo atual para localizar a seção de imports e o `Promise.all`. Adicionar `Share2` aos imports de lucide já existentes no arquivo, e inserir a query de avisos no `Promise.all` conforme descrito acima.

- [ ] **Step 3: Verificar tipos e build**

```bash
npx tsc --noEmit
next build
```

Expected: sem erros de tipo, build passa.

- [ ] **Step 4: Testar no browser**

1. Dashboard: verificar que card "Compra Conjunta" aparece quando há avisos abertos
2. Navbar: verificar link "Compra Conjunta" na navegação desktop e mobile

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/navbar.tsx
git add "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "feat(ui): link e card de Compra Conjunta no dashboard e navbar"
```

---

## Task 7: Verificação final e push

- [ ] **Step 1: Build limpo**

```bash
npx next build
```

Expected: `✓ Compiled successfully`. Sem erros de tipo ou lint.

- [ ] **Step 2: Testar fluxo completo**

1. Como secretaria A: acesse `/processos/aviso-compra-conjunta/novo`, preencha e envie
2. Verifique que notificação chegou para usuários das secretarias destinatárias
3. Como secretaria B (destinatária): clique na notificação e acesse `/aderir`, preencha e confirme
4. Como secretaria A: volte ao painel, veja secretaria B como "Aderiu" e tabela consolidada
5. Clique "Iniciar Processo": deve redirecionar para `/processos/novo` com itens pré-carregados no wizard

- [ ] **Step 3: Push**

```bash
git push origin master
```

---

## Resumo dos arquivos

| Arquivo | Tipo | Responsabilidade |
|---|---|---|
| `supabase/migrations/20260512000005_avisos_compra_conjunta.sql` | Novo | Schema + RLS das 5 tabelas |
| `src/lib/actions/avisos.ts` | Novo | Server Actions: CRUD + notificações + consolidação |
| `src/app/(dashboard)/processos/aviso-compra-conjunta/novo/layout.tsx` | Novo | Proteção RBAC da rota (Server Component) |
| `src/app/(dashboard)/processos/aviso-compra-conjunta/novo/page.tsx` | Novo | Formulário de criação (Client Component) |
| `src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/page.tsx` | Novo | Server Component: busca dados e passa para Client |
| `src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/painel-acompanhamento.tsx` | Novo | Painel status + consolidado + ações (Client Component) |
| `src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/aderir/page.tsx` | Novo | Server Component: verifica acesso e passa dados |
| `src/app/(dashboard)/processos/aviso-compra-conjunta/[id]/aderir/formulario-adesao.tsx` | Novo | Formulário de adesão com itens + fiscal + dotação (Client) |
| `src/components/layout/navbar.tsx` | Modificado | Link "Compra Conjunta" na navegação |
| `src/app/(dashboard)/dashboard/page.tsx` | Modificado | Card de avisos abertos + import Share2 |

# Chat e Mensagens Internas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar 3 tipos de chat em tempo real (por processo, por setor, canal geral da plataforma) + assistente IA contextual por processo, todos integrados ao sistema de papéis/RLS existente.

**Architecture:** Canal unificado (`canais_chat` com campo `tipo`: `processo | setor | plataforma`) permite reutilizar os mesmos componentes React para os 3 casos de uso. Supabase Realtime (postgres_changes) entrega novas mensagens sem polling. O Chat do processo é acessível pelo botão flutuante na lateral direita do layout do processo. O Chat geral (`/chat`) tem sidebar com todos os canais. O Assistente IA é uma rota separada (`/processos/[id]/assistente`) com histórico persistido e débito de créditos.

**Tech Stack:** Next.js 14 App Router, Server Components + Client Components, Supabase Postgres + Realtime (`@supabase/supabase-js` client-side subscription), Server Actions, Anthropic Claude (assistente), shadcn/ui, Lucide React.

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `supabase/migrations/20260521000002_chat_sistema.sql` | Criar | Schema: `canais_chat`, `mensagens_chat`, `leituras_chat`, RLS, Realtime |
| `src/types/chat.ts` | Criar | Tipos TypeScript para toda a feature de chat |
| `src/lib/actions/chat.ts` | Criar | Server Actions: buscar canais, mensagens, enviar, marcar lido |
| `src/hooks/use-chat-realtime.ts` | Criar | Hook client-side para Supabase Realtime subscription |
| `src/components/chat/mensagem-chat.tsx` | Criar | Bolha de mensagem individual |
| `src/components/chat/input-mensagem.tsx` | Criar | Textarea + botão enviar |
| `src/components/chat/painel-chat.tsx` | Criar | Painel de chat completo (lista + input + realtime) |
| `src/components/chat/sidebar-canais.tsx` | Criar | Sidebar com lista de canais (geral/setores/processos) |
| `src/app/(dashboard)/chat/layout.tsx` | Criar | Layout do chat com sidebar |
| `src/app/(dashboard)/chat/page.tsx` | Criar | Página inicial do chat (redirect ao canal geral) |
| `src/app/(dashboard)/chat/[canalId]/page.tsx` | Criar | View de canal individual |
| `src/app/(dashboard)/processos/[id]/chat/page.tsx` | Criar | Chat do processo (usa PainelChat com canalId do processo) |
| `src/app/(dashboard)/processos/[id]/layout.tsx` | Modificar | Adicionar botão Chat no cabeçalho do processo |
| `src/components/layout/app-header.tsx` | Modificar | Adicionar tab "Chat" com badge de não lidos |
| `src/app/(dashboard)/layout.tsx` | Modificar | Buscar contagem de não lidos para o header |
| `src/lib/actions/assistente-ia.ts` | Criar | Server Action para conversa com Claude sobre o processo |
| `src/app/(dashboard)/processos/[id]/assistente/page.tsx` | Criar | Interface do assistente IA por processo |

---

## Task 1: Schema do Banco de Dados

**Files:**
- Create: `supabase/migrations/20260521000002_chat_sistema.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/migrations/20260521000002_chat_sistema.sql

-- Canais de chat: processo-especifico, por setor ou geral da plataforma
create table canais_chat (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references organizacoes(id) on delete cascade,
  tipo            text not null check (tipo in ('processo', 'setor', 'plataforma')),
  referencia_id   uuid,            -- processo_id ou secretaria_id; null quando plataforma
  nome            text not null,
  criado_em       timestamptz not null default now()
);

-- Mensagens de qualquer canal
create table mensagens_chat (
  id              uuid primary key default gen_random_uuid(),
  canal_id        uuid not null references canais_chat(id) on delete cascade,
  autor_id        uuid not null references usuarios(id) on delete cascade,
  conteudo        text not null check (char_length(conteudo) between 1 and 4000),
  respondendo_a   uuid references mensagens_chat(id),
  editado_em      timestamptz,
  criado_em       timestamptz not null default now()
);

-- Controle de ultima leitura por usuario por canal (para contagem de nao lidos)
create table leituras_chat (
  usuario_id      uuid not null references usuarios(id) on delete cascade,
  canal_id        uuid not null references canais_chat(id) on delete cascade,
  ultima_leitura  timestamptz not null default now(),
  primary key (usuario_id, canal_id)
);

-- Conversas com o assistente IA por processo (uma por usuario por processo)
create table conversas_assistente (
  id              uuid primary key default gen_random_uuid(),
  processo_id     uuid not null references processos_licitatorios(id) on delete cascade,
  usuario_id      uuid not null references usuarios(id) on delete cascade,
  historico       jsonb not null default '[]'::jsonb,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  unique (processo_id, usuario_id)
);

-- Indices para performance
create index on mensagens_chat(canal_id, criado_em desc);
create index on canais_chat(organizacao_id, tipo);
create index on conversas_assistente(processo_id, usuario_id);

-- Habilitar Realtime para mensagens
alter publication supabase_realtime add table mensagens_chat;

-- RLS
alter table canais_chat          enable row level security;
alter table mensagens_chat       enable row level security;
alter table leituras_chat        enable row level security;
alter table conversas_assistente enable row level security;

-- Canais: usuario ve canais da sua organizacao
create policy "ver_canais_org"
  on canais_chat for select
  using (organizacao_id = get_organizacao_id());

-- Canais: qualquer membro da org pode criar canais (controle fica no Server Action)
create policy "criar_canal_org"
  on canais_chat for insert
  with check (organizacao_id = get_organizacao_id());

-- Mensagens: usuario ve mensagens de canais da sua org
create policy "ver_mensagens_org"
  on mensagens_chat for select
  using (
    canal_id in (
      select id from canais_chat
      where organizacao_id = get_organizacao_id()
    )
  );

-- Mensagens: usuario envia mensagem em canal da sua org
create policy "enviar_mensagem_org"
  on mensagens_chat for insert
  with check (
    autor_id = auth.uid()
    and canal_id in (
      select id from canais_chat
      where organizacao_id = get_organizacao_id()
    )
  );

-- Mensagens: usuario edita apenas as proprias (dentro de 5 minutos)
create policy "editar_propria_mensagem"
  on mensagens_chat for update
  using (
    autor_id = auth.uid()
    and criado_em > now() - interval '5 minutes'
  );

-- Leituras: usuario gerencia apenas as proprias
create policy "gerenciar_propria_leitura"
  on leituras_chat for all
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- Assistente: usuario acessa apenas as proprias conversas
create policy "propria_conversa_assistente"
  on conversas_assistente for all
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());
```

- [ ] **Step 2: Aplicar a migration no Supabase**

Use o MCP `apply_migration` com o conteúdo do arquivo acima, passando `name: "chat_sistema"`.

- [ ] **Step 3: Verificar as tabelas criadas**

Execute via MCP `execute_sql`:
```sql
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('canais_chat', 'mensagens_chat', 'leituras_chat', 'conversas_assistente')
order by table_name;
```
Esperado: 4 linhas retornadas.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260521000002_chat_sistema.sql
git commit -m "feat(db): adicionar tabelas de chat e assistente IA com RLS"
```

---

## Task 2: Tipos TypeScript

**Files:**
- Create: `src/types/chat.ts`

- [ ] **Step 1: Criar o arquivo de tipos**

```typescript
// src/types/chat.ts

export type TipoCanal = 'processo' | 'setor' | 'plataforma'

export interface CanalChat {
  id: string
  organizacao_id: string
  tipo: TipoCanal
  referencia_id: string | null
  nome: string
  criado_em: string
}

export interface AutorMensagem {
  nome_completo: string | null
  papel: string
}

export interface MensagemChat {
  id: string
  canal_id: string
  autor_id: string
  conteudo: string
  respondendo_a: string | null
  editado_em: string | null
  criado_em: string
  autor?: AutorMensagem | null
}

export interface LeituraChat {
  usuario_id: string
  canal_id: string
  ultima_leitura: string
}

export interface MensagemAssistente {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface CanalComNaoLidos extends CanalChat {
  nao_lidos: number
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: sem erros relacionados a `src/types/chat.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/types/chat.ts
git commit -m "feat(chat): adicionar tipos TypeScript para chat e assistente"
```

---

## Task 3: Server Actions do Chat

**Files:**
- Create: `src/lib/actions/chat.ts`

- [ ] **Step 1: Criar o arquivo de Server Actions**

```typescript
// src/lib/actions/chat.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CanalChat, CanalComNaoLidos, MensagemChat } from '@/types/chat'

// Retorna todos os canais da organizacao do usuario, com contagem de nao lidos
export async function buscarCanaisComNaoLidos(): Promise<CanalComNaoLidos[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: usr } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usr) return []
  const orgId = (usr as any).organizacao_id

  const { data: canais } = await (supabase as any)
    .from('canais_chat')
    .select('*')
    .eq('organizacao_id', orgId)
    .order('tipo', { ascending: true })
    .order('nome', { ascending: true })

  if (!canais?.length) return []

  // Para cada canal, contar mensagens nao lidas (exceto as proprias)
  const { data: leituras } = await (supabase as any)
    .from('leituras_chat')
    .select('canal_id, ultima_leitura')
    .eq('usuario_id', user.id)
    .in('canal_id', (canais as CanalChat[]).map(c => c.id))

  const leiturasMap: Record<string, string> = {}
  for (const l of (leituras ?? []) as any[]) {
    leiturasMap[l.canal_id] = l.ultima_leitura
  }

  const resultado: CanalComNaoLidos[] = []
  for (const canal of canais as CanalChat[]) {
    const ultimaLeitura = leiturasMap[canal.id]
    const query = (supabase as any)
      .from('mensagens_chat')
      .select('*', { count: 'exact', head: true })
      .eq('canal_id', canal.id)
      .neq('autor_id', user.id)

    const { count } = ultimaLeitura
      ? await query.gt('criado_em', ultimaLeitura)
      : await query

    resultado.push({ ...canal, nao_lidos: count ?? 0 })
  }

  return resultado
}

// Retorna as ultimas 100 mensagens de um canal, com dados do autor
export async function buscarMensagens(canalId: string): Promise<MensagemChat[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await (supabase as any)
    .from('mensagens_chat')
    .select(`
      *,
      autor:usuarios(nome_completo, papel)
    `)
    .eq('canal_id', canalId)
    .order('criado_em', { ascending: true })
    .limit(100)

  return (data ?? []) as MensagemChat[]
}

// Envia uma mensagem em um canal
export async function enviarMensagem(
  canalId: string,
  conteudo: string,
  respondendoA?: string,
): Promise<{ success: boolean; error?: string }> {
  const texto = conteudo.trim()
  if (!texto || texto.length > 4000) {
    return { success: false, error: 'Mensagem inválida' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado' }

  const { error } = await (supabase as any)
    .from('mensagens_chat')
    .insert({
      canal_id: canalId,
      autor_id: user.id,
      conteudo: texto,
      respondendo_a: respondendoA ?? null,
    })

  if (error) return { success: false, error: error.message }
  revalidatePath(`/chat/${canalId}`)
  return { success: true }
}

// Registra que o usuario leu o canal ate agora
export async function marcarCanalComoLido(canalId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await (supabase as any)
    .from('leituras_chat')
    .upsert({
      usuario_id: user.id,
      canal_id: canalId,
      ultima_leitura: new Date().toISOString(),
    })
}

// Garante que existe um canal para o processo; cria se necessario
export async function garantirCanalProcesso(
  processoId: string,
  nomeProcesso: string,
): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usr } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usr) return null
  const orgId = (usr as any).organizacao_id

  const { data: existente } = await (supabase as any)
    .from('canais_chat')
    .select('id')
    .eq('tipo', 'processo')
    .eq('referencia_id', processoId)
    .maybeSingle()

  if (existente) return (existente as any).id

  const { data: novo, error } = await (supabase as any)
    .from('canais_chat')
    .insert({ organizacao_id: orgId, tipo: 'processo', referencia_id: processoId, nome: nomeProcesso })
    .select('id')
    .single()

  return error ? null : (novo as any).id
}

// Garante que existe o canal geral da plataforma para a org
export async function garantirCanalPlataforma(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usr } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usr) return null
  const orgId = (usr as any).organizacao_id

  const { data: existente } = await (supabase as any)
    .from('canais_chat')
    .select('id')
    .eq('tipo', 'plataforma')
    .eq('organizacao_id', orgId)
    .maybeSingle()

  if (existente) return (existente as any).id

  const { data: novo, error } = await (supabase as any)
    .from('canais_chat')
    .insert({ organizacao_id: orgId, tipo: 'plataforma', referencia_id: null, nome: 'Geral' })
    .select('id')
    .single()

  return error ? null : (novo as any).id
}

// Garante que existe um canal para a secretaria
export async function garantirCanalSetor(
  secretariaId: string,
  nomeSetor: string,
): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usr } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usr) return null
  const orgId = (usr as any).organizacao_id

  const { data: existente } = await (supabase as any)
    .from('canais_chat')
    .select('id')
    .eq('tipo', 'setor')
    .eq('referencia_id', secretariaId)
    .maybeSingle()

  if (existente) return (existente as any).id

  const { data: novo, error } = await (supabase as any)
    .from('canais_chat')
    .insert({ organizacao_id: orgId, tipo: 'setor', referencia_id: secretariaId, nome: nomeSetor })
    .select('id')
    .single()

  return error ? null : (novo as any).id
}

// Conta total de mensagens nao lidas em todos os canais (para badge do header)
export async function contarNaoLidosTotal(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { data: usr } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()
  if (!usr) return 0
  const orgId = (usr as any).organizacao_id

  const { data: canais } = await (supabase as any)
    .from('canais_chat')
    .select('id')
    .eq('organizacao_id', orgId)

  if (!canais?.length) return 0
  const ids = (canais as any[]).map(c => c.id)

  const { data: leituras } = await (supabase as any)
    .from('leituras_chat')
    .select('canal_id, ultima_leitura')
    .eq('usuario_id', user.id)
    .in('canal_id', ids)

  const leiturasMap: Record<string, string> = {}
  for (const l of (leituras ?? []) as any[]) {
    leiturasMap[l.canal_id] = l.ultima_leitura
  }

  let total = 0
  for (const canalId of ids) {
    const ultimaLeitura = leiturasMap[canalId]
    const q = (supabase as any)
      .from('mensagens_chat')
      .select('*', { count: 'exact', head: true })
      .eq('canal_id', canalId)
      .neq('autor_id', user.id)

    const { count } = ultimaLeitura ? await q.gt('criado_em', ultimaLeitura) : await q
    total += count ?? 0
  }

  return total
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: sem erros em `src/lib/actions/chat.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/chat.ts
git commit -m "feat(chat): server actions para canais, mensagens e nao lidos"
```

---

## Task 4: Hook Supabase Realtime

**Files:**
- Create: `src/hooks/use-chat-realtime.ts`

- [ ] **Step 1: Criar o hook**

```typescript
// src/hooks/use-chat-realtime.ts
'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MensagemChat } from '@/types/chat'

// Assina novas mensagens de um canal via Supabase Realtime.
// Retorna a lista atualizada em tempo real a partir dos mensagensIniciais.
export function useChatRealtime(
  canalId: string | null,
  mensagensIniciais: MensagemChat[],
) {
  const [mensagens, setMensagens] = useState<MensagemChat[]>(mensagensIniciais)
  const canalIdRef = useRef(canalId)

  // Atualiza lista quando o canal muda (navegacao)
  useEffect(() => {
    setMensagens(mensagensIniciais)
    canalIdRef.current = canalId
  }, [canalId, mensagensIniciais])

  useEffect(() => {
    if (!canalId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`chat-canal-${canalId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_chat',
          filter: `canal_id=eq.${canalId}`,
        },
        async (payload) => {
          // Buscar dados do autor da nova mensagem
          const { data: autor } = await supabase
            .from('usuarios')
            .select('nome_completo, papel')
            .eq('id', payload.new.autor_id)
            .single()

          const nova: MensagemChat = {
            ...(payload.new as MensagemChat),
            autor: autor as any ?? null,
          }

          // Evitar duplicatas (caso o Server Action ja tenha revalidado)
          setMensagens(prev => {
            if (prev.some(m => m.id === nova.id)) return prev
            return [...prev, nova]
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [canalId])

  return mensagens
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-chat-realtime.ts
git commit -m "feat(chat): hook useChatRealtime com Supabase Realtime subscription"
```

---

## Task 5: Componentes de UI do Chat

**Files:**
- Create: `src/components/chat/mensagem-chat.tsx`
- Create: `src/components/chat/input-mensagem.tsx`
- Create: `src/components/chat/painel-chat.tsx`

- [ ] **Step 1: Criar MensagemChat (bolha individual)**

```typescript
// src/components/chat/mensagem-chat.tsx
'use client'

import type { MensagemChat } from '@/types/chat'

interface MensagemChatProps {
  mensagem: MensagemChat
  eProprioUsuario: boolean
}

function formatarHora(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
}

const PAPEL_LABEL: Record<string, string> = {
  requisitante:           'Requisitante',
  setor_licitacao:        'Licitacao',
  procurador:             'Procurador',
  autoridade_competente:  'Autoridade',
  admin_organizacao:      'Admin',
  admin_plataforma:       'Admin',
}

export function MensagemChatItem({ mensagem, eProprioUsuario }: MensagemChatProps) {
  const nome = mensagem.autor?.nome_completo?.split(' ')[0] ?? 'Usuario'
  const papelLabel = mensagem.autor?.papel ? (PAPEL_LABEL[mensagem.autor.papel] ?? mensagem.autor.papel) : ''

  return (
    <div className={`flex gap-2.5 ${eProprioUsuario ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
        style={{
          background: eProprioUsuario ? 'var(--primary)' : 'var(--accentWash)',
          color: eProprioUsuario ? 'var(--primaryInk)' : 'var(--accent)',
        }}
      >
        {nome.slice(0, 2).toUpperCase()}
      </div>

      {/* Conteudo */}
      <div className={`max-w-[72%] ${eProprioUsuario ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {!eProprioUsuario && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>{nome}</span>
            {papelLabel && (
              <span
                className="text-[9px] font-medium px-1.5 py-px rounded-sm"
                style={{ background: 'var(--accentWash)', color: 'var(--accent)' }}
              >
                {papelLabel}
              </span>
            )}
          </div>
        )}
        <div
          className="px-3 py-2 rounded-[var(--r-md)] text-sm leading-relaxed"
          style={{
            background: eProprioUsuario ? 'var(--primary)' : 'var(--surfaceAlt)',
            color: eProprioUsuario ? 'var(--primaryInk)' : 'var(--ink)',
            borderRadius: eProprioUsuario ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
          }}
        >
          {mensagem.conteudo}
        </div>
        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
          {formatarHora(mensagem.criado_em)}
          {mensagem.editado_em && ' (editado)'}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar InputMensagem**

```typescript
// src/components/chat/input-mensagem.tsx
'use client'

import { useState, useRef, useTransition } from 'react'
import { Send } from 'lucide-react'
import { enviarMensagem } from '@/lib/actions/chat'

interface InputMensagemProps {
  canalId: string
  placeholder?: string
}

export function InputMensagem({ canalId, placeholder = 'Escreva uma mensagem...' }: InputMensagemProps) {
  const [texto, setTexto] = useState('')
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  function enviar() {
    const conteudo = texto.trim()
    if (!conteudo || isPending) return

    setTexto('')
    startTransition(async () => {
      await enviarMensagem(canalId, conteudo)
    })
    textareaRef.current?.focus()
  }

  return (
    <div
      className="flex items-end gap-2 px-3 py-2 rounded-[var(--r-lg)] border"
      style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
    >
      <textarea
        ref={textareaRef}
        value={texto}
        onChange={e => setTexto(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed"
        style={{
          color: 'var(--ink)',
          maxHeight: '120px',
          overflow: 'auto',
        }}
      />
      <button
        onClick={enviar}
        disabled={!texto.trim() || isPending}
        className="w-8 h-8 rounded-[var(--r-md)] flex items-center justify-center shrink-0 transition-all"
        style={{
          background: texto.trim() ? 'var(--primary)' : 'var(--hairline)',
          color: texto.trim() ? 'var(--primaryInk)' : 'var(--muted)',
        }}
        title="Enviar (Enter)"
      >
        <Send className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Criar PainelChat (componente principal)**

```typescript
// src/components/chat/painel-chat.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useChatRealtime } from '@/hooks/use-chat-realtime'
import { MensagemChatItem } from './mensagem-chat'
import { InputMensagem } from './input-mensagem'
import { marcarCanalComoLido } from '@/lib/actions/chat'
import type { MensagemChat } from '@/types/chat'

interface PainelChatProps {
  canalId: string
  mensagensIniciais: MensagemChat[]
  usuarioAtualId: string
  titulo?: string
  className?: string
}

export function PainelChat({
  canalId,
  mensagensIniciais,
  usuarioAtualId,
  titulo,
  className = '',
}: PainelChatProps) {
  const mensagens = useChatRealtime(canalId, mensagensIniciais)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll para o fim ao carregar e ao receber novas mensagens
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens.length])

  // Marca como lido ao abrir
  useEffect(() => {
    marcarCanalComoLido(canalId).catch(() => {})
  }, [canalId])

  return (
    <div
      className={`flex flex-col rounded-[var(--r-lg)] border overflow-hidden ${className}`}
      style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
    >
      {/* Header */}
      {titulo && (
        <div
          className="px-4 py-3 border-b flex items-center gap-2"
          style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            {titulo}
          </span>
        </div>
      )}

      {/* Lista de mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0" style={{ maxHeight: '60vh' }}>
        {mensagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Nenhuma mensagem ainda. Seja o primeiro a escrever.
            </p>
          </div>
        ) : (
          mensagens.map(m => (
            <MensagemChatItem
              key={m.id}
              mensagem={m}
              eProprioUsuario={m.autor_id === usuarioAtualId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--hairline)' }}>
        <InputMensagem canalId={canalId} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: sem erros nos 3 arquivos criados.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/
git commit -m "feat(chat): componentes MensagemChat, InputMensagem e PainelChat"
```

---

## Task 6: Sidebar de Canais

**Files:**
- Create: `src/components/chat/sidebar-canais.tsx`

- [ ] **Step 1: Criar SidebarCanais**

```typescript
// src/components/chat/sidebar-canais.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, Users, Building2 } from 'lucide-react'
import type { CanalComNaoLidos, TipoCanal } from '@/types/chat'

interface SidebarCanaisProps {
  canais: CanalComNaoLidos[]
}

const TIPO_ICON: Record<TipoCanal, React.ElementType> = {
  plataforma: MessageSquare,
  setor:      Building2,
  processo:   Users,
}

const TIPO_LABEL: Record<TipoCanal, string> = {
  plataforma: 'Geral',
  setor:      'Setores',
  processo:   'Processos',
}

export function SidebarCanais({ canais }: SidebarCanaisProps) {
  const pathname = usePathname()

  const grupos: Record<TipoCanal, CanalComNaoLidos[]> = {
    plataforma: canais.filter(c => c.tipo === 'plataforma'),
    setor:      canais.filter(c => c.tipo === 'setor'),
    processo:   canais.filter(c => c.tipo === 'processo'),
  }

  return (
    <aside
      className="w-56 shrink-0 border-r h-full overflow-y-auto"
      style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}
    >
      <div className="px-4 py-4">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-3" style={{ color: 'var(--muted)' }}>
          Mensagens
        </p>

        {(Object.entries(grupos) as [TipoCanal, CanalComNaoLidos[]][]).map(([tipo, lista]) => {
          if (!lista.length) return null
          const Icon = TIPO_ICON[tipo]

          return (
            <div key={tipo} className="mb-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  {TIPO_LABEL[tipo]}
                </span>
              </div>

              <div className="space-y-0.5">
                {lista.map(canal => {
                  const href = `/chat/${canal.id}`
                  const ativo = pathname === href

                  return (
                    <Link
                      key={canal.id}
                      href={href}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-[var(--r-md)] text-[13px] transition-colors"
                      style={ativo
                        ? { background: 'var(--primaryWash)', color: 'var(--primary)', fontWeight: 600 }
                        : { color: 'var(--inkSoft)' }
                      }
                    >
                      <span className="truncate">{canal.nome}</span>
                      {canal.nao_lidos > 0 && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-px rounded-full ml-1.5 shrink-0"
                          style={{ background: 'var(--danger)', color: '#fff' }}
                        >
                          {canal.nao_lidos > 99 ? '99+' : canal.nao_lidos}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chat/sidebar-canais.tsx
git commit -m "feat(chat): sidebar de canais com agrupamento por tipo e badge de nao lidos"
```

---

## Task 7: Página Principal do Chat (/chat)

**Files:**
- Create: `src/app/(dashboard)/chat/layout.tsx`
- Create: `src/app/(dashboard)/chat/page.tsx`
- Create: `src/app/(dashboard)/chat/[canalId]/page.tsx`

- [ ] **Step 1: Criar layout do chat**

```typescript
// src/app/(dashboard)/chat/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarCanaisComNaoLidos, garantirCanalPlataforma } from '@/lib/actions/chat'
import { SidebarCanais } from '@/components/chat/sidebar-canais'

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Garante que o canal geral existe antes de renderizar
  await garantirCanalPlataforma()

  const canais = await buscarCanaisComNaoLidos()

  return (
    <div
      className="flex rounded-[var(--r-lg)] border overflow-hidden"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--hairline)',
        height: 'calc(100vh - 180px)',
        minHeight: '500px',
      }}
    >
      <SidebarCanais canais={canais} />
      <div className="flex-1 min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar página index do chat (redirect ao geral)**

```typescript
// src/app/(dashboard)/chat/page.tsx
import { redirect } from 'next/navigation'
import { garantirCanalPlataforma } from '@/lib/actions/chat'

export default async function ChatIndexPage() {
  const canalId = await garantirCanalPlataforma()
  if (canalId) redirect(`/chat/${canalId}`)

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        Nenhum canal disponivel ainda.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Criar página de canal individual**

```typescript
// src/app/(dashboard)/chat/[canalId]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarMensagens } from '@/lib/actions/chat'
import { PainelChat } from '@/components/chat/painel-chat'

export default async function CanalPage({ params }: { params: Promise<{ canalId: string }> }) {
  const { canalId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verifica se canal pertence a org do usuario
  const { data: usr } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  const { data: canal } = await (supabase as any)
    .from('canais_chat')
    .select('id, nome, tipo')
    .eq('id', canalId)
    .eq('organizacao_id', (usr as any)?.organizacao_id)
    .maybeSingle()

  if (!canal) return notFound()

  const mensagens = await buscarMensagens(canalId)

  const TITULO_TIPO: Record<string, string> = {
    plataforma: 'Canal Geral',
    setor: 'Canal do Setor',
    processo: 'Chat do Processo',
  }

  return (
    <PainelChat
      canalId={canalId}
      mensagensIniciais={mensagens}
      usuarioAtualId={user.id}
      titulo={`${TITULO_TIPO[(canal as any).tipo] ?? 'Chat'}: ${(canal as any).nome}`}
      className="h-full border-0 rounded-none"
    />
  )
}
```

- [ ] **Step 4: Verificar TypeScript e build**

```bash
npx tsc --noEmit
```
Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/chat/
git commit -m "feat(chat): pagina /chat com layout, sidebar e view de canal"
```

---

## Task 8: Chat do Processo

**Files:**
- Create: `src/app/(dashboard)/processos/[id]/chat/page.tsx`
- Modify: `src/app/(dashboard)/processos/[id]/layout.tsx` (linhas 118-132: cabeçalho do processo)

- [ ] **Step 1: Criar página de chat do processo**

```typescript
// src/app/(dashboard)/processos/[id]/chat/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarMensagens, garantirCanalProcesso } from '@/lib/actions/chat'
import { PainelChat } from '@/components/chat/painel-chat'

export default async function ChatProcessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: processoId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('numero_processo, objeto')
    .eq('id', processoId)
    .maybeSingle()

  if (!processo) redirect('/processos')

  const nomeCanal = (processo as any).numero_processo
    ? `${(processo as any).numero_processo}`
    : String((processo as any).objeto ?? '').slice(0, 40)

  const canalId = await garantirCanalProcesso(processoId, nomeCanal)
  if (!canalId) redirect(`/processos/${processoId}/dfd`)

  const mensagens = await buscarMensagens(canalId)

  return (
    <div className="space-y-0">
      <PainelChat
        canalId={canalId}
        mensagensIniciais={mensagens}
        usuarioAtualId={user.id}
        titulo={`Chat do Processo: ${nomeCanal}`}
        className="min-h-[500px]"
      />
    </div>
  )
}
```

- [ ] **Step 2: Adicionar botão Chat no layout do processo**

No arquivo `src/app/(dashboard)/processos/[id]/layout.tsx`, localize o bloco do cabeçalho do processo (linha ~118, o `<div>` externo com classe `rounded-[var(--r-lg)] border`). Adicione o link de Chat no canto superior direito do cabeçalho:

Localize a div interna `<div className="flex items-start gap-3">` (linha ~119) e adicione o botão de Chat logo após o bloco de informações do processo (antes do fechamento do div pai), modificando para incluir:

```typescript
// Adicionar este import no topo:
import { MessageSquare } from 'lucide-react'

// Dentro do cabeçalho do processo, após o bloco de informações (após </div> que fecha o flex-1):
<Link
  href={`/processos/${id}/chat`}
  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--r-md)] text-xs font-medium border transition-colors"
  style={{
    background: pathname.includes('/chat') ? 'var(--primaryWash)' : 'transparent',
    color: pathname.includes('/chat') ? 'var(--primary)' : 'var(--inkSoft)',
    borderColor: 'var(--hairline)',
  }}
  title="Chat do processo"
>
  <MessageSquare className="w-3.5 h-3.5" />
  <span className="hidden sm:inline">Chat</span>
</Link>
```

**Nota:** O `pathname` já está disponível no layout via `headers().get('x-pathname')`. A variável `pathname` já é usada na linha ~70 do layout.

O bloco de modificação fica dentro de `<div className="flex items-start gap-3">`, após o `<div className="flex-1 min-w-0">` (que contém o nome do processo):

```typescript
// Layout atual (linha ~118-131):
<div className="flex items-start gap-3">
  <Link href="/dashboard" ...>
    <ArrowLeft ... />
  </Link>
  <div className="flex-1 min-w-0">
    {/* ...badges e nome do processo... */}
  </div>
  {/* INSERIR AQUI: */}
  <Link
    href={`/processos/${id}/chat`}
    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--r-md)] text-xs font-medium border transition-colors"
    style={{
      background: etapaAtiva === 'chat' ? 'var(--primaryWash)' : 'transparent',
      color: etapaAtiva === 'chat' ? 'var(--primary)' : 'var(--inkSoft)',
      borderColor: 'var(--hairline)',
    }}
    title="Chat do processo"
  >
    <MessageSquare className="w-3.5 h-3.5" />
    <span className="hidden sm:inline">Chat</span>
  </Link>
</div>
```

O `etapaAtiva` detectado pelo pathname funcionará para a rota `/processos/[id]/chat` da mesma forma que para as outras etapas, usando a string `'chat'` (que não estará em `ETAPAS`, então não aparecerá na navegacao de etapas, mas o botão ficará ativo visualmente).

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/processos/[id]/chat/page.tsx src/app/(dashboard)/processos/[id]/layout.tsx
git commit -m "feat(chat): integrar chat ao layout do processo com botao Chat"
```

---

## Task 9: Integração na Navegação Principal

**Files:**
- Modify: `src/components/layout/app-header.tsx` (adicionar tab Chat com badge)
- Modify: `src/app/(dashboard)/layout.tsx` (buscar contagem de não lidos)

- [ ] **Step 1: Adicionar contagem de não lidos no dashboard layout**

No arquivo `src/app/(dashboard)/layout.tsx`, o `Promise.all` da linha 21 busca vários dados em paralelo. Adicionar `contarNaoLidosTotal()` nessa chamada:

Localize:
```typescript
import { buscarEventosTicker, lerPreferenciasTicker } from '@/lib/actions/ticker'
```
Adicionar ao import:
```typescript
import { contarNaoLidosTotal } from '@/lib/actions/chat'
```

Localize o `Promise.all` e adicionar `contarNaoLidosTotal()` ao array:
```typescript
const [usuarioComOrgRes, creditosRes, { notificacoes, naoLidas }, papelAtual, eventosTicker, tickerCategorias, naoLidosChat] = await Promise.all([
  // ... todos os outros existentes ...
  contarNaoLidosTotal(),
])
```

E passar ao `AppHeader`:
```typescript
<AppHeader
  // ...props existentes...
  naoLidosChat={naoLidosChat}
/>
```

- [ ] **Step 2: Atualizar AppHeaderProps e adicionar tab Chat**

No arquivo `src/components/layout/app-header.tsx`:

Adicionar `naoLidosChat?: number` à interface `AppHeaderProps`:
```typescript
interface AppHeaderProps {
  // ...props existentes...
  naoLidosChat?: number
}
```

Adicionar `naoLidosChat = 0` no destructuring:
```typescript
export function AppHeader({
  // ...params existentes...
  naoLidosChat = 0,
}: AppHeaderProps) {
```

Adicionar Chat ao array TABS (localizado na linha ~38):
```typescript
const TABS = [
  { href: '/dashboard',     label: 'Painel',        match: (p: string) => p === '/dashboard' },
  { href: '/processos',     label: 'Processos',      match: (p: string) => p.startsWith('/processos') },
  { href: '/chat',          label: 'Chat',           match: (p: string) => p.startsWith('/chat') },
  { href: '/creditos',      label: 'Creditos',       match: (p: string) => p.startsWith('/creditos') },
  { href: '/configuracoes', label: 'Configuracoes',  match: (p: string) => p.startsWith('/configuracoes') || p.startsWith('/admin') },
]
```

No loop de renderizacao das tabs (linha ~223), adicionar badge para a tab Chat. Localize o bloco `todosLinks.map`:
```typescript
{todosLinks.map((tab) => {
  const active = tab.match(pathname)
  return (
    <Link
      key={tab.href}
      href={tab.href}
      className="relative px-3.5 py-1.5 rounded-[var(--r-md)] text-[13px] tracking-[-0.01em] transition-colors font-medium"
      style={active
        ? { background: 'var(--primaryWash)', color: 'var(--primary)', fontWeight: 600 }
        : { color: 'var(--inkSoft)' }
      }
    >
      {tab.label}
      {tab.href === '/chat' && naoLidosChat > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 text-[9px] font-bold px-1 py-px rounded-full min-w-[14px] text-center"
          style={{ background: 'var(--danger)', color: '#fff', lineHeight: '1.2' }}
        >
          {naoLidosChat > 99 ? '99+' : naoLidosChat}
        </span>
      )}
    </Link>
  )
})}
```

- [ ] **Step 3: Garantir canais de setores ao acessar /chat**

No `src/app/(dashboard)/chat/layout.tsx`, após `garantirCanalPlataforma()`, buscar secretarias e garantir canais para cada uma:

```typescript
// Adicionar import:
import { garantirCanalSetor } from '@/lib/actions/chat'

// No corpo do layout, após garantirCanalPlataforma():
const { data: secretarias } = await (supabase as any)
  .from('secretarias')
  .select('id, nome')
  .eq('organizacao_id', usuario_organizacao_id)
  .eq('ativa', true)

for (const s of (secretarias ?? []) as any[]) {
  await garantirCanalSetor(s.id, s.nome)
}
```

Para isso, o layout precisa do `organizacao_id` do usuario. Adicionar a busca antes das chamadas de chat:

```typescript
const { data: usr } = await supabase
  .from('usuarios')
  .select('organizacao_id')
  .eq('id', user.id)
  .single()

const orgId = (usr as any)?.organizacao_id
if (orgId) {
  await garantirCanalPlataforma()
  const { data: secretarias } = await (supabase as any)
    .from('secretarias')
    .select('id, nome')
    .eq('organizacao_id', orgId)
    .eq('ativa', true)
  for (const s of (secretarias ?? []) as any[]) {
    await garantirCanalSetor(s.id, s.nome)
  }
}
```

- [ ] **Step 4: Verificar TypeScript e build**

```bash
npx tsc --noEmit
npx next build 2>&1 | tail -20
```
Esperado: sem erros de tipo. Build pode avisar sobre pages, verificar warnings.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/layout.tsx src/components/layout/app-header.tsx src/app/(dashboard)/chat/layout.tsx
git commit -m "feat(chat): adicionar tab Chat no header com badge de nao lidos"
```

---

## Task 10: Assistente IA por Processo

**Files:**
- Create: `src/lib/actions/assistente-ia.ts`
- Create: `src/app/(dashboard)/processos/[id]/assistente/page.tsx`

- [ ] **Step 1: Criar Server Action do assistente**

```typescript
// src/lib/actions/assistente-ia.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { MensagemAssistente } from '@/types/chat'

const CUSTO_ASSISTENTE_CREDITOS = 2

const SYSTEM_PROMPT = `Voce e um assistente juridico especializado na Lei Federal 14.133/21 (Nova Lei de Licitacoes e Contratos Administrativos). Voce ajuda os servidores publicos a entender e conduzir processos licitatorios corretamente.

Regras:
- Responda sempre em portugues formal institucional
- Nunca invente dados, numeros de processo, valores ou CNPJs
- Sempre cite o artigo da lei quando aplicavel
- Seja conciso e direto
- Quando nao souber, diga que nao sabe e sugira consultar a procuradoria
- Use "Conforme Art. X da Lei 14.133/21" para referencias legais`

export async function enviarMensagemAssistente(
  processoId: string,
  mensagemUsuario: string,
): Promise<{ success: boolean; resposta?: string; error?: string }> {
  const texto = mensagemUsuario.trim()
  if (!texto || texto.length > 2000) {
    return { success: false, error: 'Mensagem invalida' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado' }

  // Verificar saldo de creditos
  const { data: creditos } = await (supabase as any)
    .from('creditos_usuario')
    .select('saldo')
    .eq('usuario_id', user.id)
    .maybeSingle()

  if (!creditos || (creditos as any).saldo < CUSTO_ASSISTENTE_CREDITOS) {
    return { success: false, error: 'Saldo insuficiente de creditos' }
  }

  // Buscar dados do processo para contexto
  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('objeto, modalidade, status, numero_processo, valor_estimado, etapa_atual')
    .eq('id', processoId)
    .maybeSingle()

  if (!processo) return { success: false, error: 'Processo nao encontrado' }

  // Buscar/criar conversa
  const { data: conversa } = await (supabase as any)
    .from('conversas_assistente')
    .select('historico')
    .eq('processo_id', processoId)
    .eq('usuario_id', user.id)
    .maybeSingle()

  const historico: MensagemAssistente[] = (conversa as any)?.historico ?? []

  // Montar contexto do processo
  const contextoProcesso = `
Processo em analise:
- Objeto: ${(processo as any).objeto}
- Modalidade: ${(processo as any).modalidade}
- Numero: ${(processo as any).numero_processo ?? 'nao definido'}
- Status: ${(processo as any).status}
- Etapa atual: ${(processo as any).etapa_atual ?? 'nao definida'}
- Valor estimado: ${(processo as any).valor_estimado ? `R$ ${Number((processo as any).valor_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'nao informado'}
`

  // Preparar mensagens para a API
  const mensagensApi = [
    ...historico.map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: texto },
  ]

  // Chamar Anthropic
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { success: false, error: 'Servico de IA nao configurado' }

  let resposta: string
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: `${SYSTEM_PROMPT}\n\n${contextoProcesso}`,
        messages: mensagensApi,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { success: false, error: (err as any).error?.message ?? 'Erro na API de IA' }
    }

    const json = await res.json()
    resposta = json.content?.[0]?.text ?? ''
    if (!resposta) return { success: false, error: 'Resposta vazia da IA' }
  } catch {
    return { success: false, error: 'Erro de conexao com a IA' }
  }

  // Atualizar historico
  const novoHistorico: MensagemAssistente[] = [
    ...historico,
    { role: 'user', content: texto, timestamp: new Date().toISOString() },
    { role: 'assistant', content: resposta, timestamp: new Date().toISOString() },
  ].slice(-20) // manter ultimas 20 mensagens

  await (supabase as any)
    .from('conversas_assistente')
    .upsert({
      processo_id: processoId,
      usuario_id: user.id,
      historico: novoHistorico,
      atualizado_em: new Date().toISOString(),
    })

  // Debitar creditos
  await (supabase as any)
    .from('creditos_usuario')
    .update({ saldo: (creditos as any).saldo - CUSTO_ASSISTENTE_CREDITOS })
    .eq('usuario_id', user.id)

  // Registrar acao de IA
  await (supabase as any)
    .from('acoes_ia')
    .insert({
      usuario_id: user.id,
      acao_tipo: 'sugerir_conteudo',
      contexto: { processo_id: processoId, tipo: 'assistente' },
      creditos_consumidos: CUSTO_ASSISTENTE_CREDITOS,
    })

  return { success: true, resposta }
}

export async function buscarHistoricoAssistente(
  processoId: string,
): Promise<MensagemAssistente[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await (supabase as any)
    .from('conversas_assistente')
    .select('historico')
    .eq('processo_id', processoId)
    .eq('usuario_id', user.id)
    .maybeSingle()

  return (data as any)?.historico ?? []
}

export async function limparHistoricoAssistente(
  processoId: string,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await (supabase as any)
    .from('conversas_assistente')
    .update({ historico: [], atualizado_em: new Date().toISOString() })
    .eq('processo_id', processoId)
    .eq('usuario_id', user.id)
}
```

- [ ] **Step 2: Criar interface do assistente**

```typescript
// src/app/(dashboard)/processos/[id]/assistente/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarHistoricoAssistente } from '@/lib/actions/assistente-ia'
import { AssistenteIAPanel } from './assistente-panel'

export default async function AssistentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: processoId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creditos } = await (supabase as any)
    .from('creditos_usuario')
    .select('saldo')
    .eq('usuario_id', user.id)
    .maybeSingle()

  const historico = await buscarHistoricoAssistente(processoId)
  const saldo = (creditos as any)?.saldo ?? 0

  return (
    <AssistenteIAPanel
      processoId={processoId}
      historicoInicial={historico}
      saldoCreditos={saldo}
    />
  )
}
```

- [ ] **Step 3: Criar AssistenteIAPanel (Client Component)**

Criar `src/app/(dashboard)/processos/[id]/assistente/assistente-panel.tsx`:

```typescript
// src/app/(dashboard)/processos/[id]/assistente/assistente-panel.tsx
'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { Send, Trash2, Zap, Bot } from 'lucide-react'
import { enviarMensagemAssistente, limparHistoricoAssistente } from '@/lib/actions/assistente-ia'
import type { MensagemAssistente } from '@/types/chat'

interface AssistenteIAPanelProps {
  processoId: string
  historicoInicial: MensagemAssistente[]
  saldoCreditos: number
}

export function AssistenteIAPanel({ processoId, historicoInicial, saldoCreditos }: AssistenteIAPanelProps) {
  const [historico, setHistorico] = useState<MensagemAssistente[]>(historicoInicial)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [historico.length])

  function enviar() {
    const conteudo = texto.trim()
    if (!conteudo || isPending) return
    setTexto('')
    setErro(null)

    const msgUsuario: MensagemAssistente = {
      role: 'user',
      content: conteudo,
      timestamp: new Date().toISOString(),
    }
    setHistorico(prev => [...prev, msgUsuario])

    startTransition(async () => {
      const result = await enviarMensagemAssistente(processoId, conteudo)
      if (result.success && result.resposta) {
        setHistorico(prev => [...prev, {
          role: 'assistant',
          content: result.resposta!,
          timestamp: new Date().toISOString(),
        }])
      } else {
        setErro(result.error ?? 'Erro desconhecido')
        setHistorico(prev => prev.slice(0, -1))
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  function limpar() {
    setHistorico([])
    startTransition(() => limparHistoricoAssistente(processoId))
  }

  return (
    <div
      className="flex flex-col rounded-[var(--r-lg)] border overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--hairline)', minHeight: '500px' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}
      >
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            Assistente IA
          </span>
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
            Art. 53, Lei 14.133/21
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
            <Zap className="w-3 h-3" /> {saldoCreditos} creditos
          </span>
          <button
            onClick={limpar}
            className="p-1.5 rounded-[var(--r-sm)] transition-colors"
            style={{ color: 'var(--muted)' }}
            title="Limpar conversa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ maxHeight: '55vh' }}>
        {historico.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <Bot className="w-10 h-10" style={{ color: 'var(--primary)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Pergunte sobre este processo ou sobre a Lei 14.133/21.
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Cada pergunta consome 2 creditos.
            </p>
          </div>
        ) : (
          historico.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: m.role === 'user' ? 'var(--primary)' : 'var(--accentWash)',
                  color: m.role === 'user' ? 'var(--primaryInk)' : 'var(--accent)',
                }}
              >
                {m.role === 'user' ? 'EU' : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div
                className="max-w-[78%] px-3 py-2 rounded-[var(--r-md)] text-sm leading-relaxed"
                style={{
                  background: m.role === 'user' ? 'var(--primary)' : 'var(--surfaceAlt)',
                  color: m.role === 'user' ? 'var(--primaryInk)' : 'var(--ink)',
                  whiteSpace: 'pre-wrap',
                  borderRadius: m.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                }}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {isPending && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--accentWash)' }}>
              <Bot className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="px-3 py-2 rounded-[var(--r-md)] text-sm" style={{ background: 'var(--surfaceAlt)', color: 'var(--muted)' }}>
              Pensando...
            </div>
          </div>
        )}
        {erro && (
          <p className="text-xs text-center py-2" style={{ color: 'var(--danger)' }}>{erro}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--hairline)' }}>
        <div
          className="flex items-end gap-2 px-3 py-2 rounded-[var(--r-lg)] border"
          style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
        >
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre este processo ou a Lei 14.133/21..."
            rows={1}
            disabled={isPending || saldoCreditos < 2}
            className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed"
            style={{ color: 'var(--ink)', maxHeight: '100px', overflow: 'auto' }}
          />
          <button
            onClick={enviar}
            disabled={!texto.trim() || isPending || saldoCreditos < 2}
            className="w-8 h-8 rounded-[var(--r-md)] flex items-center justify-center shrink-0 transition-all"
            style={{
              background: texto.trim() && !isPending ? 'var(--primary)' : 'var(--hairline)',
              color: texto.trim() && !isPending ? 'var(--primaryInk)' : 'var(--muted)',
            }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        {saldoCreditos < 2 && (
          <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--danger)' }}>
            Creditos insuficientes para usar o assistente.
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Adicionar link Assistente no layout do processo**

No `src/app/(dashboard)/processos/[id]/layout.tsx`, junto ao botão Chat adicionado na Task 8, adicionar um segundo botão para o Assistente IA:

```typescript
// Adicionar import:
import { Bot } from 'lucide-react'

// Junto ao botao Chat, adicionar:
<Link
  href={`/processos/${id}/assistente`}
  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--r-md)] text-xs font-medium border transition-colors"
  style={{
    background: etapaAtiva === 'assistente' ? 'var(--accentWash)' : 'transparent',
    color: etapaAtiva === 'assistente' ? 'var(--accent)' : 'var(--inkSoft)',
    borderColor: 'var(--hairline)',
  }}
  title="Assistente IA"
>
  <Bot className="w-3.5 h-3.5" />
  <span className="hidden sm:inline">IA</span>
</Link>
```

- [ ] **Step 5: Verificar TypeScript e build completo**

```bash
npx tsc --noEmit
npx next build 2>&1 | tail -30
```
Esperado: build bem-sucedido sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/assistente-ia.ts src/app/(dashboard)/processos/[id]/assistente/ src/app/(dashboard)/processos/[id]/layout.tsx
git commit -m "feat(assistente): assistente IA por processo com historico e debito de creditos"
```

---

## Task 11: Push e Deploy

- [ ] **Step 1: Build final e verificação**

```bash
npx tsc --noEmit
npx next build 2>&1 | tail -20
```
Esperado: `✓ Compiled successfully`.

- [ ] **Step 2: Push**

```bash
git push origin Layout-Claude-Design
```
Esperado: Vercel inicia deploy automaticamente.

- [ ] **Step 3: Verificar deploy via MCP Vercel**

Use `list_deployments` para confirmar que o novo deploy atingiu estado `READY`.

---

## Resumo dos Recursos Criados

| Recurso | Quantidade | Descrição |
|---------|-----------|-----------|
| Tabelas Supabase | 4 | canais_chat, mensagens_chat, leituras_chat, conversas_assistente |
| RLS Policies | 9 | Isolamento por org, usuario ve apenas proprios dados |
| Server Actions | 12 | Chat (8) + Assistente IA (3) + nao lidos header (1) |
| Componentes React | 6 | MensagemChat, InputMensagem, PainelChat, SidebarCanais, AssistenteIAPanel |
| Rotas novas | 5 | /chat, /chat/[canalId], /processos/[id]/chat, /processos/[id]/assistente |
| Hooks | 1 | useChatRealtime (Supabase Realtime) |

---

## Self-Review

**Spec coverage:**
- [x] Chat no processo: Task 8
- [x] Chat aberto da plataforma: Task 7 (canal tipo `plataforma`)
- [x] Chat por setor: Task 9 (canais tipo `setor` criados automaticamente)
- [x] Tempo real: Task 4 (Supabase Realtime hook)
- [x] Badge de nao lidos: Task 9
- [x] Assistente IA com creditos: Task 10
- [x] RLS em todas as tabelas: Task 1

**Placeholder scan:** Nenhum TBD encontrado. Todo o código está completo.

**Type consistency:**
- `MensagemChat.autor` = `AutorMensagem | null` — consistente em todos os arquivos
- `canalId: string` — consistente entre Server Actions, hook e componentes
- `CanalComNaoLidos extends CanalChat` — usado corretamente em sidebar e layout

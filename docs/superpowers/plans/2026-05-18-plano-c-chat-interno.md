# Plano C: Chat Interno (3 Modos)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar sistema de chat interno com 3 modos (por processo, por setor, direto entre usuarios), painel flutuante recolhivel no canto inferior direito, fixavel como coluna lateral, com contadores de mensagens nao lidas e RLS por organizacao e papel.

**Architecture:** 3 tabelas Supabase (`mensagens_processo`, `mensagens_setor`, `mensagens_diretas`) com RLS por `organizacao_id` e `papel_usuario`. Componente Client `ChatPanel` flutuante com 3 abas. Realtime do Supabase para mensagens ao vivo. Dependencia: Plano A deve estar aplicado (novos papeis no enum).

**Tech Stack:** Supabase Postgres + Realtime, Next.js 14 Client Components, React, Tailwind CSS, shadcn/ui (Sheet, Badge, Avatar, Tabs)

---

## Mapeamento de Arquivos

| Arquivo | Acao | O que muda |
|---------|------|-----------|
| `supabase/migrations/20260518000005_chat_tabelas.sql` | Criar | 3 tabelas de chat + RLS |
| `src/types/database.ts` | Modificar | Adiciona tipos das mensagens |
| `src/lib/actions/chat.ts` | Criar | Server Actions para envio e busca de mensagens |
| `src/components/chat/chat-panel.tsx` | Criar | Painel flutuante principal (3 abas) |
| `src/components/chat/chat-aba-processo.tsx` | Criar | Aba do chat por processo |
| `src/components/chat/chat-aba-setor.tsx` | Criar | Aba do chat por setor |
| `src/components/chat/chat-aba-direto.tsx` | Criar | Aba de mensagens diretas |
| `src/components/chat/chat-mensagem.tsx` | Criar | Componente de exibicao de uma mensagem |
| `src/components/chat/chat-input.tsx` | Criar | Campo de entrada de mensagem |
| `src/app/(dashboard)/layout.tsx` | Modificar | Adiciona ChatPanel ao layout do dashboard |

---

### Task 1: Migration SQL — tabelas de chat

**Files:**
- Create: `supabase/migrations/20260518000005_chat_tabelas.sql`

- [ ] **Step 1: Criar migration**

```sql
-- supabase/migrations/20260518000005_chat_tabelas.sql
-- ============================================================
-- Chat interno — 3 modos: por processo, por setor, direto
-- Conforme Secao 4 do spec: docs/superpowers/specs/2026-05-18-redesign-perfis-fluxo.md
-- RLS: usuario so ve mensagens da sua organizacao e do seu papel/processo
-- ============================================================

-- ---- Chat do Processo ----
-- Todos os perfis envolvidos em um processo podem ler e escrever
CREATE TABLE mensagens_processo (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id     uuid        NOT NULL REFERENCES processos_licitatorios(id) ON DELETE CASCADE,
  organizacao_id  uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id      uuid        NOT NULL REFERENCES auth.users(id),
  nome_usuario    text        NOT NULL,
  papel_usuario   papel_usuario NOT NULL,
  conteudo        text        NOT NULL CHECK (char_length(conteudo) BETWEEN 1 AND 4000),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensagens_processo_processo ON mensagens_processo(processo_id, created_at DESC);

ALTER TABLE mensagens_processo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg_processo_select" ON mensagens_processo
  FOR SELECT USING (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "msg_processo_insert" ON mensagens_processo
  FOR INSERT WITH CHECK (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
    AND usuario_id = auth.uid()
  );

-- ---- Chat do Setor ----
-- Apenas membros do mesmo setor (mesmo papel) podem ver e escrever
CREATE TABLE mensagens_setor (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  setor           papel_usuario NOT NULL,
  usuario_id      uuid        NOT NULL REFERENCES auth.users(id),
  nome_usuario    text        NOT NULL,
  conteudo        text        NOT NULL CHECK (char_length(conteudo) BETWEEN 1 AND 4000),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensagens_setor_setor ON mensagens_setor(organizacao_id, setor, created_at DESC);

ALTER TABLE mensagens_setor ENABLE ROW LEVEL SECURITY;

-- Cada usuario so ve mensagens do seu proprio setor (papel)
CREATE POLICY "msg_setor_select" ON mensagens_setor
  FOR SELECT USING (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
    AND setor = (SELECT papel FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "msg_setor_insert" ON mensagens_setor
  FOR INSERT WITH CHECK (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
    AND usuario_id = auth.uid()
    AND setor = (SELECT papel FROM usuarios WHERE id = auth.uid())
  );

-- ---- Mensagens Diretas ----
-- Entre dois usuarios quaisquer da mesma prefeitura
-- conversa_id e o menor uuid primeiro (para garantir unicidade do par)
CREATE TABLE mensagens_diretas (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id  uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  de_usuario_id   uuid        NOT NULL REFERENCES auth.users(id),
  para_usuario_id uuid        NOT NULL REFERENCES auth.users(id),
  nome_remetente  text        NOT NULL,
  conteudo        text        NOT NULL CHECK (char_length(conteudo) BETWEEN 1 AND 4000),
  lida            boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT msg_direta_diferentes_usuarios CHECK (de_usuario_id <> para_usuario_id)
);

CREATE INDEX idx_mensagens_diretas_conversa ON mensagens_diretas(
  organizacao_id,
  LEAST(de_usuario_id, para_usuario_id),
  GREATEST(de_usuario_id, para_usuario_id),
  created_at DESC
);

ALTER TABLE mensagens_diretas ENABLE ROW LEVEL SECURITY;

-- Usuario ve apenas mensagens onde e remetente ou destinatario
CREATE POLICY "msg_direta_select" ON mensagens_diretas
  FOR SELECT USING (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
    AND (de_usuario_id = auth.uid() OR para_usuario_id = auth.uid())
  );

CREATE POLICY "msg_direta_insert" ON mensagens_diretas
  FOR INSERT WITH CHECK (
    organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
    AND de_usuario_id = auth.uid()
  );

-- Destinatario pode marcar como lida
CREATE POLICY "msg_direta_update" ON mensagens_diretas
  FOR UPDATE USING (para_usuario_id = auth.uid())
  WITH CHECK (para_usuario_id = auth.uid());
```

- [ ] **Step 2: Verificar arquivo**

```bash
cat supabase/migrations/20260518000005_chat_tabelas.sql
```

Expected: SQL sem erros de sintaxe visual.

- [ ] **Step 3: Commitar**

```bash
git add supabase/migrations/20260518000005_chat_tabelas.sql
git commit -m "feat(db): cria tabelas de chat mensagens_processo, mensagens_setor, mensagens_diretas"
```

---

### Task 2: Tipos TypeScript para o chat

**Files:**
- Modify: `src/types/database.ts`

- [ ] **Step 1: Adicionar tipos ao final de `src/types/database.ts`**

```typescript
export interface MensagemProcessoRow {
  id: string
  processo_id: string
  organizacao_id: string
  usuario_id: string
  nome_usuario: string
  papel_usuario: PapelUsuario
  conteudo: string
  created_at: string
}

export interface MensagemSetorRow {
  id: string
  organizacao_id: string
  setor: PapelUsuario
  usuario_id: string
  nome_usuario: string
  conteudo: string
  created_at: string
}

export interface MensagemDiretaRow {
  id: string
  organizacao_id: string
  de_usuario_id: string
  para_usuario_id: string
  nome_remetente: string
  conteudo: string
  lida: boolean
  created_at: string
}

export interface UsuarioListagemRow {
  id: string
  nome_completo: string
  papel: PapelUsuario
  cargo: string | null
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero erros.

- [ ] **Step 3: Commitar**

```bash
git add src/types/database.ts
git commit -m "feat(types): adiciona tipos de mensagens do chat"
```

---

### Task 3: Server Actions do chat

**Files:**
- Create: `src/lib/actions/chat.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface ResultadoChat {
  success: boolean
  error?: string
}

async function obterUsuarioChat() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, papel, organizacao_id, nome_completo')
    .eq('id', user.id)
    .maybeSingle()
  return usuario as { id: string; papel: string; organizacao_id: string; nome_completo: string } | null
}

/** Envia mensagem no chat do processo. */
export async function enviarMensagemProcesso(
  processoId: string,
  conteudo: string
): Promise<ResultadoChat> {
  if (!conteudo.trim()) return { success: false, error: 'Mensagem nao pode ser vazia.' }
  const supabase = await createClient()
  const usuario = await obterUsuarioChat()
  if (!usuario) return { success: false, error: 'Nao autenticado.' }

  const { error } = await (supabase as any).from('mensagens_processo').insert({
    processo_id: processoId,
    organizacao_id: usuario.organizacao_id,
    usuario_id: usuario.id,
    nome_usuario: usuario.nome_completo,
    papel_usuario: usuario.papel,
    conteudo: conteudo.trim(),
  })

  if (error) return { success: false, error: error.message }
  revalidatePath(`/processos/${processoId}`)
  return { success: true }
}

/** Busca historico de mensagens do chat de um processo. */
export async function buscarMensagensProcesso(processoId: string) {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('mensagens_processo')
    .select('*')
    .eq('processo_id', processoId)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

/** Envia mensagem no chat do setor (visivel apenas para o mesmo papel). */
export async function enviarMensagemSetor(
  conteudo: string
): Promise<ResultadoChat> {
  if (!conteudo.trim()) return { success: false, error: 'Mensagem nao pode ser vazia.' }
  const supabase = await createClient()
  const usuario = await obterUsuarioChat()
  if (!usuario) return { success: false, error: 'Nao autenticado.' }

  const { error } = await (supabase as any).from('mensagens_setor').insert({
    organizacao_id: usuario.organizacao_id,
    setor: usuario.papel,
    usuario_id: usuario.id,
    nome_usuario: usuario.nome_completo,
    conteudo: conteudo.trim(),
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/** Busca historico de mensagens do setor do usuario logado. */
export async function buscarMensagensSetor() {
  const supabase = await createClient()
  const usuario = await obterUsuarioChat()
  if (!usuario) return { data: null, error: 'Nao autenticado.' }

  const { data, error } = await (supabase as any)
    .from('mensagens_setor')
    .select('*')
    .eq('organizacao_id', usuario.organizacao_id)
    .eq('setor', usuario.papel)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

/** Envia mensagem direta para outro usuario da mesma prefeitura. */
export async function enviarMensagemDireta(
  paraUsuarioId: string,
  conteudo: string
): Promise<ResultadoChat> {
  if (!conteudo.trim()) return { success: false, error: 'Mensagem nao pode ser vazia.' }
  const supabase = await createClient()
  const usuario = await obterUsuarioChat()
  if (!usuario) return { success: false, error: 'Nao autenticado.' }
  if (paraUsuarioId === usuario.id) return { success: false, error: 'Nao pode enviar mensagem para si mesmo.' }

  const { error } = await (supabase as any).from('mensagens_diretas').insert({
    organizacao_id: usuario.organizacao_id,
    de_usuario_id: usuario.id,
    para_usuario_id: paraUsuarioId,
    nome_remetente: usuario.nome_completo,
    conteudo: conteudo.trim(),
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/** Busca historico de mensagens diretas com um usuario especifico. */
export async function buscarMensagensDiretas(paraUsuarioId: string) {
  const supabase = await createClient()
  const usuario = await obterUsuarioChat()
  if (!usuario) return { data: null, error: 'Nao autenticado.' }

  const { data, error } = await (supabase as any)
    .from('mensagens_diretas')
    .select('*')
    .eq('organizacao_id', usuario.organizacao_id)
    .or(`and(de_usuario_id.eq.${usuario.id},para_usuario_id.eq.${paraUsuarioId}),and(de_usuario_id.eq.${paraUsuarioId},para_usuario_id.eq.${usuario.id})`)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

/** Busca lista de usuarios da mesma org para chat direto. */
export async function buscarUsuariosDaOrg() {
  const supabase = await createClient()
  const usuario = await obterUsuarioChat()
  if (!usuario) return { data: null, error: 'Nao autenticado.' }

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome_completo, papel, cargo')
    .eq('organizacao_id', usuario.organizacao_id)
    .eq('ativo', true)
    .neq('id', usuario.id)
    .order('nome_completo')

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

/** Conta mensagens nao lidas por modo. Usado para badges do painel. */
export async function contarNaoLidas(processoId?: string) {
  const supabase = await createClient()
  const usuario = await obterUsuarioChat()
  if (!usuario) return { processo: 0, setor: 0, direto: 0 }

  // Mensagens diretas nao lidas
  const { count: direto } = await (supabase as any)
    .from('mensagens_diretas')
    .select('*', { count: 'exact', head: true })
    .eq('para_usuario_id', usuario.id)
    .eq('lida', false)

  return {
    processo: 0, // Realtime cuida disso no cliente
    setor: 0,    // Realtime cuida disso no cliente
    direto: direto ?? 0,
  }
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "chat" | head -10
```

Expected: zero erros no arquivo novo.

- [ ] **Step 3: Commitar**

```bash
git add src/lib/actions/chat.ts
git commit -m "feat(actions): cria Server Actions do chat (processo, setor, direto)"
```

---

### Task 4: Componente de uma mensagem

**Files:**
- Create: `src/components/chat/chat-mensagem.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LABEL_PAPEL, COR_PAPEL } from '@/lib/permissions'
import type { PapelUsuario } from '@/types/database'

interface ChatMensagemProps {
  nomeUsuario: string
  papelUsuario?: PapelUsuario
  conteudo: string
  createdAt: string
  isProprioUsuario: boolean
}

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function ChatMensagem({
  nomeUsuario,
  papelUsuario,
  conteudo,
  createdAt,
  isProprioUsuario,
}: ChatMensagemProps) {
  const cor = papelUsuario ? COR_PAPEL[papelUsuario] : '#64748B'

  return (
    <div className={`flex gap-2 ${isProprioUsuario ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="w-7 h-7 shrink-0 mt-0.5">
        <AvatarFallback
          style={{ background: cor, color: 'white', fontSize: 10, fontWeight: 700 }}
        >
          {iniciais(nomeUsuario)}
        </AvatarFallback>
      </Avatar>
      <div className={`max-w-[75%] ${isProprioUsuario ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {!isProprioUsuario && (
          <div className="flex items-center gap-1.5 ml-0.5">
            <span className="text-[11px] font-semibold" style={{ color: cor }}>
              {nomeUsuario}
            </span>
            {papelUsuario && (
              <span className="text-[9px] text-muted-foreground">
                {LABEL_PAPEL[papelUsuario]}
              </span>
            )}
          </div>
        )}
        <div
          className="px-3 py-2 rounded-2xl text-[13px] leading-snug"
          style={{
            background: isProprioUsuario ? cor : 'var(--accent)',
            color: isProprioUsuario ? 'white' : 'var(--foreground)',
            borderRadius: isProprioUsuario
              ? '18px 18px 4px 18px'
              : '18px 18px 18px 4px',
          }}
        >
          {conteudo}
        </div>
        <span className="text-[10px] text-muted-foreground mx-1">
          {formatarHora(createdAt)}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commitar**

```bash
git add src/components/chat/chat-mensagem.tsx
git commit -m "feat(ui): cria componente ChatMensagem"
```

---

### Task 5: Campo de entrada do chat

**Files:**
- Create: `src/components/chat/chat-input.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onEnviar: (conteudo: string) => Promise<void>
  placeholder?: string
  desabilitado?: boolean
}

export function ChatInput({ onEnviar, placeholder = 'Digite uma mensagem...', desabilitado = false }: ChatInputProps) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleEnviar() {
    const conteudo = texto.trim()
    if (!conteudo || enviando) return
    setEnviando(true)
    setTexto('')
    await onEnviar(conteudo)
    setEnviando(false)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  return (
    <div className="flex gap-2 items-end p-2 border-t bg-background">
      <Textarea
        ref={textareaRef}
        value={texto}
        onChange={e => setTexto(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={desabilitado || enviando}
        rows={1}
        className="resize-none min-h-[36px] max-h-[120px] text-sm"
        style={{ fieldSizing: 'content' } as React.CSSProperties}
        aria-label="Campo de mensagem"
      />
      <Button
        size="icon"
        onClick={handleEnviar}
        disabled={!texto.trim() || enviando || desabilitado}
        aria-label="Enviar mensagem"
        className="shrink-0 h-9 w-9"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commitar**

```bash
git add src/components/chat/chat-input.tsx
git commit -m "feat(ui): cria componente ChatInput com Enter para enviar"
```

---

### Task 6: Aba Chat do Processo

**Files:**
- Create: `src/components/chat/chat-aba-processo.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMensagem } from './chat-mensagem'
import { ChatInput } from './chat-input'
import { enviarMensagemProcesso, buscarMensagensProcesso } from '@/lib/actions/chat'
import { toast } from 'sonner'
import type { MensagemProcessoRow } from '@/types/database'

interface ChatAbaProcessoProps {
  processoId: string
  usuarioId: string
}

export function ChatAbaProcesso({ processoId, usuarioId }: ChatAbaProcessoProps) {
  const [mensagens, setMensagens] = useState<MensagemProcessoRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    buscarMensagensProcesso(processoId)
      .then(({ data }) => { if (data) setMensagens(data) })
      .finally(() => setCarregando(false))

    // Realtime: escuta novas mensagens neste processo
    const supabase = createClient()
    const channel = supabase
      .channel(`mensagens_processo:${processoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_processo', filter: `processo_id=eq.${processoId}` },
        payload => setMensagens(prev => [...prev, payload.new as MensagemProcessoRow])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [processoId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function handleEnviar(conteudo: string) {
    const { error } = await enviarMensagemProcesso(processoId, conteudo)
    if (error) toast.error(error)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {carregando && <div className="text-xs text-muted-foreground text-center">Carregando...</div>}
        {!carregando && mensagens.length === 0 && (
          <div className="text-xs text-muted-foreground text-center mt-4">
            Nenhuma mensagem ainda. Inicie a conversa!
          </div>
        )}
        {mensagens.map(m => (
          <ChatMensagem
            key={m.id}
            nomeUsuario={m.nome_usuario}
            papelUsuario={m.papel_usuario}
            conteudo={m.conteudo}
            createdAt={m.created_at}
            isProprioUsuario={m.usuario_id === usuarioId}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <ChatInput onEnviar={handleEnviar} placeholder="Mensagem no processo..." />
    </div>
  )
}
```

- [ ] **Step 2: Commitar**

```bash
git add src/components/chat/chat-aba-processo.tsx
git commit -m "feat(ui): cria ChatAbaProcesso com Realtime Supabase"
```

---

### Task 7: Aba Chat do Setor

**Files:**
- Create: `src/components/chat/chat-aba-setor.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMensagem } from './chat-mensagem'
import { ChatInput } from './chat-input'
import { enviarMensagemSetor, buscarMensagensSetor } from '@/lib/actions/chat'
import { toast } from 'sonner'
import type { MensagemSetorRow, PapelUsuario } from '@/types/database'
import { LABEL_PAPEL, COR_PAPEL } from '@/lib/permissions'

interface ChatAbaSetorProps {
  usuarioId: string
  papelUsuario: PapelUsuario
  organizacaoId: string
}

export function ChatAbaSetor({ usuarioId, papelUsuario, organizacaoId }: ChatAbaSetorProps) {
  const [mensagens, setMensagens] = useState<MensagemSetorRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    buscarMensagensSetor()
      .then(({ data }) => { if (data) setMensagens(data) })
      .finally(() => setCarregando(false))

    const supabase = createClient()
    const channel = supabase
      .channel(`mensagens_setor:${organizacaoId}:${papelUsuario}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_setor',
          filter: `organizacao_id=eq.${organizacaoId}`,
        },
        payload => {
          const msg = payload.new as MensagemSetorRow
          if (msg.setor === papelUsuario) {
            setMensagens(prev => [...prev, msg])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [organizacaoId, papelUsuario])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function handleEnviar(conteudo: string) {
    const { error } = await enviarMensagemSetor(conteudo)
    if (error) toast.error(error)
  }

  const cor = COR_PAPEL[papelUsuario]

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-3 py-1.5 text-[11px] font-semibold text-white"
        style={{ background: cor }}
      >
        Chat interno — {LABEL_PAPEL[papelUsuario]}
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {carregando && <div className="text-xs text-muted-foreground text-center">Carregando...</div>}
        {!carregando && mensagens.length === 0 && (
          <div className="text-xs text-muted-foreground text-center mt-4">
            Nenhuma mensagem ainda no seu setor.
          </div>
        )}
        {mensagens.map(m => (
          <ChatMensagem
            key={m.id}
            nomeUsuario={m.nome_usuario}
            conteudo={m.conteudo}
            createdAt={m.created_at}
            isProprioUsuario={m.usuario_id === usuarioId}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <ChatInput onEnviar={handleEnviar} placeholder={`Mensagem para ${LABEL_PAPEL[papelUsuario]}...`} />
    </div>
  )
}
```

- [ ] **Step 2: Commitar**

```bash
git add src/components/chat/chat-aba-setor.tsx
git commit -m "feat(ui): cria ChatAbaSetor com Realtime e cor por papel"
```

---

### Task 8: Aba Mensagens Diretas

**Files:**
- Create: `src/components/chat/chat-aba-direto.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMensagem } from './chat-mensagem'
import { ChatInput } from './chat-input'
import { enviarMensagemDireta, buscarMensagensDiretas, buscarUsuariosDaOrg } from '@/lib/actions/chat'
import { toast } from 'sonner'
import type { MensagemDiretaRow, UsuarioListagemRow } from '@/types/database'
import { LABEL_PAPEL } from '@/lib/permissions'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ChevronLeft } from 'lucide-react'

interface ChatAbaDiretoProps {
  usuarioId: string
  organizacaoId: string
}

function iniciais(nome: string) {
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

export function ChatAbaDireto({ usuarioId, organizacaoId }: ChatAbaDiretoProps) {
  const [usuarios, setUsuarios] = useState<UsuarioListagemRow[]>([])
  const [selecionado, setSelecionado] = useState<UsuarioListagemRow | null>(null)
  const [mensagens, setMensagens] = useState<MensagemDiretaRow[]>([])
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(true)
  const [carregandoMsgs, setCarregandoMsgs] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    buscarUsuariosDaOrg()
      .then(({ data }) => { if (data) setUsuarios(data as UsuarioListagemRow[]) })
      .finally(() => setCarregandoUsuarios(false))
  }, [])

  useEffect(() => {
    if (!selecionado) return
    setCarregandoMsgs(true)
    buscarMensagensDiretas(selecionado.id)
      .then(({ data }) => { if (data) setMensagens(data) })
      .finally(() => setCarregandoMsgs(false))

    const supabase = createClient()
    const channel = supabase
      .channel(`mensagens_diretas:${usuarioId}:${selecionado.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_diretas',
          filter: `organizacao_id=eq.${organizacaoId}`,
        },
        payload => {
          const msg = payload.new as MensagemDiretaRow
          const relevante =
            (msg.de_usuario_id === usuarioId && msg.para_usuario_id === selecionado.id) ||
            (msg.de_usuario_id === selecionado.id && msg.para_usuario_id === usuarioId)
          if (relevante) setMensagens(prev => [...prev, msg])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selecionado, usuarioId, organizacaoId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function handleEnviar(conteudo: string) {
    if (!selecionado) return
    const { error } = await enviarMensagemDireta(selecionado.id, conteudo)
    if (error) toast.error(error)
  }

  if (!selecionado) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b">
          Escolha com quem conversar
        </div>
        <div className="flex-1 overflow-y-auto">
          {carregandoUsuarios && (
            <div className="text-xs text-muted-foreground text-center p-4">Carregando...</div>
          )}
          {usuarios.map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => setSelecionado(u)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-accent text-left transition-colors"
            >
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="text-[10px] font-bold">
                  {iniciais(u.nome_completo)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{u.nome_completo}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {LABEL_PAPEL[u.papel]}
                  {u.cargo ? ` — ${u.cargo}` : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <button
          type="button"
          onClick={() => { setSelecionado(null); setMensagens([]) }}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Voltar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <Avatar className="w-6 h-6">
          <AvatarFallback className="text-[9px]">{iniciais(selecionado.nome_completo)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{selecionado.nome_completo}</div>
          <div className="text-[10px] text-muted-foreground">{LABEL_PAPEL[selecionado.papel]}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {carregandoMsgs && <div className="text-xs text-muted-foreground text-center">Carregando...</div>}
        {!carregandoMsgs && mensagens.length === 0 && (
          <div className="text-xs text-muted-foreground text-center mt-4">
            Nenhuma mensagem ainda. Diga ola!
          </div>
        )}
        {mensagens.map(m => (
          <ChatMensagem
            key={m.id}
            nomeUsuario={m.nome_remetente}
            conteudo={m.conteudo}
            createdAt={m.created_at}
            isProprioUsuario={m.de_usuario_id === usuarioId}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <ChatInput onEnviar={handleEnviar} placeholder={`Mensagem para ${selecionado.nome_completo}...`} />
    </div>
  )
}
```

- [ ] **Step 2: Commitar**

```bash
git add src/components/chat/chat-aba-direto.tsx
git commit -m "feat(ui): cria ChatAbaDireto com lista de usuarios e conversa individual"
```

---

### Task 9: Painel principal do Chat (flutuante + fixavel)

**Files:**
- Create: `src/components/chat/chat-panel.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChatAbaProcesso } from './chat-aba-processo'
import { ChatAbaSetor } from './chat-aba-setor'
import { ChatAbaDireto } from './chat-aba-direto'
import { MessageSquare, X, Minimize2, Maximize2, Pin } from 'lucide-react'
import type { PapelUsuario } from '@/types/database'

interface ChatPanelProps {
  usuarioId: string
  papelUsuario: PapelUsuario
  organizacaoId: string
  processoId?: string
  naoLidasDireto?: number
}

export function ChatPanel({
  usuarioId,
  papelUsuario,
  organizacaoId,
  processoId,
  naoLidasDireto = 0,
}: ChatPanelProps) {
  const [aberto, setAberto] = useState(false)
  const [fixado, setFixado] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<string>(processoId ? 'processo' : 'setor')

  if (fixado) {
    return (
      <div
        className="fixed right-0 top-0 h-screen w-[360px] bg-background border-l shadow-2xl z-40 flex flex-col"
        style={{ transition: 'width 0.2s' }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Chat</span>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setFixado(false)} title="Desfixar">
              <Pin className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setFixado(false); setAberto(false) }} title="Fechar">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <ChatTabsContent
          usuarioId={usuarioId}
          papelUsuario={papelUsuario}
          organizacaoId={organizacaoId}
          processoId={processoId}
          naoLidasDireto={naoLidasDireto}
          abaAtiva={abaAtiva}
          setAbaAtiva={setAbaAtiva}
        />
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {aberto && (
        <div className="bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ width: 360, height: 520 }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Chat</span>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setFixado(true)} title="Fixar na lateral">
                <Pin className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAberto(false)} title="Minimizar">
                <Minimize2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <ChatTabsContent
            usuarioId={usuarioId}
            papelUsuario={papelUsuario}
            organizacaoId={organizacaoId}
            processoId={processoId}
            naoLidasDireto={naoLidasDireto}
            abaAtiva={abaAtiva}
            setAbaAtiva={setAbaAtiva}
          />
        </div>
      )}

      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={() => setAberto(v => !v)}
        aria-label={aberto ? 'Fechar chat' : 'Abrir chat'}
      >
        {aberto ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        {!aberto && naoLidasDireto > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            variant="destructive"
          >
            {naoLidasDireto > 9 ? '9+' : naoLidasDireto}
          </Badge>
        )}
      </Button>
    </div>
  )
}

interface ChatTabsContentProps {
  usuarioId: string
  papelUsuario: PapelUsuario
  organizacaoId: string
  processoId?: string
  naoLidasDireto: number
  abaAtiva: string
  setAbaAtiva: (v: string) => void
}

function ChatTabsContent({
  usuarioId, papelUsuario, organizacaoId, processoId, naoLidasDireto, abaAtiva, setAbaAtiva
}: ChatTabsContentProps) {
  return (
    <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="flex flex-col flex-1 overflow-hidden">
      <TabsList className="mx-2 mt-2 mb-0 grid grid-cols-3 h-8">
        <TabsTrigger value="processo" disabled={!processoId} className="text-[11px]">
          Processo
        </TabsTrigger>
        <TabsTrigger value="setor" className="text-[11px]">
          Setor
        </TabsTrigger>
        <TabsTrigger value="direto" className="text-[11px] relative">
          Direto
          {naoLidasDireto > 0 && (
            <Badge className="ml-1 h-4 px-1 text-[9px]" variant="destructive">
              {naoLidasDireto}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="processo" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex flex-col">
        {processoId ? (
          <ChatAbaProcesso processoId={processoId} usuarioId={usuarioId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
            Abra um processo para usar o chat do processo.
          </div>
        )}
      </TabsContent>

      <TabsContent value="setor" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex flex-col">
        <ChatAbaSetor usuarioId={usuarioId} papelUsuario={papelUsuario} organizacaoId={organizacaoId} />
      </TabsContent>

      <TabsContent value="direto" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex flex-col">
        <ChatAbaDireto usuarioId={usuarioId} organizacaoId={organizacaoId} />
      </TabsContent>
    </Tabs>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "chat" | head -20
```

Expected: zero erros.

- [ ] **Step 3: Commitar**

```bash
git add src/components/chat/chat-panel.tsx
git commit -m "feat(ui): cria ChatPanel flutuante com 3 abas e modo fixado na lateral"
```

---

### Task 10: Integrar ChatPanel no layout do dashboard

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Ler o layout atual do dashboard**

```bash
cat "src/app/(dashboard)/layout.tsx"
```

- [ ] **Step 2: Adicionar ChatPanel ao layout**

No Server Component do layout, buscar o usuario atual e seus dados, depois passar como props para o `ChatPanel`. Como `ChatPanel` e Client Component, a composicao e valida.

Adicionar imports:
```typescript
import { ChatPanel } from '@/components/chat/chat-panel'
import { createClient } from '@/lib/supabase/server'
```

Dentro do corpo do layout (apos buscar o usuario):
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
let usuarioChat = null
if (user) {
  const { data } = await supabase
    .from('usuarios')
    .select('id, papel, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()
  usuarioChat = data
}
```

E no JSX, antes do fechamento do `</body>` ou equivalente:
```typescript
{usuarioChat && (
  <ChatPanel
    usuarioId={usuarioChat.id}
    papelUsuario={usuarioChat.papel}
    organizacaoId={usuarioChat.organizacao_id}
  />
)}
```

- [ ] **Step 3: Verificar tipos e build**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero erros.

- [ ] **Step 4: Commitar**

```bash
git add "src/app/(dashboard)/layout.tsx"
git commit -m "feat(ui): integra ChatPanel flutuante no layout do dashboard"
```

---

### Task 11: Verificacao final

- [ ] **Step 1: Tipos completos**

```bash
npx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 2: Build**

```bash
npm run build 2>&1 | tail -20
```

Expected: build bem-sucedido.

- [ ] **Step 3: Lint**

```bash
npx eslint src/components/chat/ src/lib/actions/chat.ts --ext .ts,.tsx --max-warnings 0
```

Expected: zero warnings.

---

## Notas para o implementador

- O Realtime do Supabase precisa estar habilitado para as 3 tabelas de chat. No painel do Supabase, em Database > Replication, ativar para `mensagens_processo`, `mensagens_setor`, `mensagens_diretas`.
- O `field-sizing: content` no Textarea pode nao ser suportado em todos os browsers — e uma feature nova do CSS. Se causar problema de lint, usar `onInput` para ajustar a altura via JS.
- O `ChatPanel` recebe `processoId` opcionalmente. Quando estiver na pagina de um processo, o layout ou page do processo deve passar o `processoId` correto.
- Para passar `processoId` ao `ChatPanel` a partir das paginas de processo, criar um Context ou usar um prop drilling via layout `[id]`. A abordagem mais simples e um Context Provider em `src/app/(dashboard)/processos/[id]/layout.tsx`.

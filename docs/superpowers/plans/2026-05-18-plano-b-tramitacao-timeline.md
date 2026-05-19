# Plano B: Fluxo de Tramitacao e Linha do Tempo Visual

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o novo fluxo de tramitacao em 6 etapas (Requisitante -> Compras -> Licitacoes -> Procuradoria -> Gestor -> Publicacao), com tabela de historico dedicada e componente de linha do tempo visual horizontal com icones por setor, cores por status, tooltip ao hover e painel lateral ao clicar no setor.

**Architecture:** Nova tabela `tramitacao_historico` (substitui dependencia exclusiva de `versoes_documento` para o fluxo). Server Actions para avanco e devolucao com validacao de papel. Componente Client `ProcessoTimeline` horizontal com estado de hover/click. Dependencia: Plano A deve estar aplicado primeiro (os novos papeis precisam existir no banco).

**Tech Stack:** Supabase Postgres, Next.js 14 Server Actions, React Client Components, Tailwind CSS, shadcn/ui (Tooltip, Sheet)

---

## Mapeamento de Arquivos

| Arquivo | Acao | O que muda |
|---------|------|-----------|
| `supabase/migrations/20260518000003_tramitacao_historico.sql` | Criar | Tabela de historico de tramitacao + RLS |
| `src/types/database.ts` | Modificar | Adiciona `TramitacaoHistoricoRow`, `FaseProcesso` |
| `src/lib/actions/tramitacao-fluxo.ts` | Criar | Server Actions do novo fluxo (avancar, devolver) |
| `src/components/processo/processo-timeline.tsx` | Criar | Componente horizontal com hover/click |
| `src/components/processo/processos-no-setor-sheet.tsx` | Criar | Sheet lateral listando processos de um setor |
| `src/app/(dashboard)/processos/[id]/layout.tsx` | Modificar | Inclui ProcessoTimeline no layout da pagina do processo |

---

### Task 1: Migration — tabela `tramitacao_historico`

**Files:**
- Create: `supabase/migrations/20260518000003_tramitacao_historico.sql`

- [ ] **Step 1: Criar migration**

```sql
-- supabase/migrations/20260518000003_tramitacao_historico.sql
-- ============================================================
-- Historico de tramitacao por processo
-- Registra cada mudanca de fase (avanco e devolucao)
-- Conforme Secao 3 do spec: docs/superpowers/specs/2026-05-18-redesign-perfis-fluxo.md
-- ============================================================

CREATE TABLE tramitacao_historico (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id     uuid          NOT NULL REFERENCES processos_licitatorios(id) ON DELETE CASCADE,
  organizacao_id  uuid          NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id      uuid          NOT NULL REFERENCES auth.users(id),
  nome_usuario    text          NOT NULL,
  de_papel        papel_usuario NOT NULL,
  para_papel      papel_usuario NOT NULL,
  tipo            text          NOT NULL CHECK (tipo IN ('avanco', 'devolucao')),
  motivo          text,
  pendencias      text[],
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- Index para busca por processo (usado na timeline)
CREATE INDEX idx_tramitacao_processo ON tramitacao_historico(processo_id, created_at DESC);

-- Index para busca por setor (usado no painel "processos neste setor")
CREATE INDEX idx_tramitacao_para_papel ON tramitacao_historico(organizacao_id, para_papel);

ALTER TABLE tramitacao_historico ENABLE ROW LEVEL SECURITY;

-- Usuarios da org podem ler o historico dos processos da sua org
CREATE POLICY "tramitacao_select" ON tramitacao_historico
  FOR SELECT USING (
    organizacao_id = (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Apenas o sistema (service role) insere — via Server Action
CREATE POLICY "tramitacao_insert" ON tramitacao_historico
  FOR INSERT WITH CHECK (
    organizacao_id = (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );
```

- [ ] **Step 2: Verificar arquivo**

```bash
cat supabase/migrations/20260518000003_tramitacao_historico.sql
```

Expected: SQL completo sem erros de sintaxe visual.

- [ ] **Step 3: Commitar**

```bash
git add supabase/migrations/20260518000003_tramitacao_historico.sql
git commit -m "feat(db): cria tabela tramitacao_historico para historico de fluxo de processo"
```

---

### Task 2: Adicionar tipos TypeScript para tramitacao

**Files:**
- Modify: `src/types/database.ts`

- [ ] **Step 1: Adicionar tipos ao final do arquivo `src/types/database.ts`**

Adicionar apos o ultimo tipo existente no arquivo:

```typescript
export type FaseProcesso =
  | 'requisitante'
  | 'setor_compras'
  | 'setor_licitacao'
  | 'procurador'
  | 'gestor_publico'
  | 'publicacao'

export type TipoTramitacao = 'avanco' | 'devolucao'

export interface TramitacaoHistoricoRow {
  id: string
  processo_id: string
  organizacao_id: string
  usuario_id: string
  nome_usuario: string
  de_papel: FaseProcesso
  para_papel: FaseProcesso
  tipo: TipoTramitacao
  motivo: string | null
  pendencias: string[] | null
  created_at: string
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
git commit -m "feat(types): adiciona FaseProcesso, TipoTramitacao, TramitacaoHistoricoRow"
```

---

### Task 3: Server Actions do novo fluxo de tramitacao

**Files:**
- Create: `src/lib/actions/tramitacao-fluxo.ts`

Este arquivo implementa as acoes de avanco e devolucao segundo a matriz de retornos do spec:
- Setor de Compras pode devolver para Requisitante
- Setor de Licitacoes pode devolver para Requisitante ou Setor de Compras
- Procuradoria pode devolver para Setor de Licitacoes
- Gestor Publico pode devolver para Setor de Licitacoes

- [ ] **Step 1: Criar o arquivo**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PapelUsuario } from '@/types/database'

interface ResultadoFluxo {
  success: boolean
  error?: string
}

// Mapa: de qual papel pode avançar para qual proximo papel
const PROXIMO_PAPEL: Partial<Record<PapelUsuario, PapelUsuario>> = {
  requisitante:    'setor_compras',
  setor_compras:   'setor_licitacao',
  setor_licitacao: 'procurador',
  procurador:      'gestor_publico',
  gestor_publico:  'publicacao',
}

// Mapa: de qual papel pode devolver e para quais papeis anteriores
const DEVOLUCOES_PERMITIDAS: Partial<Record<PapelUsuario, PapelUsuario[]>> = {
  setor_compras:   ['requisitante'],
  setor_licitacao: ['requisitante', 'setor_compras'],
  procurador:      ['setor_licitacao'],
  gestor_publico:  ['setor_licitacao'],
}

async function obterUsuarioComPapel() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, papel, organizacao_id, nome_completo')
    .eq('id', user.id)
    .maybeSingle()
  return usuario as { id: string; papel: PapelUsuario; organizacao_id: string; nome_completo: string } | null
}

async function registrarHistorico(
  supabase: Awaited<ReturnType<typeof createClient>>,
  processoId: string,
  organizacaoId: string,
  usuarioId: string,
  nomeUsuario: string,
  dePapel: PapelUsuario,
  paraPapel: PapelUsuario,
  tipo: 'avanco' | 'devolucao',
  motivo: string | null,
  pendencias: string[] | null
) {
  await (supabase as any).from('tramitacao_historico').insert({
    processo_id: processoId,
    organizacao_id: organizacaoId,
    usuario_id: usuarioId,
    nome_usuario: nomeUsuario,
    de_papel: dePapel,
    para_papel: paraPapel,
    tipo,
    motivo,
    pendencias,
  })
}

/**
 * Avanca o processo para a proxima fase no fluxo canonico.
 * O papel do usuario logado determina qual e a proxima fase.
 */
export async function avancarFase(
  processoId: string,
  pendencias: string[] = []
): Promise<ResultadoFluxo> {
  const supabase = await createClient()
  const usuario = await obterUsuarioComPapel()
  if (!usuario) return { success: false, error: 'Nao autenticado.' }

  const proximoPapel = PROXIMO_PAPEL[usuario.papel]
  if (!proximoPapel) {
    return { success: false, error: 'Este papel nao pode avancar o processo.' }
  }

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('id, fase_atual, organizacao_id')
    .eq('id', processoId)
    .maybeSingle()

  if (!processo) return { success: false, error: 'Processo nao encontrado.' }
  if (processo.organizacao_id !== usuario.organizacao_id) {
    return { success: false, error: 'Sem permissao para este processo.' }
  }

  const { error } = await (supabase as any)
    .from('processos_licitatorios')
    .update({ fase_atual: proximoPapel, updated_at: new Date().toISOString() })
    .eq('id', processoId)

  if (error) return { success: false, error: error.message }

  await registrarHistorico(
    supabase,
    processoId,
    usuario.organizacao_id,
    usuario.id,
    usuario.nome_completo,
    usuario.papel,
    proximoPapel,
    'avanco',
    null,
    pendencias.length > 0 ? pendencias : null
  )

  // Notifica usuarios do proximo papel
  const { data: destinatarios } = await supabase
    .from('usuarios')
    .select('id')
    .eq('organizacao_id', usuario.organizacao_id)
    .eq('papel', proximoPapel)
    .eq('ativo', true)

  if (destinatarios && destinatarios.length > 0) {
    const notificacoes = destinatarios.map((u: { id: string }) => ({
      usuario_id: u.id,
      organizacao_id: usuario.organizacao_id,
      processo_id: processoId,
      titulo: 'Processo encaminhado para seu setor',
      mensagem: `${usuario.nome_completo} encaminhou o processo para o seu setor.`,
      lida: false,
      link: `/processos/${processoId}`,
    }))
    await (supabase as any).from('notificacoes').insert(notificacoes)
  }

  revalidatePath(`/processos/${processoId}`)
  return { success: true }
}

/**
 * Devolve o processo para uma fase anterior.
 * O motivo e obrigatorio. O para_papel deve estar na lista de devolucoes permitidas
 * para o papel do usuario logado.
 */
export async function devolverFase(
  processoId: string,
  paraPapel: PapelUsuario,
  motivo: string
): Promise<ResultadoFluxo> {
  if (!motivo || motivo.trim().length < 10) {
    return { success: false, error: 'O motivo da devolucao deve ter pelo menos 10 caracteres.' }
  }

  const supabase = await createClient()
  const usuario = await obterUsuarioComPapel()
  if (!usuario) return { success: false, error: 'Nao autenticado.' }

  const devolucoesPermitidas = DEVOLUCOES_PERMITIDAS[usuario.papel]
  if (!devolucoesPermitidas || !devolucoesPermitidas.includes(paraPapel)) {
    return { success: false, error: `O papel ${usuario.papel} nao pode devolver para ${paraPapel}.` }
  }

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('id, fase_atual, organizacao_id')
    .eq('id', processoId)
    .maybeSingle()

  if (!processo) return { success: false, error: 'Processo nao encontrado.' }
  if (processo.organizacao_id !== usuario.organizacao_id) {
    return { success: false, error: 'Sem permissao para este processo.' }
  }

  const { error } = await (supabase as any)
    .from('processos_licitatorios')
    .update({ fase_atual: paraPapel, updated_at: new Date().toISOString() })
    .eq('id', processoId)

  if (error) return { success: false, error: error.message }

  await registrarHistorico(
    supabase,
    processoId,
    usuario.organizacao_id,
    usuario.id,
    usuario.nome_completo,
    usuario.papel,
    paraPapel,
    'devolucao',
    motivo,
    null
  )

  // Notifica usuarios do papel destino
  const { data: destinatarios } = await supabase
    .from('usuarios')
    .select('id')
    .eq('organizacao_id', usuario.organizacao_id)
    .eq('papel', paraPapel)
    .eq('ativo', true)

  if (destinatarios && destinatarios.length > 0) {
    const notificacoes = destinatarios.map((u: { id: string }) => ({
      usuario_id: u.id,
      organizacao_id: usuario.organizacao_id,
      processo_id: processoId,
      titulo: 'Processo devolvido para seu setor',
      mensagem: `${usuario.nome_completo} devolveu o processo com o seguinte motivo: ${motivo}`,
      lida: false,
      link: `/processos/${processoId}`,
    }))
    await (supabase as any).from('notificacoes').insert(notificacoes)
  }

  revalidatePath(`/processos/${processoId}`)
  return { success: true }
}

/**
 * Retorna o historico completo de tramitacao de um processo.
 * Usado para alimentar a linha do tempo.
 */
export async function buscarHistoricoTramitacao(processoId: string) {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('tramitacao_historico')
    .select('*')
    .eq('processo_id', processoId)
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

/**
 * Retorna todos os processos atualmente em determinada fase,
 * para exibicao no painel "processos neste setor" (clique no setor da timeline).
 */
export async function buscarProcessosPorFase(
  fase: PapelUsuario,
  organizacaoId: string
) {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('processos_licitatorios')
    .select('id, numero_processo, objeto, modalidade, updated_at, fase_atual')
    .eq('organizacao_id', organizacaoId)
    .eq('fase_atual', fase)
    .order('updated_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "tramitacao-fluxo" | head -20
```

Expected: zero erros no arquivo recém criado.

- [ ] **Step 3: Commitar**

```bash
git add src/lib/actions/tramitacao-fluxo.ts
git commit -m "feat(actions): cria Server Actions de tramitacao-fluxo (avancar, devolver, buscar historico)"
```

---

### Task 4: Adicionar coluna `fase_atual` ao `processos_licitatorios`

A tabela existente usa `etapa_atual` (numero inteiro). O novo fluxo usa o papel como identificador de fase.

**Files:**
- Create: `supabase/migrations/20260518000004_fase_atual_processo.sql`

- [ ] **Step 1: Criar migration**

```sql
-- supabase/migrations/20260518000004_fase_atual_processo.sql
-- ============================================================
-- Adiciona coluna fase_atual ao processo licitatorio
-- Representa qual papel (setor) esta com o processo no momento
-- ============================================================

ALTER TABLE processos_licitatorios
  ADD COLUMN IF NOT EXISTS fase_atual papel_usuario DEFAULT 'requisitante';

-- Preenche fase_atual nos processos existentes baseado em etapa_atual
UPDATE processos_licitatorios SET fase_atual = CASE
  WHEN etapa_atual <= 1 THEN 'requisitante'::papel_usuario
  WHEN etapa_atual = 2  THEN 'setor_compras'::papel_usuario
  WHEN etapa_atual = 3  THEN 'setor_licitacao'::papel_usuario
  WHEN etapa_atual = 4  THEN 'procurador'::papel_usuario
  WHEN etapa_atual = 5  THEN 'gestor_publico'::papel_usuario
  WHEN etapa_atual >= 6 THEN 'publicacao'::papel_usuario
  ELSE 'requisitante'::papel_usuario
END;

CREATE INDEX IF NOT EXISTS idx_processos_fase_atual
  ON processos_licitatorios(organizacao_id, fase_atual);
```

- [ ] **Step 2: Adicionar `fase_atual` ao tipo `ProcessoLicitatorioRow` em `src/types/database.ts`**

Localizar a interface `ProcessoLicitatorioRow` e adicionar o campo:
```typescript
export interface ProcessoLicitatorioRow {
  id: string
  created_at: string
  updated_at: string
  organizacao_id: string
  numero_processo: string | null
  objeto: string
  modalidade: ModalidadeLicitacao
  valor_estimado: number | null
  status: StatusDocumento
  criado_por: string
  etapa_atual: number
  fase_atual: FaseProcesso  // <-- adicionar esta linha
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero erros.

- [ ] **Step 4: Commitar**

```bash
git add supabase/migrations/20260518000004_fase_atual_processo.sql src/types/database.ts
git commit -m "feat(db): adiciona fase_atual (papel_usuario) a processos_licitatorios"
```

---

### Task 5: Componente `ProcessoTimeline` (horizontal, com hover e clique)

**Files:**
- Create: `src/components/processo/processo-timeline.tsx`

Este componente e Client Component. Recebe o historico de tramitacao e a fase atual, renderiza a timeline horizontal com 6 nos (um por setor), linha conectora colorida, tooltip ao hover e dispara callback ao clicar num setor.

- [ ] **Step 1: Criar o componente**

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import type { TramitacaoHistoricoRow, FaseProcesso } from '@/types/database'
import { LABEL_PAPEL, COR_PAPEL, ICONE_PAPEL, ORDEM_FLUXO } from '@/lib/permissions'

interface ProcessoTimelineProps {
  historico: TramitacaoHistoricoRow[]
  faseAtual: FaseProcesso
  onSetorClick?: (fase: FaseProcesso) => void
  className?: string
}

type StatusEtapa = 'concluido' | 'pendente' | 'em_andamento' | 'aguardando'

function calcularStatusEtapas(
  historico: TramitacaoHistoricoRow[],
  faseAtual: FaseProcesso
): Record<FaseProcesso, StatusEtapa> {
  const indiceAtual = ORDEM_FLUXO.indexOf(faseAtual)
  const resultado = {} as Record<FaseProcesso, StatusEtapa>

  ORDEM_FLUXO.forEach((fase, i) => {
    if (i < indiceAtual) {
      // Verifica se existe pendencia registrada nesta etapa
      const temPendencia = historico.some(
        h => h.de_papel === fase && h.pendencias && h.pendencias.length > 0
      )
      resultado[fase] = temPendencia ? 'pendente' : 'concluido'
    } else if (i === indiceAtual) {
      resultado[fase] = 'em_andamento'
    } else {
      resultado[fase] = 'aguardando'
    }
  })

  return resultado
}

function calcularCorConectora(statusA: StatusEtapa, statusB: StatusEtapa): string {
  if (statusA === 'concluido' && statusB === 'concluido') return '#22C55E'
  if (statusA === 'concluido' && statusB === 'pendente') return '#F59E0B'
  if (statusA === 'concluido' && statusB === 'em_andamento') return '#22C55E'
  if (statusA === 'pendente') return '#F59E0B'
  return '#CBD5E1'
}

function encontrarUltimaEntradaDaFase(
  historico: TramitacaoHistoricoRow[],
  fase: FaseProcesso
): TramitacaoHistoricoRow | null {
  // Procura a ultima vez que o processo chegou a esta fase
  const entradas = historico.filter(h => h.para_papel === fase || h.de_papel === fase)
  return entradas.length > 0 ? entradas[entradas.length - 1] : null
}

function formatarDataHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function ProcessoTimeline({
  historico,
  faseAtual,
  onSetorClick,
  className = '',
}: ProcessoTimelineProps) {
  const [hoveredFase, setHoveredFase] = useState<FaseProcesso | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const statusEtapas = calcularStatusEtapas(historico, faseAtual)

  const COR_STATUS: Record<StatusEtapa, string> = {
    concluido:   '#22C55E',
    pendente:    '#F59E0B',
    em_andamento:'#7C3AED',
    aguardando:  '#CBD5E1',
  }

  const SOMBRA_STATUS: Record<StatusEtapa, string> = {
    concluido:   '0 0 0 3px #22C55E',
    pendente:    '0 0 0 3px #F59E0B',
    em_andamento:'0 0 0 4px #C4B5FD',
    aguardando:  'none',
  }

  function handleMouseEnter(fase: FaseProcesso, e: React.MouseEvent<HTMLButtonElement>) {
    setHoveredFase(fase)
    const rect = e.currentTarget.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (containerRect) {
      setTooltipPos({
        top: rect.bottom - containerRect.top + 8,
        left: rect.left + rect.width / 2 - containerRect.left,
      })
    }
  }

  const tooltipData = hoveredFase ? encontrarUltimaEntradaDaFase(historico, hoveredFase) : null
  const statusHovered = hoveredFase ? statusEtapas[hoveredFase] : null

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Linha horizontal de nos */}
      <div className="flex items-center justify-between px-2 py-4 relative">
        {ORDEM_FLUXO.map((fase, idx) => {
          const status = statusEtapas[fase]
          const isLast = idx === ORDEM_FLUXO.length - 1
          const corNo = COR_STATUS[status]
          const sombra = SOMBRA_STATUS[status]
          const isAtual = fase === faseAtual

          return (
            <div key={fase} className="flex items-center flex-1">
              {/* No (botao clicavel) */}
              <div className="flex flex-col items-center gap-1.5" style={{ minWidth: 64 }}>
                <button
                  type="button"
                  onMouseEnter={e => handleMouseEnter(fase, e)}
                  onMouseLeave={() => setHoveredFase(null)}
                  onClick={() => onSetorClick?.(fase)}
                  title={LABEL_PAPEL[fase]}
                  style={{
                    width: 48, height: 48,
                    borderRadius: '50%',
                    background: corNo,
                    border: '3px solid white',
                    boxShadow: sombra,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: onSetorClick ? 'pointer' : 'default',
                    fontSize: 20,
                    animation: isAtual ? 'pulse-ring 2s infinite' : undefined,
                    opacity: status === 'aguardando' ? 0.5 : 1,
                    transition: 'transform 0.15s',
                  }}
                  onFocus={e => { e.currentTarget.style.transform = 'scale(1.1)' }}
                  onBlur={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  {ICONE_PAPEL[fase]}
                </button>
                <span
                  className="text-[10px] font-bold text-center leading-tight"
                  style={{ color: status === 'aguardando' ? '#94A3B8' : '#1E293B', maxWidth: 64 }}
                >
                  {LABEL_PAPEL[fase]}
                </span>
                {status !== 'aguardando' && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                    style={{
                      background: status === 'concluido' ? '#F0FDF4'
                               : status === 'pendente'   ? '#FFFBEB'
                               : status === 'em_andamento' ? '#F5F3FF' : '#F8FAFC',
                      color: status === 'concluido' ? '#15803D'
                           : status === 'pendente'   ? '#B45309'
                           : status === 'em_andamento' ? '#6D28D9' : '#64748B',
                      border: `1px solid ${status === 'concluido' ? '#86EFAC'
                             : status === 'pendente'   ? '#FCD34D'
                             : status === 'em_andamento' ? '#A78BFA' : '#E2E8F0'}`,
                    }}
                  >
                    {status === 'concluido' ? '✓ Concluido'
                    : status === 'pendente' ? '⚠ Pendencia'
                    : status === 'em_andamento' ? '● Em andamento' : '○ Aguardando'}
                  </span>
                )}
              </div>

              {/* Linha conectora entre nos */}
              {!isLast && (
                <div
                  className="flex-1 h-1 mx-1"
                  style={{
                    background: calcularCorConectora(status, statusEtapas[ORDEM_FLUXO[idx + 1]]),
                    minWidth: 8,
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Tooltip ao hover */}
      {hoveredFase && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translateX(-50%)',
          }}
        >
          <div
            className="rounded-xl shadow-xl p-3"
            style={{
              background: '#1E293B',
              minWidth: 220,
              maxWidth: 300,
            }}
          >
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">
              {LABEL_PAPEL[hoveredFase]}
            </div>
            {statusHovered === 'aguardando' ? (
              <div className="text-[12px] text-slate-400">Aguardando chegada do processo</div>
            ) : tooltipData ? (
              <div className="flex flex-col gap-1.5 text-[12px]">
                <div className="flex gap-2">
                  <span style={{ color: COR_PAPEL[hoveredFase] }}>👤</span>
                  <span className="text-white font-semibold">{tooltipData.nome_usuario}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-400">📅</span>
                  <span className="text-slate-300">{formatarDataHora(tooltipData.created_at)}</span>
                </div>
                {tooltipData.tipo === 'avanco' && (
                  <div className="flex gap-2">
                    <span className="text-yellow-400">➡️</span>
                    <span className="text-slate-300">
                      Enviado para {LABEL_PAPEL[tooltipData.para_papel]}
                    </span>
                  </div>
                )}
                {tooltipData.tipo === 'devolucao' && tooltipData.motivo && (
                  <div className="flex gap-2">
                    <span className="text-red-400">↩</span>
                    <span className="text-red-300">{tooltipData.motivo}</span>
                  </div>
                )}
                {tooltipData.pendencias && tooltipData.pendencias.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-yellow-400">⚠</span>
                    <span className="text-yellow-300">{tooltipData.pendencias.join(', ')}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[12px] text-slate-400">Sem historico disponivel</div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 4px #C4B5FD; }
          50%       { box-shadow: 0 0 0 8px #DDD6FE; }
        }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "processo-timeline" | head -10
```

Expected: zero erros.

- [ ] **Step 3: Commitar**

```bash
git add src/components/processo/processo-timeline.tsx
git commit -m "feat(ui): cria componente ProcessoTimeline horizontal com hover, tooltip e animacao"
```

---

### Task 6: Sheet lateral "Processos neste setor"

Ao clicar em um no da timeline, abre um painel lateral mostrando todos os processos atualmente naquele setor.

**Files:**
- Create: `src/components/processo/processos-no-setor-sheet.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import type { FaseProcesso } from '@/types/database'
import { LABEL_PAPEL, ICONE_PAPEL } from '@/lib/permissions'
import { buscarProcessosPorFase } from '@/lib/actions/tramitacao-fluxo'

interface ProcessoResumido {
  id: string
  numero_processo: string | null
  objeto: string
  modalidade: string
  updated_at: string
  fase_atual: FaseProcesso
}

interface ProcessosNoSetorSheetProps {
  fase: FaseProcesso | null
  organizacaoId: string
  open: boolean
  onClose: () => void
}

export function ProcessosNoSetorSheet({
  fase,
  organizacaoId,
  open,
  onClose,
}: ProcessosNoSetorSheetProps) {
  const [processos, setProcessos] = useState<ProcessoResumido[]>([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!fase || !open) return
    setCarregando(true)
    buscarProcessosPorFase(fase, organizacaoId)
      .then(({ data }) => setProcessos(data ?? []))
      .finally(() => setCarregando(false))
  }, [fase, organizacaoId, open])

  if (!fase) return null

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-[400px] sm:w-[500px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>{ICONE_PAPEL[fase]}</span>
            <span>Processos em {LABEL_PAPEL[fase]}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-3">
          {carregando && (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          )}
          {!carregando && processos.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Nenhum processo neste setor no momento.
            </div>
          )}
          {processos.map(p => (
            <Link
              key={p.id}
              href={`/processos/${p.id}`}
              onClick={onClose}
              className="block rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{p.objeto}</div>
                  {p.numero_processo && (
                    <div className="text-xs text-muted-foreground">{p.numero_processo}</div>
                  )}
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">{p.modalidade}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Atualizado: {new Date(p.updated_at).toLocaleDateString('pt-BR')}
              </div>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "processos-no-setor" | head -10
```

Expected: zero erros.

- [ ] **Step 3: Commitar**

```bash
git add src/components/processo/processos-no-setor-sheet.tsx
git commit -m "feat(ui): cria ProcessosNoSetorSheet (painel lateral com processos por setor)"
```

---

### Task 7: Integrar timeline no layout da pagina do processo

**Files:**
- Modify: `src/app/(dashboard)/processos/[id]/layout.tsx`

O layout do processo ja existe e provavelmente tem um header/breadcrumb. Adicionar a `ProcessoTimeline` acima do conteudo de cada aba.

- [ ] **Step 1: Ler o arquivo de layout existente**

```bash
cat "src/app/(dashboard)/processos/[id]/layout.tsx"
```

- [ ] **Step 2: Adicionar busca do historico e renderizacao da timeline**

Dentro do layout (Server Component), buscar o historico via Supabase direto (nao via Server Action — layouts sao Server Components e podem chamar o cliente Supabase diretamente):

```typescript
// Adicionar imports no topo
import { ProcessoTimeline } from '@/components/processo/processo-timeline'
import { createClient } from '@/lib/supabase/server'

// Dentro do body, antes de {children}, adicionar:
const supabase = await createClient()

const { data: historico } = await supabase
  .from('tramitacao_historico')
  .select('*')
  .eq('processo_id', params.id)
  .order('created_at', { ascending: true })

const { data: processo } = await supabase
  .from('processos_licitatorios')
  .select('fase_atual')
  .eq('id', params.id)
  .maybeSingle()

// No JSX, adicionar antes de {children}:
<ProcessoTimeline
  historico={historico ?? []}
  faseAtual={processo?.fase_atual ?? 'requisitante'}
  className="mb-6"
/>
```

Nota: como `ProcessoTimeline` usa `useState` (Client Component) e o layout e Server Component, a composicao e valida — o layout passa os dados como props.

O `onSetorClick` com Sheet requer um wrapper Client Component intermediario:

- [ ] **Step 3: Criar wrapper Client Component para o Sheet**

Criar `src/components/processo/processo-timeline-with-sheet.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { ProcessoTimeline } from './processo-timeline'
import { ProcessosNoSetorSheet } from './processos-no-setor-sheet'
import type { TramitacaoHistoricoRow, FaseProcesso } from '@/types/database'

interface ProcessoTimelineWithSheetProps {
  historico: TramitacaoHistoricoRow[]
  faseAtual: FaseProcesso
  organizacaoId: string
  className?: string
}

export function ProcessoTimelineWithSheet({
  historico,
  faseAtual,
  organizacaoId,
  className,
}: ProcessoTimelineWithSheetProps) {
  const [setorAberto, setSetorAberto] = useState<FaseProcesso | null>(null)

  return (
    <>
      <ProcessoTimeline
        historico={historico}
        faseAtual={faseAtual}
        onSetorClick={fase => setSetorAberto(fase)}
        className={className}
      />
      <ProcessosNoSetorSheet
        fase={setorAberto}
        organizacaoId={organizacaoId}
        open={!!setorAberto}
        onClose={() => setSetorAberto(null)}
      />
    </>
  )
}
```

- [ ] **Step 4: Usar o wrapper no layout**

No layout do processo, substituir `<ProcessoTimeline ...>` por `<ProcessoTimelineWithSheet ...>` passando tambem `organizacaoId`.

- [ ] **Step 5: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero erros.

- [ ] **Step 6: Commitar**

```bash
git add src/components/processo/processo-timeline-with-sheet.tsx
git add "src/app/(dashboard)/processos/[id]/layout.tsx"
git commit -m "feat(ui): integra ProcessoTimelineWithSheet no layout da pagina do processo"
```

---

### Task 8: Verificacao final

- [ ] **Step 1: Verificacao de tipos completa**

```bash
npx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 2: Build local**

```bash
npm run build 2>&1 | tail -30
```

Expected: build bem-sucedido, sem erros de compilacao.

- [ ] **Step 3: Lint**

```bash
npx eslint src/components/processo/ src/lib/actions/tramitacao-fluxo.ts --ext .ts,.tsx --max-warnings 0
```

Expected: zero warnings ou erros.

---

## Notas para o implementador

- A coluna `fase_atual` no `processos_licitatorios` precisa da migration 00004 aplicada antes de testar o frontend.
- O componente `ProcessoTimeline` usa `@keyframes` injetado via `<style>` inline — funciona no App Router porque e Client Component.
- Se o layout existente em `[id]/layout.tsx` for Server Component (sem `'use client'`), a integracao funciona diretamente. Se for Client Component, buscar o historico via `useEffect` ao inves de `await`.
- A busca em `buscarProcessosPorFase` usa `organizacao_id` do processo — o RLS garante que o usuario so ve processos da sua org.

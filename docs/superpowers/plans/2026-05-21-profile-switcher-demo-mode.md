# Profile Switcher e Modo Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar seletor de papel e modo demo no dropdown do avatar no header, exclusivo para admin_plataforma, removendo a barra de rodape e componentes flutuantes existentes.

**Architecture:** Dois cookies independentes controlam a perspectiva de UI: `licitaia_view_as` (fora do demo) e `licitaia_demo_papel` (dentro do demo, ja existente). O `papelEfetivo` e computado no DashboardLayout a partir dos cookies e passado para os componentes de UI. Server actions continuam usando o papel real do banco para autorizacao.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase Postgres, cookies `next/headers`, shadcn/ui DropdownMenu

---

## Mapa de Arquivos

| Acao | Arquivo | Responsabilidade |
|---|---|---|
| Criar | `src/lib/view-as-session.ts` | CRUD do cookie `licitaia_view_as` |
| Criar | `supabase/migrations/20260521000003_demo_org_seed.sql` | Tabela `configuracoes_plataforma` + org demo seed |
| Modificar | `src/lib/actions/usuario.ts` | 3 novas server actions: simularPapel, clearSimulacao, entrarDemo |
| Modificar | `src/app/(dashboard)/layout.tsx` | Logica `papelEfetivo`, remover DemoSwitcher/DemoBanner/DemoPerfilSwitcher |
| Modificar | `src/components/layout/app-header.tsx` | Secao "Visualizar como" + indicadores no avatar |
| Deletar | `src/components/layout/demo-switcher.tsx` | Substituido pelo dropdown do header |
| Deletar | `src/components/admin/demo-perfil-switcher.tsx` | Substituido pelo dropdown do header |
| Deletar | `src/components/admin/demo-banner.tsx` | Substituido por indicador no dropdown |

---

## Task 1: Criar `view-as-session.ts`

**Files:**
- Create: `src/lib/view-as-session.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// src/lib/view-as-session.ts
'use server'

import { cookies } from 'next/headers'
import type { PapelUsuario } from '@/types/database'

const COOKIE_VIEW_AS = 'licitaia_view_as'

export interface ViewAsSession {
  papel: PapelUsuario | null
}

export async function getViewAsSession(): Promise<ViewAsSession> {
  const cookieStore = await cookies()
  const papel = (cookieStore.get(COOKIE_VIEW_AS)?.value ?? null) as PapelUsuario | null
  return { papel }
}

export async function setViewAs(papel: PapelUsuario): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_VIEW_AS, papel, { path: '/', httpOnly: false, sameSite: 'lax' })
}

export async function clearViewAs(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_VIEW_AS)
}
```

- [ ] **Step 2: Verificar que o arquivo compila**

```powershell
cd "d:\Documentos\Projetos IA\Licita AI\AG-App-Licita--o\AG-App-Licita--o"
npx tsc --noEmit 2>&1 | Select-String -NotMatch "\.next"
```

Esperado: sem erros relacionados a `view-as-session.ts`

- [ ] **Step 3: Commit**

```powershell
git add src/lib/view-as-session.ts
git commit -m "feat(auth): adicionar view-as-session para simulacao de papel por cookie"
```

---

## Task 2: Criar migration SQL da org demo

**Files:**
- Create: `supabase/migrations/20260521000003_demo_org_seed.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/migrations/20260521000003_demo_org_seed.sql
-- Cria tabela de configuracoes da plataforma e semeia org demo

-- Tabela de configuracoes globais da plataforma (chave-valor)
CREATE TABLE IF NOT EXISTS configuracoes_plataforma (
  chave  text PRIMARY KEY,
  valor  text NOT NULL
);

-- RLS: apenas admin_plataforma pode acessar
ALTER TABLE configuracoes_plataforma ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_plataforma_full_access" ON configuracoes_plataforma
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.papel = 'admin_plataforma'
    )
  );

-- Seed idempotente: so insere se o CNPJ demo nao existir ainda
DO $$
DECLARE
  v_org_id uuid;
  v_sec_edu uuid;
  v_sec_sau uuid;
  v_sec_obr uuid;
BEGIN
  -- Verificar se org demo ja existe
  SELECT id INTO v_org_id
  FROM organizacoes
  WHERE cnpj = '00000000000100'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    -- Inserir org demo
    INSERT INTO organizacoes (nome, cnpj, ativa)
    VALUES ('Prefeitura Municipal de Exemplo', '00000000000100', true)
    RETURNING id INTO v_org_id;

    -- Inserir secretarias demo
    INSERT INTO secretarias (organizacao_id, nome, ativa)
    VALUES
      (v_org_id, 'Secretaria Municipal de Educacao', true),
      (v_org_id, 'Secretaria Municipal de Saude', true),
      (v_org_id, 'Secretaria Municipal de Obras', true);
  END IF;

  -- Registrar ou atualizar o org_id demo na tabela de configuracoes
  INSERT INTO configuracoes_plataforma (chave, valor)
  VALUES ('demo_org_id', v_org_id::text)
  ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;
END $$;
```

- [ ] **Step 2: Aplicar a migration via MCP Supabase**

Usar `mcp__claude_ai_Supabase__apply_migration` com o conteudo acima, ou via CLI:

```powershell
npx supabase db push
```

Verificar que a tabela `configuracoes_plataforma` foi criada e a linha `demo_org_id` existe.

- [ ] **Step 3: Verificar no Supabase**

```sql
SELECT * FROM configuracoes_plataforma;
-- Esperado: linha com chave='demo_org_id' e valor=<uuid>

SELECT id, nome, cnpj FROM organizacoes WHERE cnpj = '00000000000100';
-- Esperado: 1 linha com nome 'Prefeitura Municipal de Exemplo'
```

- [ ] **Step 4: Commit**

```powershell
git add supabase/migrations/20260521000003_demo_org_seed.sql
git commit -m "feat(db): criar tabela configuracoes_plataforma e semear org demo"
```

---

## Task 3: Adicionar server actions em `usuario.ts`

**Files:**
- Modify: `src/lib/actions/usuario.ts`

O arquivo atual tem `obterPapelUsuario` e `trocarPapelDemo` (mutacao de DB, legado). Vamos adicionar 3 novas actions e marcar `trocarPapelDemo` como deprecated.

- [ ] **Step 1: Adicionar imports e as 3 novas actions**

Abrir `src/lib/actions/usuario.ts` e substituir o conteudo completo por:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PapelUsuario } from '@/types/database'
import { setViewAs, clearViewAs } from '@/lib/view-as-session'
import { iniciarModoDemo, trocarPapelDemo as trocarPapelDemoSession } from '@/lib/demo-session'

export async function obterPapelUsuario(): Promise<PapelUsuario | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  return (data as { papel: PapelUsuario } | null)?.papel ?? null
}

/** @deprecated Mutacao direta no banco — usar simularPapelAction em vez disso */
export async function trocarPapelDemo(papel: PapelUsuario): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await (supabase as any)
    .from('usuarios')
    .update({ papel })
    .eq('id', user.id)

  revalidatePath('/', 'layout')
}

/**
 * Simula um papel para fins de visualizacao.
 * Fora do modo demo: grava cookie licitaia_view_as.
 * Dentro do modo demo: atualiza o cookie licitaia_demo_papel.
 * O papel real do usuario no banco nao e alterado.
 */
export async function simularPapelAction(papel: PapelUsuario): Promise<void> {
  // Verificar se e admin_plataforma (seguranca: so admin master pode simular)
  const papelReal = await obterPapelUsuario()
  if (papelReal !== 'admin_plataforma') return

  // Determinar se demo esta ativo verificando cookie direto
  const { getDemoSession } = await import('@/lib/demo-session')
  const demoSession = await getDemoSession()

  if (demoSession.ativo) {
    await trocarPapelDemoSession(papel)
  } else {
    await setViewAs(papel)
  }
}

/**
 * Limpa a simulacao de papel fora do modo demo.
 * Dentro do modo demo nao faz nada (use sairModoDemo para sair do demo).
 */
export async function clearSimulacaoAction(): Promise<void> {
  const papelReal = await obterPapelUsuario()
  if (papelReal !== 'admin_plataforma') return
  await clearViewAs()
}

/**
 * Ativa o modo demo carregando a org ficticia do Supabase.
 * Le o demo_org_id da tabela configuracoes_plataforma.
 */
export async function entrarModoDemoAction(): Promise<void> {
  const papelReal = await obterPapelUsuario()
  if (papelReal !== 'admin_plataforma') return

  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('configuracoes_plataforma')
    .select('valor')
    .eq('chave', 'demo_org_id')
    .maybeSingle()

  const orgDemoId = (data as { valor: string } | null)?.valor
  if (!orgDemoId) return

  await clearViewAs()
  await iniciarModoDemo(orgDemoId)
}
```

- [ ] **Step 2: Verificar compilacao**

```powershell
npx tsc --noEmit 2>&1 | Select-String -NotMatch "\.next"
```

Esperado: sem novos erros de tipo.

- [ ] **Step 3: Commit**

```powershell
git add src/lib/actions/usuario.ts
git commit -m "feat(actions): adicionar simularPapel, clearSimulacao e entrarModoDemo actions"
```

---

## Task 4: Atualizar `DashboardLayout`

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Substituir o conteudo do layout**

```typescript
// src/app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/layout/app-header'
import { ChatPanel } from '@/components/chat/chat-panel'
import { obterNotificacoes } from '@/lib/actions/notificacoes'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { seedClausulasPadrao } from '@/lib/actions/clausulas'
import { contarNaoLidas } from '@/lib/actions/chat'
import { getDemoSession, sairModoDemo } from '@/lib/demo-session'
import { getViewAsSession } from '@/lib/view-as-session'
import {
  simularPapelAction,
  clearSimulacaoAction,
  entrarModoDemoAction,
} from '@/lib/actions/usuario'
import type { PapelUsuario } from '@/types/database'
import type { ThemeName } from '@/lib/theme/provider'
import { OrgThemeApplicator } from '@/components/licita/org-theme-applicator'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  seedClausulasPadrao().catch(() => {})

  const demoSession = await getDemoSession()
  const viewAs = await getViewAsSession()

  const [usuarioComOrgRes, creditosRes, { notificacoes, naoLidas }, papelAtual, contagem] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, nome_completo, cargo, organizacao_id, organizacoes(nome, cnpj, brasao_url, tema_padrao)')
      .eq('id', user.id)
      .maybeSingle(),
    (supabase as any).from('creditos_usuario').select('saldo').eq('usuario_id', user.id).maybeSingle(),
    obterNotificacoes(),
    obterPapelUsuario(),
    contarNaoLidas(),
  ])

  const row = usuarioComOrgRes.data as {
    id?: string
    nome_completo?: string
    cargo?: string
    organizacao_id?: string
    organizacoes?: { nome?: string; cnpj?: string; brasao_url?: string; tema_padrao?: string } | null
  } | null
  const usuario = row
  const org = row?.organizacoes ?? null

  // Papel efetivo para renderizacao de UI (nao afeta autorizacoes no servidor)
  const papelEfetivo: PapelUsuario | null = demoSession.ativo
    ? demoSession.papelSimulado
    : viewAs.papel ?? papelAtual

  // isAdminPlataforma usa SEMPRE o papel real do banco
  const isAdminPlataforma = papelAtual === 'admin_plataforma'

  // Papel simulado atualmente (para indicadores no header)
  const papelSimuladoAtual: PapelUsuario | null = demoSession.ativo
    ? demoSession.papelSimulado
    : viewAs.papel ?? null

  const usuarioChat = papelAtual && row?.id && row?.organizacao_id
    ? { id: row.id, papel: papelAtual, organizacao_id: row.organizacao_id }
    : null

  const temaPadraoOrg = (org as any)?.tema_padrao as ThemeName ?? 'petroleo'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <OrgThemeApplicator temaOrg={temaPadraoOrg} />
      <AppHeader
        orgNome={org?.nome ?? 'Prefeitura Municipal'}
        orgCnpj={org?.cnpj ?? ''}
        nomeUsuario={usuario?.nome_completo ?? null}
        cargo={usuario?.cargo ?? null}
        saldoCreditos={(creditosRes.data as any)?.saldo ?? null}
        notificacoes={notificacoes}
        naoLidas={naoLidas}
        papel={papelEfetivo}
        isAdminPlataforma={isAdminPlataforma}
        brasaoUrl={org?.brasao_url ?? null}
        usuarioId={user.id}
        modoDemo={demoSession.ativo}
        papelSimuladoAtual={papelSimuladoAtual}
        onSimularPapel={simularPapelAction}
        onClearSimulacao={clearSimulacaoAction}
        onEntrarDemo={entrarModoDemoAction}
        onSairDemo={sairModoDemo}
      />
      <main
        className="flex-1 max-w-[1400px] mx-auto w-full px-6 md:px-8 lg:px-12 py-10 pb-16"
        style={{ zoom: 'var(--zoom-level, 1)' }}
      >
        {children}
      </main>
      {usuarioChat && (
        <ChatPanel
          usuarioId={usuarioChat.id}
          papelUsuario={usuarioChat.papel}
          organizacaoId={usuarioChat.organizacao_id}
          naoLidasDireto={contagem.direto}
        />
      )}
    </div>
  )
}
```

Nota: `pb-32` foi reduzido para `pb-16` porque o DemoSwitcher (que ocupava o rodape) foi removido.

- [ ] **Step 2: Verificar compilacao**

```powershell
npx tsc --noEmit 2>&1 | Select-String -NotMatch "\.next"
```

Esperado: erros sobre props desconhecidas em `AppHeader` (serao resolvidos na Task 5). Nao deve haver outros erros novos.

- [ ] **Step 3: Commit**

```powershell
git add src/app/(dashboard)/layout.tsx
git commit -m "refactor(layout): calcular papelEfetivo via cookies, remover DemoSwitcher do layout"
```

---

## Task 5: Atualizar `AppHeader`

**Files:**
- Modify: `src/components/layout/app-header.tsx`

Esta e a maior tarefa. O `AppHeader` precisa de novas props e de uma nova secao no dropdown.

- [ ] **Step 1: Adicionar os novos imports**

No topo de `src/components/layout/app-header.tsx`, adicionar apos os imports existentes:

```typescript
import { Eye, PlayCircle, LogIn } from 'lucide-react'
import {
  LABEL_PAPEL,
  ICONE_PAPEL,
  COR_PAPEL,
  ORDEM_FLUXO,
} from '@/lib/permissions'
import type { PapelUsuario } from '@/types/database'
```

- [ ] **Step 2: Atualizar a interface `AppHeaderProps`**

Substituir a interface existente por:

```typescript
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
  naoLidosChat?: number
  usuarioId?: string
  // Novas props para simulacao de papel
  modoDemo?: boolean
  papelSimuladoAtual?: PapelUsuario | null
  onSimularPapel?: (papel: PapelUsuario) => Promise<void>
  onClearSimulacao?: () => Promise<void>
  onEntrarDemo?: () => Promise<void>
  onSairDemo?: () => Promise<void>
}
```

- [ ] **Step 3: Destruturar as novas props no componente**

Na assinatura da funcao `AppHeader`, adicionar as novas props com defaults:

```typescript
export function AppHeader({
  orgNome,
  orgCnpj,
  nomeUsuario,
  cargo,
  saldoCreditos,
  notificacoes = [],
  naoLidas = 0,
  papel = null,
  isAdminPlataforma = false,
  brasaoUrl = null,
  eventosTicker = [],
  tickerCategorias = TICKER_CATEGORIAS_DEFAULT,
  naoLidosChat = 0,
  usuarioId,
  modoDemo = false,
  papelSimuladoAtual = null,
  onSimularPapel,
  onClearSimulacao,
  onEntrarDemo,
  onSairDemo,
}: AppHeaderProps) {
```

- [ ] **Step 4: Adicionar handlers de simulacao (dentro do componente, apos `handleSair`)**

```typescript
  async function handleSimularPapel(p: PapelUsuario) {
    if (onSimularPapel) {
      await onSimularPapel(p)
      router.refresh()
    }
  }

  async function handleClearSimulacao() {
    if (onClearSimulacao) {
      await onClearSimulacao()
      router.refresh()
    }
  }

  async function handleEntrarDemo() {
    if (onEntrarDemo) {
      await onEntrarDemo()
      router.refresh()
    }
  }

  async function handleSairDemo() {
    if (onSairDemo) {
      await onSairDemo()
      router.refresh()
    }
  }
```

- [ ] **Step 5: Atualizar o avatar para mostrar indicador visual**

Localizar o bloco do avatar (div com `w-[34px] h-[34px] rounded-full`) e substituir por:

```tsx
  {/* Avatar + badge de simulacao */}
  <div className="relative">
    <div
      className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[11.5px] font-bold shrink-0 transition-all"
      style={{
        background: papelSimuladoAtual ? COR_PAPEL[papelSimuladoAtual] : 'var(--primary)',
        color: 'var(--primaryInk)',
        boxShadow: papelSimuladoAtual
          ? `0 0 0 2px ${COR_PAPEL[papelSimuladoAtual]}66`
          : undefined,
      }}
    >
      {iniciais}
    </div>
    {papelSimuladoAtual && (
      <span
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
        style={{
          background: modoDemo ? '#F97316' : COR_PAPEL[papelSimuladoAtual],
          border: '1.5px solid var(--surface)',
        }}
        title={modoDemo ? 'Modo Demo ativo' : `Visualizando como ${LABEL_PAPEL[papelSimuladoAtual]}`}
      >
        {modoDemo ? '🏛' : '👁'}
      </span>
    )}
  </div>
```

- [ ] **Step 6: Adicionar secao de simulacao no DropdownMenuContent**

Dentro do `DropdownMenuContent`, logo apos o bloco `isAdminPlataforma` existente e antes do `DropdownMenuSeparator` final (o que precede "Sair"), adicionar:

```tsx
    {/* Secao de simulacao — exclusiva para admin_plataforma */}
    {isAdminPlataforma && (
      <>
        <DropdownMenuSeparator />

        {/* Indicador de simulacao ativa */}
        {papelSimuladoAtual && (
          <div
            className="mx-1 mb-1 px-3 py-2 rounded-[var(--r-sm)] text-[12px]"
            style={{
              background: modoDemo ? '#FFF7ED' : `${COR_PAPEL[papelSimuladoAtual]}10`,
              border: `1px solid ${modoDemo ? '#FED7AA' : `${COR_PAPEL[papelSimuladoAtual]}33`}`,
            }}
          >
            <div className="font-semibold" style={{ color: modoDemo ? '#C2410C' : COR_PAPEL[papelSimuladoAtual] }}>
              {modoDemo ? '🏛 Modo Demo ativo' : `👁 Vendo como ${LABEL_PAPEL[papelSimuladoAtual]}`}
            </div>
            <button
              onClick={modoDemo ? handleSairDemo : handleClearSimulacao}
              className="text-[11px] underline mt-0.5"
              style={{ color: modoDemo ? '#C2410C' : COR_PAPEL[papelSimuladoAtual] }}
            >
              {modoDemo ? 'Sair do Modo Demo' : 'Voltar a visao completa'}
            </button>
          </div>
        )}

        {/* Lista de papeis para simulacao */}
        <div className="px-3 pt-1 pb-0.5">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted">
            Visualizar como
          </p>
        </div>
        {([...ORDEM_FLUXO, 'admin_organizacao'] as PapelUsuario[]).map((p) => {
          const isAtivo = papelSimuladoAtual === p && !modoDemo
          return (
            <DropdownMenuItem
              key={p}
              onClick={() => handleSimularPapel(p)}
              className="gap-2.5 cursor-pointer text-[13px] py-1.5 mx-1 rounded-[var(--r-sm)]"
              style={isAtivo ? { background: `${COR_PAPEL[p]}10`, color: COR_PAPEL[p] } : undefined}
            >
              <span className="text-base leading-none">{ICONE_PAPEL[p]}</span>
              <span>{LABEL_PAPEL[p]}</span>
              {isAtivo && (
                <span className="ml-auto text-[10px] font-semibold" style={{ color: COR_PAPEL[p] }}>
                  ativo
                </span>
              )}
            </DropdownMenuItem>
          )
        })}

        {/* Modo Demo */}
        <DropdownMenuItem
          onClick={modoDemo ? handleSairDemo : handleEntrarDemo}
          className="gap-2.5 cursor-pointer text-[13px] py-1.5 mx-1 mt-0.5 rounded-[var(--r-sm)]"
          style={modoDemo
            ? { background: '#FFF7ED', color: '#C2410C' }
            : { color: 'var(--inkSoft)' }
          }
        >
          <span className="text-base leading-none">🏛</span>
          <span>{modoDemo ? 'Sair do Modo Demo' : 'Prefeitura Demo'}</span>
        </DropdownMenuItem>
      </>
    )}
```

- [ ] **Step 7: Verificar compilacao**

```powershell
npx tsc --noEmit 2>&1 | Select-String -NotMatch "\.next"
```

Esperado: sem erros de tipo.

- [ ] **Step 8: Commit**

```powershell
git add src/components/layout/app-header.tsx
git commit -m "feat(header): adicionar secao Visualizar Como e indicadores de simulacao no avatar"
```

---

## Task 6: Deletar componentes obsoletos

**Files:**
- Delete: `src/components/layout/demo-switcher.tsx`
- Delete: `src/components/admin/demo-perfil-switcher.tsx`
- Delete: `src/components/admin/demo-banner.tsx`

- [ ] **Step 1: Verificar que nenhum outro arquivo importa esses componentes**

```powershell
Select-String -Path "src/**/*.tsx","src/**/*.ts" -Pattern "demo-switcher|DemoSwitcher|demo-perfil-switcher|DemoPerfilSwitcher|demo-banner|DemoBanner" -Recurse
```

Esperado: zero resultados (o layout.tsx ja foi atualizado na Task 4).

Se houver resultados: remover os imports e usos antes de deletar os arquivos.

- [ ] **Step 2: Deletar os arquivos**

```powershell
Remove-Item "src/components/layout/demo-switcher.tsx"
Remove-Item "src/components/admin/demo-perfil-switcher.tsx"
Remove-Item "src/components/admin/demo-banner.tsx"
```

- [ ] **Step 3: Verificar compilacao final**

```powershell
npx tsc --noEmit 2>&1 | Select-String -NotMatch "\.next"
```

Esperado: zero erros.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "chore: remover DemoSwitcher, DemoPerfilSwitcher e DemoBanner obsoletos"
```

---

## Task 7: Verificacao final e build

**Files:** nenhum arquivo novo

- [ ] **Step 1: TypeScript strict check**

```powershell
npx tsc --noEmit 2>&1 | Select-String -NotMatch "\.next"
```

Esperado: sem output (zero erros nos arquivos fonte).

- [ ] **Step 2: Build de producao**

```powershell
npx next build 2>&1 | Select-String -Pattern "error|Error|ERRO" | Select-String -NotMatch "\.next"
```

Esperado: build completo sem erros. Warnings de ESLint sao aceitaveis se nao forem erros de tipo ou logica.

- [ ] **Step 3: Teste manual no browser**

1. Acessar `http://localhost:3000/dashboard` como admin_plataforma
2. Abrir o dropdown do avatar — verificar que a secao "Visualizar como" aparece com os 7 papeis + "Prefeitura Demo"
3. Clicar em "Procurador" — verificar que:
   - Avatar ganha borda roxa + badge `👁`
   - Tabs de navegacao mudam para mostrar apenas "Procuradoria"
   - Dashboard renderiza a view de Procurador
   - O topo do dropdown mostra "Vendo como Procuradoria" em roxo
4. Clicar "Voltar a visao completa" — verificar que volta ao estado normal
5. Clicar "Prefeitura Demo":
   - Verificar que o badge muda para `🏛`
   - Verificar que o org nome no header muda para "Prefeitura Municipal de Exemplo"
   - Dropdown mostra "Modo Demo ativo" em laranja
6. Clicar "Sair do Modo Demo" — volta ao contexto real
7. Confirmar que a barra no rodape nao aparece mais em nenhum cenario

- [ ] **Step 4: Commit final**

```powershell
git add -A
git commit -m "feat(profile-switcher): implementacao completa — simulacao de papel e modo demo no header"
```

---

## Auto-revisao do plano

### 1. Cobertura da spec

| Requisito | Task |
|---|---|
| Cookie `licitaia_view_as` isolado | Task 1 |
| Tabela `configuracoes_plataforma` | Task 2 |
| Org demo no Supabase | Task 2 |
| Server actions: simularPapel, clearSimulacao, entrarDemo | Task 3 |
| `papelEfetivo` no layout | Task 4 |
| `isAdminPlataforma` sempre real | Task 4 |
| Secao "Visualizar como" no dropdown | Task 5 |
| Indicador no avatar (borda + badge) | Task 5 |
| Indicador de simulacao no dropdown | Task 5 |
| Fluxo sair/entrar demo | Task 5 |
| Deletar DemoSwitcher/Banner/Switcher | Task 6 |
| Build passando | Task 7 |

### 2. Consistencia de tipos

- `PapelUsuario` importado de `@/types/database` em todos os arquivos — consistente
- `simularPapelAction(papel: PapelUsuario)` — usado em Task 4 com mesma assinatura definida em Task 3
- `onSimularPapel?: (papel: PapelUsuario) => Promise<void>` — mesma assinatura em interface (Task 5) e prop passada no layout (Task 4)
- `LABEL_PAPEL`, `COR_PAPEL`, `ICONE_PAPEL`, `ORDEM_FLUXO` — todos de `@/lib/permissions`, verificados como existentes no arquivo

### 3. Sem placeholders

Verificado: nenhuma step usa "TBD", "TODO" ou descricao sem codigo.

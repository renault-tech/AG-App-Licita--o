# Plano E: Admin Master — 3 Modos de Atuacao

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar os 3 modos de atuacao do Admin Master: (1) Painel global de gestao de prefeituras, (2) Acesso direto a Cataguases para desenvolvimento/testes, e (3) Modo Demo com prefeitura ficticia isolada, banner laranja, e simulacao dos 8 perfis.

**Architecture:** Nova rota `/admin/painel-master` para o modo global. Organizacao especial `is_cataguases=true` e `is_demo=true` no banco para diferenciar os ambientes. Modo Demo usa Context/Cookie de sessao para simular qual papel esta sendo exibido, sem criar usuarios reais. Dependencia: Plano A (novos papeis no enum) e Plano D (aprovacao de prefeituras) devem estar aplicados.

**Tech Stack:** Next.js 14 App Router (rotas protegidas por papel), Supabase, shadcn/ui (Tabs, Alert, Badge, Sheet), cookies de sessao para estado do modo demo

---

## Mapeamento de Arquivos

| Arquivo | Acao | O que muda |
|---------|------|-----------|
| `supabase/migrations/20260518000007_organizacoes_especiais.sql` | Criar | Adiciona flags `is_cataguases` e `is_demo` em `organizacoes`; cria org demo |
| `src/types/database.ts` | Modificar | Atualiza `OrganizacaoRow` com flags especiais |
| `src/app/(dashboard)/admin/painel-master/page.tsx` | Criar | Dashboard global do Admin Master |
| `src/app/(dashboard)/admin/painel-master/organizacoes/page.tsx` | Criar | Lista e gestao de prefeituras |
| `src/components/admin/ativar-organizacao-dialog.tsx` | Criar | Dialog de ativacao de prefeitura |
| `src/app/(dashboard)/admin/modo-demo/page.tsx` | Criar | Entrada e interface do Modo Demo |
| `src/components/admin/demo-banner.tsx` | Criar | Banner laranja fixo do modo demo |
| `src/components/admin/demo-perfil-switcher.tsx` | Criar | Painel lateral para trocar de perfil no demo |
| `src/lib/actions/admin-master.ts` | Criar | Server Actions do Admin Master |
| `src/lib/demo-session.ts` | Criar | Gerenciamento do estado do modo demo via cookies |
| `src/middleware.ts` | Modificar | Injeta contexto do modo demo quando ativo |

---

### Task 1: Migration — flags nas organizacoes e org demo

**Files:**
- Create: `supabase/migrations/20260518000007_organizacoes_especiais.sql`

- [ ] **Step 1: Criar migration**

```sql
-- supabase/migrations/20260518000007_organizacoes_especiais.sql
-- ============================================================
-- Adiciona flags especiais para organizacoes de sistema
-- is_cataguases: org real usada para desenvolvimento pelo Admin Master
-- is_demo: org ficticia para demonstracao comercial
-- Conforme Secao 6 do spec: docs/superpowers/specs/2026-05-18-redesign-perfis-fluxo.md
-- ============================================================

ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS is_cataguases boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_demo       boolean NOT NULL DEFAULT false;

-- Garante unicidade: apenas uma org pode ser cataguases e uma pode ser demo
CREATE UNIQUE INDEX idx_org_cataguases_unica ON organizacoes(is_cataguases) WHERE is_cataguases = true;
CREATE UNIQUE INDEX idx_org_demo_unica       ON organizacoes(is_demo)       WHERE is_demo = true;

-- Cria a prefeitura demo (se nao existir)
INSERT INTO organizacoes (
  nome, cnpj, municipio, estado, ativo, is_demo,
  cabecalho_institucional
)
SELECT
  'Prefeitura Demo — LicitaIA',
  '00000000000000',
  'Cidade Demo',
  'BR',
  true,
  true,
  'PREFEITURA MUNICIPAL DE CIDADE DEMO — Plataforma LicitaIA Demo'
WHERE NOT EXISTS (
  SELECT 1 FROM organizacoes WHERE is_demo = true
);
```

- [ ] **Step 2: Atualizar `OrganizacaoRow` em `src/types/database.ts`**

```typescript
export interface OrganizacaoRow {
  id: string
  created_at: string
  nome: string
  cnpj: string
  brasao_url: string | null
  cabecalho_institucional: string | null
  rodape_institucional: string | null
  municipio: string
  estado: string
  ativo: boolean
  is_cataguases: boolean  // <-- adicionar
  is_demo: boolean        // <-- adicionar
}
```

- [ ] **Step 3: Commitar**

```bash
git add supabase/migrations/20260518000007_organizacoes_especiais.sql src/types/database.ts
git commit -m "feat(db): adiciona flags is_cataguases e is_demo em organizacoes; cria org demo"
```

---

### Task 2: Server Actions do Admin Master

**Files:**
- Create: `src/lib/actions/admin-master.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface ResultadoAdmin { success: boolean; error?: string }

async function verificarAdminMaster() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, papel, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!usuario || usuario.papel !== 'admin_plataforma') return null
  return usuario as { id: string; papel: string; organizacao_id: string }
}

/** Lista todas as prefeituras cadastradas, com contagem de usuarios. */
export async function listarOrganizacoes() {
  const supabase = await createClient()
  const admin = await verificarAdminMaster()
  if (!admin) return { data: null, error: 'Sem permissao.' }

  const { data, error } = await supabase
    .from('organizacoes')
    .select('id, nome, cnpj, municipio, estado, ativo, is_demo, is_cataguases, created_at')
    .order('nome')

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

/** Ativa uma prefeitura pendente e o Admin de Org dela. */
export async function ativarOrganizacao(organizacaoId: string): Promise<ResultadoAdmin> {
  const supabase = await createClient()
  const admin = await verificarAdminMaster()
  if (!admin) return { success: false, error: 'Sem permissao.' }

  const { error: orgError } = await supabase
    .from('organizacoes')
    .update({ ativo: true })
    .eq('id', organizacaoId)

  if (orgError) return { success: false, error: orgError.message }

  // Ativa o Admin de Org da prefeitura (primeiro admin_organizacao pendente)
  const { data: adminOrg } = await supabase
    .from('usuarios')
    .select('id, nome_completo')
    .eq('organizacao_id', organizacaoId)
    .eq('papel', 'admin_organizacao')
    .eq('status_aprovacao', 'aguardando_aprovacao')
    .order('created_at')
    .limit(1)
    .maybeSingle()

  if (adminOrg) {
    await supabase
      .from('usuarios')
      .update({ status_aprovacao: 'ativo', ativo: true })
      .eq('id', adminOrg.id)

    // Notifica o Admin de Org
    await (supabase as any).from('notificacoes').insert({
      usuario_id: adminOrg.id,
      organizacao_id: organizacaoId,
      titulo: 'Sua prefeitura foi ativada!',
      mensagem: 'Voce ja pode configurar sua prefeitura e convidar usuarios.',
      lida: false,
      link: '/dashboard',
    })
  }

  revalidatePath('/admin/painel-master')
  return { success: true }
}

/** Suspende uma prefeitura (ativo = false para a org). */
export async function suspenderOrganizacao(
  organizacaoId: string,
  motivo: string
): Promise<ResultadoAdmin> {
  if (!motivo.trim()) return { success: false, error: 'Motivo obrigatorio.' }
  const supabase = await createClient()
  const admin = await verificarAdminMaster()
  if (!admin) return { success: false, error: 'Sem permissao.' }

  // Protege org demo e cataguases de suspensao acidental
  const { data: org } = await supabase
    .from('organizacoes')
    .select('is_demo, is_cataguases')
    .eq('id', organizacaoId)
    .maybeSingle()

  if (org?.is_demo || org?.is_cataguases) {
    return { success: false, error: 'Nao e possivel suspender organizacoes de sistema.' }
  }

  const { error } = await supabase
    .from('organizacoes')
    .update({ ativo: false })
    .eq('id', organizacaoId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/painel-master')
  return { success: true }
}

/** Busca metricas globais da plataforma para o painel do Admin Master. */
export async function buscarMetricasGlobais() {
  const supabase = await createClient()
  const admin = await verificarAdminMaster()
  if (!admin) return null

  const [orgsResult, usuariosResult, processosResult] = await Promise.all([
    supabase.from('organizacoes').select('id, ativo', { count: 'exact' }),
    supabase.from('usuarios').select('id, ativo', { count: 'exact' }),
    (supabase as any).from('processos_licitatorios').select('id', { count: 'exact' }),
  ])

  return {
    totalOrgs: orgsResult.count ?? 0,
    orgsAtivas: (orgsResult.data?.filter((o: { ativo: boolean }) => o.ativo).length) ?? 0,
    totalUsuarios: usuariosResult.count ?? 0,
    usuariosAtivos: (usuariosResult.data?.filter((u: { ativo: boolean }) => u.ativo).length) ?? 0,
    totalProcessos: processosResult.count ?? 0,
  }
}

/** Retorna o id da organizacao Cataguases (para acesso direto pelo Admin Master). */
export async function buscarOrgCataguases() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('organizacoes')
    .select('id, nome')
    .eq('is_cataguases', true)
    .maybeSingle()
  return data
}

/** Retorna o id da organizacao Demo. */
export async function buscarOrgDemo() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('organizacoes')
    .select('id, nome')
    .eq('is_demo', true)
    .maybeSingle()
  return data
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "admin-master" | head -10
```

Expected: zero erros.

- [ ] **Step 3: Commitar**

```bash
git add src/lib/actions/admin-master.ts
git commit -m "feat(actions): cria Server Actions do Admin Master (listar orgs, ativar, suspender, metricas)"
```

---

### Task 3: Pagina do Painel Master (global)

**Files:**
- Create: `src/app/(dashboard)/admin/painel-master/page.tsx`

- [ ] **Step 1: Criar a pagina**

```typescript
import { buscarMetricasGlobais, listarOrganizacoes } from '@/lib/actions/admin-master'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AtivarOrganizacaoDialog } from '@/components/admin/ativar-organizacao-dialog'
import { Building2, Users, FileText, Activity, FlaskConical } from 'lucide-react'

export default async function PainelMasterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuario || usuario.papel !== 'admin_plataforma') {
    redirect('/dashboard')
  }

  const [metricas, { data: organizacoes }] = await Promise.all([
    buscarMetricasGlobais(),
    listarOrganizacoes(),
  ])

  const orgsPendentes = organizacoes?.filter(o => !o.ativo && !o.is_demo && !o.is_cataguases) ?? []
  const orgsAtivas = organizacoes?.filter(o => o.ativo && !o.is_demo && !o.is_cataguases) ?? []

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Painel Admin Master</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestao global da plataforma LicitaIA</p>
        </div>
        <Link href="/admin/modo-demo">
          <Button variant="outline" className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50">
            <FlaskConical className="w-4 h-4" />
            Modo Demo
          </Button>
        </Link>
      </div>

      {/* Metricas globais */}
      {metricas && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Prefeituras', valor: metricas.totalOrgs, ativo: metricas.orgsAtivas, icon: Building2 },
            { label: 'Usuarios', valor: metricas.totalUsuarios, ativo: metricas.usuariosAtivos, icon: Users },
            { label: 'Processos', valor: metricas.totalProcessos, ativo: null, icon: FileText },
          ].map(m => (
            <Card key={m.label}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center gap-2">
                  <m.icon className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold">{m.valor}</div>
                {m.ativo !== null && (
                  <div className="text-xs text-muted-foreground">{m.ativo} ativos</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Prefeituras pendentes de ativacao */}
      {orgsPendentes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Aguardando ativacao</h2>
            <Badge variant="destructive">{orgsPendentes.length}</Badge>
          </div>
          <div className="rounded-xl border divide-y">
            {orgsPendentes.map(org => (
              <div key={org.id} className="flex items-center justify-between p-4 gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{org.nome}</div>
                  <div className="text-xs text-muted-foreground">{org.municipio}/{org.estado} — CNPJ: {org.cnpj}</div>
                </div>
                <AtivarOrganizacaoDialog organizacaoId={org.id} nomeOrg={org.nome} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Prefeituras ativas */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Prefeituras ativas ({orgsAtivas.length})</h2>
        <div className="rounded-xl border divide-y">
          {orgsAtivas.map(org => (
            <div key={org.id} className="flex items-center justify-between p-4 gap-4">
              <div className="min-w-0">
                <div className="font-medium text-sm">{org.nome}</div>
                <div className="text-xs text-muted-foreground">{org.municipio}/{org.estado}</div>
              </div>
              <Badge variant="outline" className="text-xs text-green-700 border-green-300">Ativa</Badge>
            </div>
          ))}
          {orgsAtivas.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">Nenhuma prefeitura ativa ainda.</div>
          )}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Commitar**

```bash
git add "src/app/(dashboard)/admin/painel-master/page.tsx"
git commit -m "feat(ui): cria PainelMasterPage com metricas, ativacao e lista de prefeituras"
```

---

### Task 4: Dialog de ativacao de prefeitura

**Files:**
- Create: `src/components/admin/ativar-organizacao-dialog.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ativarOrganizacao, suspenderOrganizacao } from '@/lib/actions/admin-master'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

interface AtivarOrganizacaoDialogProps {
  organizacaoId: string
  nomeOrg: string
  modo?: 'ativar' | 'suspender'
}

export function AtivarOrganizacaoDialog({
  organizacaoId,
  nomeOrg,
  modo = 'ativar',
}: AtivarOrganizacaoDialogProps) {
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [motivo, setMotivo] = useState('')

  async function handleConfirmar() {
    setCarregando(true)
    let resultado
    if (modo === 'ativar') {
      resultado = await ativarOrganizacao(organizacaoId)
    } else {
      resultado = await suspenderOrganizacao(organizacaoId, motivo)
    }

    if (!resultado.success) {
      toast.error(resultado.error ?? 'Erro na operacao.')
    } else {
      toast.success(modo === 'ativar' ? `${nomeOrg} ativada com sucesso!` : `${nomeOrg} suspensa.`)
      setAberto(false)
    }
    setCarregando(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={modo === 'ativar' ? 'default' : 'destructive'}
          className="shrink-0"
        >
          {modo === 'ativar'
            ? <><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Ativar</>
            : <><XCircle className="w-3.5 h-3.5 mr-1.5" /> Suspender</>
          }
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modo === 'ativar' ? `Ativar ${nomeOrg}?` : `Suspender ${nomeOrg}?`}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {modo === 'ativar'
            ? 'A prefeitura e o Admin de Org serao ativados e poderao acessar a plataforma.'
            : 'A prefeitura sera suspensa e todos os seus usuarios perderao acesso.'
          }
        </p>

        {modo === 'suspender' && (
          <div className="space-y-2">
            <Label>Motivo da suspensao (obrigatorio)</Label>
            <Textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ex: Inadimplencia no plano..."
              rows={3}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)} disabled={carregando}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={carregando || (modo === 'suspender' && !motivo.trim())}
            variant={modo === 'suspender' ? 'destructive' : 'default'}
          >
            {carregando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {modo === 'ativar' ? 'Confirmar ativacao' : 'Confirmar suspensao'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commitar**

```bash
git add src/components/admin/ativar-organizacao-dialog.tsx
git commit -m "feat(ui): cria AtivarOrganizacaoDialog para ativar/suspender prefeituras"
```

---

### Task 5: Gerenciamento do estado do Modo Demo

**Files:**
- Create: `src/lib/demo-session.ts`

O modo demo usa um cookie de sessao para registrar qual perfil esta sendo simulado. Nao cria usuarios reais — e apenas uma camada visual que muda o contexto de renderizacao.

- [ ] **Step 1: Criar o arquivo**

```typescript
// src/lib/demo-session.ts
// Gerencia o estado do Modo Demo via cookies de sessao
// O modo demo e exclusivo do Admin Master e nao afeta dados reais

import { cookies } from 'next/headers'
import type { PapelUsuario } from '@/types/database'

const COOKIE_DEMO_ATIVO = 'licitaia_demo_ativo'
const COOKIE_DEMO_PAPEL = 'licitaia_demo_papel'
const COOKIE_DEMO_ORG   = 'licitaia_demo_org_id'

export interface DemoSession {
  ativo: boolean
  papelSimulado: PapelUsuario | null
  orgDemoId: string | null
}

export async function getDemoSession(): Promise<DemoSession> {
  const cookieStore = await cookies()
  const ativo = cookieStore.get(COOKIE_DEMO_ATIVO)?.value === 'true'
  const papelSimulado = (cookieStore.get(COOKIE_DEMO_PAPEL)?.value ?? null) as PapelUsuario | null
  const orgDemoId = cookieStore.get(COOKIE_DEMO_ORG)?.value ?? null
  return { ativo, papelSimulado, orgDemoId }
}

export async function iniciarModoDemo(orgDemoId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_DEMO_ATIVO, 'true', { path: '/', httpOnly: false, sameSite: 'lax' })
  cookieStore.set(COOKIE_DEMO_ORG, orgDemoId, { path: '/', httpOnly: false, sameSite: 'lax' })
  cookieStore.set(COOKIE_DEMO_PAPEL, 'admin_organizacao', { path: '/', httpOnly: false, sameSite: 'lax' })
}

export async function sairModoDemo(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_DEMO_ATIVO)
  cookieStore.delete(COOKIE_DEMO_PAPEL)
  cookieStore.delete(COOKIE_DEMO_ORG)
}

export async function trocarPapelDemo(novoPapel: PapelUsuario): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_DEMO_PAPEL, novoPapel, { path: '/', httpOnly: false, sameSite: 'lax' })
}
```

- [ ] **Step 2: Commitar**

```bash
git add src/lib/demo-session.ts
git commit -m "feat(lib): cria gerenciamento de sessao do Modo Demo via cookies"
```

---

### Task 6: Banner do Modo Demo

**Files:**
- Create: `src/components/admin/demo-banner.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DemoBannerProps {
  papelSimulado: string
  onSair: () => Promise<void>
}

export function DemoBanner({ papelSimulado, onSair }: DemoBannerProps) {
  const router = useRouter()
  const [saindo, setSaindo] = useState(false)

  async function handleSair() {
    setSaindo(true)
    await onSair()
    router.push('/admin/painel-master')
    router.refresh()
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 py-2"
      style={{ background: '#EA580C', color: 'white', minHeight: 44 }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-sm font-bold">
        <FlaskConical className="w-4 h-4" aria-hidden />
        MODO DEMO ATIVO
        <span className="font-normal opacity-80 hidden sm:inline">
          — simulando perfil: {papelSimulado}
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="text-white hover:text-white hover:bg-orange-700 h-7 px-2 gap-1.5"
        onClick={handleSair}
        disabled={saindo}
        aria-label="Sair do modo demo"
      >
        {saindo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
        <span className="text-xs">Sair do Demo</span>
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commitar**

```bash
git add src/components/admin/demo-banner.tsx
git commit -m "feat(ui): cria DemoBanner (faixa laranja fixa do modo demo)"
```

---

### Task 7: Painel de troca de perfil no Modo Demo

**Files:**
- Create: `src/components/admin/demo-perfil-switcher.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LABEL_PAPEL, ICONE_PAPEL, COR_PAPEL, ORDEM_FLUXO } from '@/lib/permissions'
import type { PapelUsuario } from '@/types/database'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'

// Todos os 8 papeis incluindo admin_plataforma e admin_organizacao
const TODOS_PERFIS: PapelUsuario[] = [
  ...ORDEM_FLUXO,
  'admin_organizacao',
  'admin_plataforma',
]

interface DemoPerfilSwitcherProps {
  papelAtual: PapelUsuario
  onTrocar: (novoPapel: PapelUsuario) => Promise<void>
}

export function DemoPerfilSwitcher({ papelAtual, onTrocar }: DemoPerfilSwitcherProps) {
  const router = useRouter()
  const [trocando, setTrocando] = useState<PapelUsuario | null>(null)
  const [aberto, setAberto] = useState(false)

  async function handleTrocar(papel: PapelUsuario) {
    if (papel === papelAtual) return
    setTrocando(papel)
    await onTrocar(papel)
    router.refresh()
    setTrocando(null)
    setAberto(false)
  }

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="fixed bottom-20 right-4 z-50 gap-2 shadow-lg"
          aria-label="Trocar perfil no modo demo"
        >
          <Users className="w-4 h-4" />
          Trocar perfil
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px]">
        <SheetHeader>
          <SheetTitle>Simular perfil</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-1.5">
          {TODOS_PERFIS.map(papel => {
            const isAtual = papel === papelAtual
            const estaTrocando = trocando === papel
            const cor = COR_PAPEL[papel]
            return (
              <button
                key={papel}
                type="button"
                onClick={() => handleTrocar(papel)}
                disabled={isAtual || !!trocando}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                style={{
                  background: isAtual ? `${cor}20` : undefined,
                  border: isAtual ? `2px solid ${cor}` : '2px solid transparent',
                  opacity: trocando && !estaTrocando ? 0.5 : 1,
                }}
              >
                <span className="text-xl">{ICONE_PAPEL[papel]}</span>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: isAtual ? cor : undefined }}
                  >
                    {LABEL_PAPEL[papel]}
                  </div>
                  {isAtual && (
                    <div className="text-[10px] text-muted-foreground">Perfil atual</div>
                  )}
                </div>
                {estaTrocando && (
                  <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            )
          })}
        </div>
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-[11px] text-orange-700">
          Voce esta no Modo Demo. Nenhuma alteracao afeta prefeituras reais.
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Commitar**

```bash
git add src/components/admin/demo-perfil-switcher.tsx
git commit -m "feat(ui): cria DemoPerfilSwitcher — painel para trocar perfil no modo demo"
```

---

### Task 8: Pagina de entrada do Modo Demo

**Files:**
- Create: `src/app/(dashboard)/admin/modo-demo/page.tsx`

- [ ] **Step 1: Criar a pagina**

```typescript
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarOrgDemo } from '@/lib/actions/admin-master'
import { iniciarModoDemo } from '@/lib/demo-session'

// Server Action inline para iniciar o demo
async function entrarModoDemo() {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuario || usuario.papel !== 'admin_plataforma') redirect('/dashboard')

  const orgDemo = await buscarOrgDemo()
  if (!orgDemo) {
    // Org demo nao existe: redireciona com erro
    redirect('/admin/painel-master?erro=org-demo-nao-encontrada')
  }

  await iniciarModoDemo(orgDemo.id)
  redirect('/dashboard')
}

export default async function ModoDemoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuario || usuario.papel !== 'admin_plataforma') redirect('/dashboard')

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
      <div className="text-5xl">🎭</div>
      <h1 className="text-2xl font-bold">Modo Demo</h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Voce vai entrar em uma prefeitura ficticia isolada.
        Nenhuma alteracao feita no modo demo afeta prefeituras reais.
        Voce pode simular os 8 perfis da plataforma para fins de demonstracao comercial.
      </p>
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800 text-left space-y-1">
        <div className="font-semibold">No modo demo voce pode:</div>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>Simular qualquer um dos 8 perfis</li>
          <li>Criar processos e documentos de demonstracao</li>
          <li>Usar todas as funcionalidades da IA</li>
          <li>Mostrar o fluxo completo para potenciais clientes</li>
        </ul>
      </div>
      <form action={entrarModoDemo}>
        <button
          type="submit"
          className="w-full py-3 px-6 rounded-xl font-semibold text-white transition-colors"
          style={{ background: '#EA580C' }}
        >
          Entrar no Modo Demo
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commitar**

```bash
git add "src/app/(dashboard)/admin/modo-demo/page.tsx"
git commit -m "feat(ui): cria pagina de entrada do Modo Demo"
```

---

### Task 9: Integrar Demo no layout do dashboard

O layout do dashboard precisa verificar se o modo demo esta ativo e, se sim, renderizar o `DemoBanner` e o `DemoPerfilSwitcher`.

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Ler o layout atual**

```bash
cat "src/app/(dashboard)/layout.tsx"
```

- [ ] **Step 2: Adicionar verificacao do modo demo**

Importar as funcoes de sessao e os componentes:
```typescript
import { getDemoSession, sairModoDemo, trocarPapelDemo } from '@/lib/demo-session'
import { DemoBanner } from '@/components/admin/demo-banner'
import { DemoPerfilSwitcher } from '@/components/admin/demo-perfil-switcher'
import type { PapelUsuario } from '@/types/database'
```

Dentro do body do layout, antes do conteudo principal:
```typescript
const demoSession = await getDemoSession()

// Server Actions passadas como props para Client Components do demo
async function handleSairDemo() {
  'use server'
  await sairModoDemo()
}

async function handleTrocarPapelDemo(novoPapel: PapelUsuario) {
  'use server'
  await trocarPapelDemo(novoPapel)
}
```

No JSX, adicionar condicionalmente:
```typescript
{demoSession.ativo && demoSession.papelSimulado && (
  <>
    <DemoBanner
      papelSimulado={demoSession.papelSimulado}
      onSair={handleSairDemo}
    />
    <DemoPerfilSwitcher
      papelAtual={demoSession.papelSimulado}
      onTrocar={handleTrocarPapelDemo}
    />
    {/* Adiciona padding-top para compensar o banner fixo */}
    <div style={{ paddingTop: 44 }} />
  </>
)}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero erros.

- [ ] **Step 4: Commitar**

```bash
git add "src/app/(dashboard)/layout.tsx"
git commit -m "feat(ui): integra DemoBanner e DemoPerfilSwitcher no layout do dashboard"
```

---

### Task 10: Verificacao final

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
npx eslint src/components/admin/ src/app/(dashboard)/admin/ src/lib/actions/admin-master.ts src/lib/demo-session.ts --ext .ts,.tsx --max-warnings 0
```

Expected: zero warnings.

---

## Notas para o implementador

- O modo demo usa cookies para estado, nao o banco. O papel simulado e apenas visual — nao muda o `auth.uid()` real. Portanto, as queries Supabase dentro do modo demo ainda rodam com a identidade real do Admin Master (que tem acesso irrestrito). Isso e intencional: o Admin Master precisa de acesso total para que as queries funcionem na org demo.
- Para que o conteudo do dashboard reflita o papel simulado (ex: mostrar apenas as abas do papel simulado), o layout deve passar `papelEfetivo = demoSession.ativo ? demoSession.papelSimulado : usuario.papel` para os componentes que verificam permissoes.
- A org Cataguases (`is_cataguases=true`) precisa ser configurada manualmente no banco apos deploy, ou via migration adicional com o UUID real da org.
- O `COOKIE_DEMO_ATIVO` e lido tanto em Server Components (via `cookies()`) quanto potencialmente em Client Components (nao e `httpOnly`). Isso e necessario para que o `DemoBanner` possa ler o estado sem round-trip.
- O `sairModoDemo` e `trocarPapelDemo` sao chamados de Client Components via props que recebem Server Actions — esse e o padrao correto no Next.js App Router.

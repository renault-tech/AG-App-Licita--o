# Plano D: Login, Cadastro e Validacao em Cadeia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar o login com campo de prefeitura com autocomplete, implementar dois fluxos de cadastro distintos (usuario comum aguarda aprovacao do Admin de Org; Admin de Org cadastra nova prefeitura com autocomplete via API IBGE), e implementar a validacao em cadeia (Admin Master ativa prefeitura, Admin de Org aprova usuario).

**Architecture:** Campo de autocomplete de municipios usando API publica do IBGE (sem backend intermediario). Status `aguardando_aprovacao` nos usuarios novos. Notificacao ao Admin de Org quando usuario pede acesso. Pagina de aprovacao para Admin de Org. Dependencia: Plano A aplicado (novos papeis no enum). A tela de login adiciona autocomplete mas nao exige prefeitura — e opcional (para contexto visual, nao para autenticacao).

**Tech Stack:** Supabase Auth, Next.js 14 Client Components e Server Actions, Zod, react-hook-form, shadcn/ui (Command/Combobox, Select), API IBGE publica (sem chave)

---

## Mapeamento de Arquivos

| Arquivo | Acao | O que muda |
|---------|------|-----------|
| `supabase/migrations/20260518000006_status_usuario.sql` | Criar | Adiciona campo `status_aprovacao` em `usuarios` |
| `src/types/database.ts` | Modificar | Adiciona tipo `StatusAprovacao`, atualiza `UsuarioRow` |
| `src/lib/actions/auth-cadastro.ts` | Criar | Server Actions de cadastro com aprovacao |
| `src/lib/ibge.ts` | Criar | Funcoes para buscar municipios e dados de prefeitura via IBGE |
| `src/app/(auth)/login/page.tsx` | Modificar | Adiciona campo prefeitura com autocomplete (opcional/visual) |
| `src/app/(auth)/cadastro/page.tsx` | Modificar | Dois fluxos: usuario comum e Admin de Org (nova prefeitura) |
| `src/app/(auth)/cadastro/nova-prefeitura/page.tsx` | Criar | Fluxo especifico para Admin de Org cadastrando nova prefeitura |
| `src/app/(dashboard)/configuracoes/usuarios/page.tsx` | Modificar | Adiciona aba "Aprovacoes Pendentes" para Admin de Org |
| `src/lib/actions/aprovacao-usuario.ts` | Criar | Server Actions de aprovacao/recusa pelo Admin de Org |

---

### Task 1: Migration — campo `status_aprovacao` em `usuarios`

**Files:**
- Create: `supabase/migrations/20260518000006_status_usuario.sql`

- [ ] **Step 1: Criar migration**

```sql
-- supabase/migrations/20260518000006_status_usuario.sql
-- ============================================================
-- Adiciona campo de status de aprovacao ao usuario
-- Implementa validacao em cadeia: Admin Master ativa org,
-- Admin de Org aprova usuarios da sua org.
-- Conforme Secao 5 do spec: docs/superpowers/specs/2026-05-18-redesign-perfis-fluxo.md
-- ============================================================

CREATE TYPE status_aprovacao_usuario AS ENUM (
  'aguardando_aprovacao',
  'ativo',
  'recusado',
  'suspenso'
);

-- Adiciona a coluna — usuarios existentes ficam como 'ativo'
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS status_aprovacao status_aprovacao_usuario
  NOT NULL DEFAULT 'ativo';

-- Adiciona campo de papel solicitado (para o admin ver o que o usuario pediu)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS papel_solicitado papel_usuario;

-- Index para busca de usuarios pendentes por org
CREATE INDEX idx_usuarios_status_org
  ON usuarios(organizacao_id, status_aprovacao);

-- Atualiza RLS: usuario ativo pode se ver e ver colegas ativos
-- (a policy base de select ja existia, aqui apenas acrescenta o filtro de status
--  para que usuarios pendentes nao apareçam no sistema antes de aprovados)
-- Nota: as policies existentes usam auth.uid() e organizacao_id.
-- A verificacao de status_aprovacao = 'ativo' e feita na aplicacao,
-- pois o usuario precisa se logar para chegar ao sistema.
-- O Supabase Auth nao bloqueia login de usuarios nao aprovados —
-- a aplicacao deve checar o status e redirecionar para pagina de "aguardando aprovacao".
```

- [ ] **Step 2: Verificar arquivo**

```bash
cat supabase/migrations/20260518000006_status_usuario.sql
```

- [ ] **Step 3: Commitar**

```bash
git add supabase/migrations/20260518000006_status_usuario.sql
git commit -m "feat(db): adiciona status_aprovacao e papel_solicitado em usuarios"
```

---

### Task 2: Atualizar tipos TypeScript

**Files:**
- Modify: `src/types/database.ts`

- [ ] **Step 1: Adicionar o tipo de status e atualizar `UsuarioRow`**

Adicionar o tipo:
```typescript
export type StatusAprovacaoUsuario =
  | 'aguardando_aprovacao'
  | 'ativo'
  | 'recusado'
  | 'suspenso'
```

Atualizar a interface `UsuarioRow` adicionando os novos campos:
```typescript
export interface UsuarioRow {
  id: string
  created_at: string
  organizacao_id: string
  papel: PapelUsuario
  nome_completo: string
  cargo: string | null
  ativo: boolean
  status_aprovacao: StatusAprovacaoUsuario  // <-- adicionar
  papel_solicitado: PapelUsuario | null      // <-- adicionar
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
git commit -m "feat(types): adiciona StatusAprovacaoUsuario e atualiza UsuarioRow"
```

---

### Task 3: Funcoes para API do IBGE

**Files:**
- Create: `src/lib/ibge.ts`

A API IBGE e publica, sem autenticacao, CORS livre. URL base: `https://servicodados.ibge.gov.br/api/v1/`

- [ ] **Step 1: Criar o arquivo**

```typescript
// src/lib/ibge.ts
// Utilitarios para busca de municipios e dados de prefeituras via API do IBGE
// API publica, sem necessidade de chave: https://servicodados.ibge.gov.br/api/v1/

const IBGE_BASE = 'https://servicodados.ibge.gov.br/api/v1'

export interface MunicipioIBGE {
  id: number
  nome: string
  microrregiao: {
    mesorregiao: {
      UF: {
        sigla: string
        nome: string
      }
    }
  }
}

export interface MunicipioSimplificado {
  id: number
  nome: string
  estado: string
  siglaEstado: string
  nomeCompleto: string
}

/** Busca municipios por termo (nome parcial), retorna lista simplificada. */
export async function buscarMunicipios(termo: string): Promise<MunicipioSimplificado[]> {
  if (termo.trim().length < 2) return []

  const res = await fetch(
    `${IBGE_BASE}/localidades/municipios?orderBy=nome`,
    { next: { revalidate: 86400 } } // cache 24h (lista de municipios nao muda)
  )

  if (!res.ok) return []

  const municipios: MunicipioIBGE[] = await res.json()
  const termoLower = termo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  return municipios
    .filter(m => {
      const nomeLower = m.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      return nomeLower.includes(termoLower)
    })
    .slice(0, 10)
    .map(m => ({
      id: m.id,
      nome: m.nome,
      estado: m.microrregiao.mesorregiao.UF.nome,
      siglaEstado: m.microrregiao.mesorregiao.UF.sigla,
      nomeCompleto: `${m.nome} - ${m.microrregiao.mesorregiao.UF.sigla}`,
    }))
}

/** Retorna dados de um municipio especifico pelo codigo IBGE. */
export async function buscarMunicipioPorId(id: number): Promise<MunicipioSimplificado | null> {
  const res = await fetch(
    `${IBGE_BASE}/localidades/municipios/${id}`,
    { next: { revalidate: 86400 } }
  )
  if (!res.ok) return null
  const m: MunicipioIBGE = await res.json()
  return {
    id: m.id,
    nome: m.nome,
    estado: m.microrregiao.mesorregiao.UF.nome,
    siglaEstado: m.microrregiao.mesorregiao.UF.sigla,
    nomeCompleto: `${m.nome} - ${m.microrregiao.mesorregiao.UF.sigla}`,
  }
}

/**
 * Retorna o nome oficial da prefeitura para um municipio.
 * Padrao brasileiro: "Prefeitura Municipal de [Nome]"
 * Excecoes conhecidas (capitais estaduais) usam "Prefeitura de [Nome]".
 */
export function nomePrefeitura(municipio: MunicipioSimplificado): string {
  const capitais = [
    'Sao Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Fortaleza',
    'Curitiba', 'Manaus', 'Recife', 'Porto Alegre', 'Belem',
    'Goiania', 'Florianopolis', 'Maceio', 'Natal', 'Teresina',
    'Campo Grande', 'Joao Pessoa', 'Aracaju', 'Cuiaba', 'Macapa',
    'Porto Velho', 'Rio Branco', 'Boa Vista', 'Palmas',
  ]
  const nomeNorm = municipio.nome.normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (capitais.includes(nomeNorm)) {
    return `Prefeitura de ${municipio.nome}`
  }
  return `Prefeitura Municipal de ${municipio.nome}`
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "ibge" | head -10
```

Expected: zero erros.

- [ ] **Step 3: Commitar**

```bash
git add src/lib/ibge.ts
git commit -m "feat(lib): cria utilitarios de busca de municipios via API IBGE"
```

---

### Task 4: Server Actions de cadastro

**Files:**
- Create: `src/lib/actions/auth-cadastro.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { PapelUsuario } from '@/types/database'

interface ResultadoCadastro {
  success: boolean
  error?: string
}

const SchemaCadastroUsuario = z.object({
  email: z.string().email('E-mail invalido'),
  senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  nomeCompleto: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(200),
  papelSolicitado: z.enum([
    'requisitante', 'setor_compras', 'setor_licitacao', 'procurador',
    'gestor_publico', 'publicacao', 'admin_organizacao',
  ] as const),
  organizacaoId: z.string().uuid('Organizacao invalida'),
})

/**
 * Cadastro de usuario em prefeitura existente.
 * Conta fica com status 'aguardando_aprovacao' ate Admin de Org aprovar.
 */
export async function cadastrarUsuario(
  input: z.infer<typeof SchemaCadastroUsuario>
): Promise<ResultadoCadastro> {
  const parsed = SchemaCadastroUsuario.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  // Verifica se a organizacao existe e esta ativa
  const { data: org } = await supabase
    .from('organizacoes')
    .select('id, ativo')
    .eq('id', parsed.data.organizacaoId)
    .maybeSingle()

  if (!org || !org.ativo) {
    return { success: false, error: 'Prefeitura nao encontrada ou inativa.' }
  }

  // Cria conta no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.senha,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/aguardando-aprovacao`,
    },
  })

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? 'Erro ao criar conta.' }
  }

  // Insere registro na tabela usuarios com status aguardando_aprovacao
  const { error: dbError } = await supabase.from('usuarios').insert({
    id: authData.user.id,
    organizacao_id: parsed.data.organizacaoId,
    nome_completo: parsed.data.nomeCompleto,
    papel: parsed.data.papelSolicitado, // Papel provisorio ate aprovacao
    papel_solicitado: parsed.data.papelSolicitado,
    status_aprovacao: 'aguardando_aprovacao',
    ativo: false,
  })

  if (dbError) {
    return { success: false, error: 'Erro ao registrar usuario. Tente novamente.' }
  }

  // Notifica admins da organizacao
  const { data: admins } = await supabase
    .from('usuarios')
    .select('id')
    .eq('organizacao_id', parsed.data.organizacaoId)
    .eq('papel', 'admin_organizacao')
    .eq('ativo', true)

  if (admins && admins.length > 0) {
    const notifs = admins.map((a: { id: string }) => ({
      usuario_id: a.id,
      organizacao_id: parsed.data.organizacaoId,
      titulo: 'Novo usuario aguardando aprovacao',
      mensagem: `${parsed.data.nomeCompleto} solicitou acesso como ${parsed.data.papelSolicitado}.`,
      lida: false,
      link: '/configuracoes/usuarios',
    }))
    await (supabase as any).from('notificacoes').insert(notifs)
  }

  return { success: true }
}

const SchemaCadastroAdminOrg = z.object({
  email: z.string().email('E-mail invalido'),
  senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  nomeCompleto: z.string().min(3).max(200),
  cargo: z.string().max(200).optional(),
  nomePrefeitura: z.string().min(3).max(300),
  cnpjPrefeitura: z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 digitos'),
  municipio: z.string().min(2).max(200),
  estado: z.string().length(2, 'Sigla do estado deve ter 2 caracteres'),
})

/**
 * Cadastro de Admin de Org ao registrar nova prefeitura.
 * A prefeitura fica com status inativo ate o Admin Master ativar.
 */
export async function cadastrarAdminOrg(
  input: z.infer<typeof SchemaCadastroAdminOrg>
): Promise<ResultadoCadastro> {
  const parsed = SchemaCadastroAdminOrg.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  // Verifica se ja existe prefeitura com esse CNPJ
  const { data: orgExistente } = await supabase
    .from('organizacoes')
    .select('id')
    .eq('cnpj', parsed.data.cnpjPrefeitura)
    .maybeSingle()

  if (orgExistente) {
    return { success: false, error: 'Ja existe uma prefeitura cadastrada com este CNPJ. Entre em contato com o suporte.' }
  }

  // Cria a organizacao com ativo=false (aguarda Admin Master)
  const { data: novaOrg, error: orgError } = await supabase
    .from('organizacoes')
    .insert({
      nome: parsed.data.nomePrefeitura,
      cnpj: parsed.data.cnpjPrefeitura,
      municipio: parsed.data.municipio,
      estado: parsed.data.estado,
      ativo: false,
    })
    .select('id')
    .single()

  if (orgError || !novaOrg) {
    return { success: false, error: 'Erro ao registrar prefeitura.' }
  }

  // Cria conta no Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.senha,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/aguardando-ativacao`,
    },
  })

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? 'Erro ao criar conta.' }
  }

  // Insere o Admin de Org aguardando ativacao da org
  const { error: dbError } = await supabase.from('usuarios').insert({
    id: authData.user.id,
    organizacao_id: novaOrg.id,
    nome_completo: parsed.data.nomeCompleto,
    cargo: parsed.data.cargo ?? null,
    papel: 'admin_organizacao',
    papel_solicitado: 'admin_organizacao',
    status_aprovacao: 'aguardando_aprovacao',
    ativo: false,
  })

  if (dbError) {
    return { success: false, error: 'Erro ao registrar administrador.' }
  }

  // Notifica Admin Plataforma (busca pelo papel admin_plataforma)
  const { data: adminsPlataforma } = await supabase
    .from('usuarios')
    .select('id')
    .eq('papel', 'admin_plataforma')
    .eq('ativo', true)

  if (adminsPlataforma && adminsPlataforma.length > 0) {
    const notifs = adminsPlataforma.map((a: { id: string }) => ({
      usuario_id: a.id,
      titulo: 'Nova prefeitura aguardando ativacao',
      mensagem: `${parsed.data.nomePrefeitura} (${parsed.data.municipio}/${parsed.data.estado}) aguarda ativacao.`,
      lida: false,
      link: '/admin/organizacoes',
    }))
    await (supabase as any).from('notificacoes').insert(notifs)
  }

  return { success: true }
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "auth-cadastro" | head -10
```

Expected: zero erros.

- [ ] **Step 3: Commitar**

```bash
git add src/lib/actions/auth-cadastro.ts
git commit -m "feat(actions): cria Server Actions de cadastro com validacao em cadeia"
```

---

### Task 5: Redesenhar pagina de login

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

O campo de prefeitura no login e visual e opcional — serve para exibir o brasao da prefeitura apos selecao, mas nao e obrigatorio para autenticar.

- [ ] **Step 1: Reescrever o componente**

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, LogIn, Search, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { buscarMunicipios, type MunicipioSimplificado } from '@/lib/ibge'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [termoPrefeitura, setTermoPrefeitura] = useState('')
  const [municipios, setMunicipios] = useState<MunicipioSimplificado[]>([])
  const [municipioSelecionado, setMunicipioSelecionado] = useState<MunicipioSimplificado | null>(null)
  const [buscandoPrefeitura, setBuscandoPrefeitura] = useState(false)
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const erro = searchParams.get('error')
    if (erro === 'link_invalido') {
      toast.error('Link de confirmacao invalido ou expirado.')
    }
  }, [searchParams])

  useEffect(() => {
    if (termoPrefeitura.length < 2) {
      setMunicipios([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setBuscandoPrefeitura(true)
      const resultados = await buscarMunicipios(termoPrefeitura)
      setMunicipios(resultados)
      setMostrarSugestoes(true)
      setBuscandoPrefeitura(false)
    }, 350)
  }, [termoPrefeitura])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        toast.error('Por favor, confirme seu e-mail antes de entrar.')
      } else {
        toast.error('Credenciais invalidas. Verifique e-mail e senha.')
      }
      setCarregando(false)
      return
    }
    toast.success('Login efetuado com sucesso!')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
          Acesso ao Sistema
        </CardTitle>
        <CardDescription>Entre com seu e-mail institucional e senha</CardDescription>
      </CardHeader>

      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          {/* Campo de prefeitura (visual, opcional) */}
          <div className="space-y-2 relative">
            <Label htmlFor="prefeitura">Prefeitura (opcional)</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="prefeitura"
                type="text"
                placeholder="Digite o nome da cidade..."
                value={municipioSelecionado ? `${municipioSelecionado.nome} - ${municipioSelecionado.siglaEstado}` : termoPrefeitura}
                onChange={e => {
                  setMunicipioSelecionado(null)
                  setTermoPrefeitura(e.target.value)
                }}
                onFocus={() => setMostrarSugestoes(municipios.length > 0)}
                className="pl-8"
                autoComplete="off"
              />
              {buscandoPrefeitura && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {mostrarSugestoes && municipios.length > 0 && !municipioSelecionado && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {municipios.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-sm text-left"
                    onClick={() => {
                      setMunicipioSelecionado(m)
                      setMostrarSugestoes(false)
                      setTermoPrefeitura('')
                    }}
                  >
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{m.nome}</span>
                    <span className="text-muted-foreground ml-auto text-xs">{m.siglaEstado}</span>
                  </button>
                ))}
              </div>
            )}
            {municipioSelecionado && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Building2 className="w-3 h-3" />
                <span>Prefeitura Municipal de {municipioSelecionado.nome}, {municipioSelecionado.estado}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail institucional</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.gov.br"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aguarde...</>
              : <><LogIn className="w-4 h-4 mr-2" /> Entrar</>
            }
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Ainda sem acesso?{' '}
            <Link href="/cadastro" className="font-semibold hover:underline">
              Solicite seu cadastro
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "login" | head -10
```

Expected: zero erros.

- [ ] **Step 3: Commitar**

```bash
git add "src/app/(auth)/login/page.tsx"
git commit -m "feat(auth): redesenha login com campo de prefeitura autocomplete via IBGE"
```

---

### Task 6: Redesenhar pagina de cadastro (dois fluxos)

**Files:**
- Modify: `src/app/(auth)/cadastro/page.tsx`

- [ ] **Step 1: Reescrever o componente**

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, UserPlus, Building2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { cadastrarUsuario } from '@/lib/actions/auth-cadastro'
import { LABEL_PAPEL } from '@/lib/permissions'
import type { PapelUsuario } from '@/types/database'

const PAPEIS_CADASTRAVEIS: PapelUsuario[] = [
  'requisitante',
  'setor_compras',
  'setor_licitacao',
  'procurador',
  'gestor_publico',
  'publicacao',
]

export default function CadastroPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [papelSolicitado, setPapelSolicitado] = useState<PapelUsuario | ''>('')
  const [organizacaoId, setOrganizacaoId] = useState('')
  const [organizacoes, setOrganizacoes] = useState<{ id: string; nome: string }[]>([])
  const [carregando, setCarregando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [carregandoOrgs, setCarregandoOrgs] = useState(false)
  const [buscouOrgs, setBuscouOrgs] = useState(false)

  async function carregarOrganizacoes() {
    if (buscouOrgs) return
    setCarregandoOrgs(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('organizacoes')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')
    setOrganizacoes(data ?? [])
    setBuscouOrgs(true)
    setCarregandoOrgs(false)
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    if (!papelSolicitado) { toast.error('Selecione o seu papel na prefeitura.'); return }
    if (!organizacaoId) { toast.error('Selecione a sua prefeitura.'); return }

    setCarregando(true)
    const resultado = await cadastrarUsuario({
      email, senha, nomeCompleto: nome,
      papelSolicitado: papelSolicitado as PapelUsuario,
      organizacaoId,
    })

    if (!resultado.success) {
      toast.error(resultado.error ?? 'Erro ao cadastrar.')
      setCarregando(false)
      return
    }

    setEnviado(true)
    setCarregando(false)
  }

  if (enviado) {
    return (
      <Card className="shadow-lg border-0 text-center">
        <CardContent className="pt-8 pb-6 space-y-3">
          <div className="text-4xl">📧</div>
          <h2 className="text-lg font-semibold">Solicitacao enviada!</h2>
          <p className="text-sm text-muted-foreground">
            Sua conta foi criada e aguarda aprovacao do administrador da sua prefeitura.
            Confirme seu e-mail primeiro, depois aguarde a liberacao do acesso.
          </p>
          <Link href="/login" className="text-sm font-semibold hover:underline">
            Voltar ao login
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="text-xl">Solicitar Acesso</CardTitle>
          <CardDescription>Para uma prefeitura ja cadastrada na plataforma</CardDescription>
        </CardHeader>

        <form onSubmit={handleCadastro}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Seu nome completo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-cad">E-mail institucional</Label>
              <Input id="email-cad" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.gov.br" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha-cad">Senha (minimo 8 caracteres)</Label>
              <Input id="senha-cad" type="password" value={senha} onChange={e => setSenha(e.target.value)} required minLength={8} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Prefeitura</Label>
              <Select onOpenChange={carregarOrganizacoes} onValueChange={setOrganizacaoId}>
                <SelectTrigger>
                  <SelectValue placeholder={carregandoOrgs ? 'Carregando...' : 'Selecione sua prefeitura'} />
                </SelectTrigger>
                <SelectContent>
                  {organizacoes.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Seu papel na prefeitura</Label>
              <Select onValueChange={v => setPapelSolicitado(v as PapelUsuario)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu papel" />
                </SelectTrigger>
                <SelectContent>
                  {PAPEIS_CADASTRAVEIS.map(p => (
                    <SelectItem key={p} value={p}>{LABEL_PAPEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={carregando}>
              {carregando
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aguarde...</>
                : <><UserPlus className="w-4 h-4 mr-2" /> Solicitar acesso</>
              }
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Ja tem acesso?{' '}
              <Link href="/login" className="font-semibold hover:underline">Entrar</Link>
            </p>
          </CardFooter>
        </form>
      </Card>

      {/* Link para nova prefeitura */}
      <Link
        href="/cadastro/nova-prefeitura"
        className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-muted-foreground" />
          <div>
            <div className="text-sm font-semibold">Minha prefeitura nao esta cadastrada</div>
            <div className="text-xs text-muted-foreground">Cadastre sua prefeitura como administrador</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Commitar**

```bash
git add "src/app/(auth)/cadastro/page.tsx"
git commit -m "feat(auth): redesenha cadastro com dois fluxos (usuario comum e nova prefeitura)"
```

---

### Task 7: Pagina de cadastro de nova prefeitura

**Files:**
- Create: `src/app/(auth)/cadastro/nova-prefeitura/page.tsx`

- [ ] **Step 1: Criar o arquivo**

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, Building2, ChevronLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { buscarMunicipios, nomePrefeitura, type MunicipioSimplificado } from '@/lib/ibge'
import { cadastrarAdminOrg } from '@/lib/actions/auth-cadastro'

export default function NovaPrefeituraPage() {
  const [passo, setPasso] = useState<1 | 2>(1)
  const [municipio, setMunicipio] = useState<MunicipioSimplificado | null>(null)
  const [termoBusca, setTermoBusca] = useState('')
  const [sugestoes, setSugestoes] = useState<MunicipioSimplificado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Formulario passo 2
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [cargo, setCargo] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [nomePref, setNomePref] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [concluido, setConcluido] = useState(false)

  useEffect(() => {
    if (termoBusca.length < 2) { setSugestoes([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      const resultados = await buscarMunicipios(termoBusca)
      setSugestoes(resultados)
      setMostrarSugestoes(true)
      setBuscando(false)
    }, 350)
  }, [termoBusca])

  function selecionarMunicipio(m: MunicipioSimplificado) {
    setMunicipio(m)
    setNomePref(nomePrefeitura(m))
    setMostrarSugestoes(false)
    setTermoBusca('')
    setPasso(2)
  }

  function formatarCNPJ(v: string) {
    const nums = v.replace(/\D/g, '').slice(0, 14)
    return nums.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cnpjNums = cnpj.replace(/\D/g, '')
    if (cnpjNums.length !== 14) { toast.error('CNPJ deve ter 14 digitos.'); return }
    if (!municipio) { toast.error('Selecione o municipio.'); return }

    setCarregando(true)
    const resultado = await cadastrarAdminOrg({
      email, senha, nomeCompleto,
      cargo: cargo || undefined,
      nomePrefeitura: nomePref,
      cnpjPrefeitura: cnpjNums,
      municipio: municipio.nome,
      estado: municipio.siglaEstado,
    })

    if (!resultado.success) {
      toast.error(resultado.error ?? 'Erro ao cadastrar.')
      setCarregando(false)
      return
    }

    setConcluido(true)
    setCarregando(false)
  }

  if (concluido) {
    return (
      <Card className="shadow-lg border-0 text-center">
        <CardContent className="pt-8 pb-6 space-y-3">
          <div className="text-4xl">🏛️</div>
          <h2 className="text-lg font-semibold">Prefeitura registrada!</h2>
          <p className="text-sm text-muted-foreground">
            O cadastro de {nomePref} foi enviado. Confirme seu e-mail e aguarde a ativacao pelo administrador da plataforma.
          </p>
          <Link href="/login" className="text-sm font-semibold hover:underline">Voltar ao login</Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/cadastro" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <CardTitle className="text-xl">Nova Prefeitura</CardTitle>
        </div>
        <CardDescription>
          {passo === 1 ? 'Busque sua cidade para comecar o cadastro' : `Dados de ${municipio?.nome} - ${municipio?.siglaEstado}`}
        </CardDescription>
      </CardHeader>

      {passo === 1 && (
        <CardContent className="space-y-4">
          <div className="space-y-2 relative">
            <Label>Nome da cidade</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Digite o nome da sua cidade..."
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
                className="pl-8"
                autoComplete="off"
              />
              {buscando && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {mostrarSugestoes && sugestoes.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {sugestoes.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent text-sm text-left"
                    onClick={() => selecionarMunicipio(m)}
                  >
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div>
                      <div className="font-medium">{m.nome}</div>
                      <div className="text-xs text-muted-foreground">{m.estado}</div>
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">{m.siglaEstado}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}

      {passo === 2 && municipio && (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="bg-muted/40 rounded-lg p-3 text-sm">
              <div className="font-semibold">{nomePref}</div>
              <div className="text-muted-foreground text-xs">{municipio.municipio}, {municipio.siglaEstado}</div>
            </div>

            <div className="space-y-2">
              <Label>CNPJ da Prefeitura</Label>
              <Input
                value={cnpj}
                onChange={e => setCnpj(formatarCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00"
                required
              />
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Seus dados</div>
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Cargo (opcional)</Label>
                <Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Secretario de Administracao" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@prefeitura.gov.br" />
              </div>
              <div className="space-y-2">
                <Label>Senha (minimo 8 caracteres)</Label>
                <Input type="password" value={senha} onChange={e => setSenha(e.target.value)} required minLength={8} placeholder="••••••••" />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={carregando}>
              {carregando
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aguarde...</>
                : <><Building2 className="w-4 h-4 mr-2" /> Registrar prefeitura</>
              }
            </Button>
            <button type="button" onClick={() => setPasso(1)} className="text-sm text-muted-foreground hover:underline">
              Trocar de cidade
            </button>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "nova-prefeitura" | head -10
```

Expected: zero erros.

- [ ] **Step 3: Commitar**

```bash
git add "src/app/(auth)/cadastro/nova-prefeitura/page.tsx"
git commit -m "feat(auth): cria pagina de cadastro de nova prefeitura com autocomplete IBGE"
```

---

### Task 8: Server Action de aprovacao/recusa pelo Admin de Org

**Files:**
- Create: `src/lib/actions/aprovacao-usuario.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface ResultadoAprovacao { success: boolean; error?: string }

async function verificarAdminOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: admin } = await supabase
    .from('usuarios')
    .select('id, papel, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!admin || !['admin_organizacao', 'admin_plataforma'].includes(admin.papel)) return null
  return admin as { id: string; papel: string; organizacao_id: string }
}

/** Aprova um usuario pendente. Ativa o usuario na org. */
export async function aprovarUsuario(usuarioId: string): Promise<ResultadoAprovacao> {
  const supabase = await createClient()
  const admin = await verificarAdminOrg()
  if (!admin) return { success: false, error: 'Sem permissao.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, organizacao_id, papel_solicitado, nome_completo')
    .eq('id', usuarioId)
    .maybeSingle()

  if (!usuario) return { success: false, error: 'Usuario nao encontrado.' }
  if (usuario.organizacao_id !== admin.organizacao_id && admin.papel !== 'admin_plataforma') {
    return { success: false, error: 'Sem permissao para este usuario.' }
  }

  const { error } = await supabase
    .from('usuarios')
    .update({
      status_aprovacao: 'ativo',
      ativo: true,
      papel: usuario.papel_solicitado,
    })
    .eq('id', usuarioId)

  if (error) return { success: false, error: error.message }

  // Notifica o usuario aprovado
  await (supabase as any).from('notificacoes').insert({
    usuario_id: usuarioId,
    organizacao_id: usuario.organizacao_id,
    titulo: 'Seu acesso foi aprovado!',
    mensagem: 'Voce ja pode acessar a plataforma LicitaIA.',
    lida: false,
    link: '/dashboard',
  })

  revalidatePath('/configuracoes/usuarios')
  return { success: true }
}

/** Recusa um usuario pendente. */
export async function recusarUsuario(usuarioId: string, motivo: string): Promise<ResultadoAprovacao> {
  if (!motivo.trim()) return { success: false, error: 'Motivo obrigatorio.' }
  const supabase = await createClient()
  const admin = await verificarAdminOrg()
  if (!admin) return { success: false, error: 'Sem permissao.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, organizacao_id')
    .eq('id', usuarioId)
    .maybeSingle()

  if (!usuario) return { success: false, error: 'Usuario nao encontrado.' }
  if (usuario.organizacao_id !== admin.organizacao_id && admin.papel !== 'admin_plataforma') {
    return { success: false, error: 'Sem permissao para este usuario.' }
  }

  const { error } = await supabase
    .from('usuarios')
    .update({ status_aprovacao: 'recusado', ativo: false })
    .eq('id', usuarioId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/configuracoes/usuarios')
  return { success: true }
}

/** Lista usuarios pendentes de aprovacao na org do admin logado. */
export async function listarUsuariosPendentes() {
  const supabase = await createClient()
  const admin = await verificarAdminOrg()
  if (!admin) return { data: null, error: 'Sem permissao.' }

  const query = supabase
    .from('usuarios')
    .select('id, nome_completo, papel_solicitado, created_at')
    .eq('status_aprovacao', 'aguardando_aprovacao')
    .order('created_at', { ascending: true })

  if (admin.papel !== 'admin_plataforma') {
    query.eq('organizacao_id', admin.organizacao_id)
  }

  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}
```

- [ ] **Step 2: Commitar**

```bash
git add src/lib/actions/aprovacao-usuario.ts
git commit -m "feat(actions): cria Server Actions de aprovacao e recusa de usuarios"
```

---

### Task 9: Verificacao final

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

---

## Notas para o implementador

- A API IBGE (`servicodados.ibge.gov.br`) e CORS-livre e pode ser chamada direto do browser sem proxy.
- O fetch com `{ next: { revalidate: 86400 } }` funciona apenas em Server Components. Nas Client Components (paginas de auth), o fetch e feito sem essa opcao — esta correto pois o debounce ja limita as chamadas.
- O `formatarCNPJ` e apenas visual (mascara); a validacao real envia apenas os digitos.
- A pagina de `aguardando-aprovacao` e `aguardando-ativacao` (para onde o Supabase Auth redireciona apos confirmacao de email) ainda precisa ser criada — sao paginas simples com mensagem de status. Criar em `src/app/(auth)/aguardando-aprovacao/page.tsx` e `src/app/(auth)/aguardando-ativacao/page.tsx`.
- O middleware do Next.js deve verificar `status_aprovacao === 'ativo'` antes de permitir acesso ao dashboard — adicionar essa verificacao ao middleware existente em `src/middleware.ts`.

# Auth — Cadastro e Login com Branding Dinâmico

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestruturar login (Select de orgs + branding dinâmico), cadastro de usuário (confirmação de senha, secretaria) e cadastro de nova prefeitura (CEP, endereço, logo upload, cor hex, secretaria padrão).

**Architecture:** Migration → endpoint público → componentes reutilizáveis (HexColorPickerField, LogoFilePicker, LogoUploadField) → contexto de branding no auth layout → rewrite de login + nova-prefeitura + solicitar-acesso → atualização de configurações. 15 tarefas sequenciais.

**Tech Stack:** Next.js 14 App Router, TypeScript estrito, react-colorful, Supabase Storage, ViaCEP API (viacep.com.br), shadcn/ui, Zod, Tailwind CSS.

---

## Mapa de arquivos

**Criar:**
- `supabase/migrations/20260526000002_auth_branding_campos.sql`
- `src/app/api/org-branding/route.ts`
- `src/lib/auth/branding-context.tsx`
- `src/components/licita/hex-color-picker-field.tsx`
- `src/components/licita/logo-file-picker.tsx`
- `src/components/licita/logo-upload-field.tsx`
- `src/lib/actions/storage.ts`

**Modificar:**
- `src/app/(auth)/layout.tsx`
- `src/app/(auth)/layout-client.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/cadastro/page.tsx`
- `src/app/(auth)/cadastro/nova-prefeitura/page.tsx`
- `src/lib/actions/auth-cadastro.ts`
- `src/lib/actions/organizacao.ts`
- `src/lib/validacao/organizacao.ts`
- `src/app/(dashboard)/configuracoes/organizacao/form-organizacao.tsx`

---

## Task 1: Migration — colunas e bucket de storage

**Files:**
- Create: `supabase/migrations/20260526000002_auth_branding_campos.sql`

- [ ] **Step 1: Criar migration SQL**

```sql
-- supabase/migrations/20260526000002_auth_branding_campos.sql

-- Identidade visual e endereco da organizacao
ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS cor_primaria text,
  ADD COLUMN IF NOT EXISTS cep          text,
  ADD COLUMN IF NOT EXISTS logradouro   text,
  ADD COLUMN IF NOT EXISTS numero       text,
  ADD COLUMN IF NOT EXISTS bairro       text;

-- Secretaria vinculada ao usuario
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS secretaria_id uuid references secretarias(id) on delete set null;

-- Bucket publico para logos de prefeituras
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-logos',
  'org-logos',
  true,
  2097152,
  ARRAY['image/png','image/svg+xml','image/jpeg']
) ON CONFLICT (id) DO NOTHING;

-- Politica: leitura publica
CREATE POLICY IF NOT EXISTS "org_logos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');

-- Politica: escrita para usuarios autenticados (configuracoes)
CREATE POLICY IF NOT EXISTS "org_logos_auth_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'org-logos');

CREATE POLICY IF NOT EXISTS "org_logos_auth_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'org-logos');
```

- [ ] **Step 2: Aplicar migration no Supabase**

Acesse o painel Supabase > SQL Editor e execute o conteúdo do arquivo acima. Confirme que não há erros.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260526000002_auth_branding_campos.sql
git commit -m "feat(db): colunas de branding/endereco em organizacoes e secretaria_id em usuarios"
```

---

## Task 2: Instalar react-colorful

**Files:** `package.json`

- [ ] **Step 1: Instalar**

```bash
npm install react-colorful
```

- [ ] **Step 2: Verificar**

```bash
node -e "require('react-colorful'); console.log('ok')"
```

Esperado: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: adiciona react-colorful para seletor de cor hex"
```

---

## Task 3: Endpoint público `/api/org-branding`

**Files:**
- Create: `src/app/api/org-branding/route.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
// src/app/api/org-branding/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Fallback: cor primaria dos temas predefinidos (quando cor_primaria ainda nao esta definida)
const TEMA_COR: Record<string, string> = {
  petroleo:   '#1F3B4E',
  grafite:    '#111111',
  brasao:     '#1A4828',
  noite:      '#0D1117',
  cataguases: '#0E1B33',
}

export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get('orgId')
  if (!orgId) {
    return NextResponse.json({ error: 'orgId obrigatorio' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const [{ data: org }, { data: secretarias }] = await Promise.all([
    (supabase as any)
      .from('organizacoes')
      .select('nome, brasao_url, cor_primaria, tema_padrao')
      .eq('id', orgId)
      .eq('ativo', true)
      .maybeSingle(),
    (supabase as any)
      .from('secretarias')
      .select('id, nome')
      .eq('organizacao_id', orgId)
      .order('nome'),
  ])

  if (!org) {
    return NextResponse.json({ error: 'Organizacao nao encontrada' }, { status: 404 })
  }

  const cor_primaria = org.cor_primaria ?? TEMA_COR[org.tema_padrao] ?? '#112239'

  return NextResponse.json(
    {
      nome:         org.nome as string,
      brasao_url:   org.brasao_url as string | null,
      cor_primaria,
      secretarias:  (secretarias ?? []) as { id: string; nome: string }[],
    },
    { headers: { 'Cache-Control': 'public, max-age=60' } }
  )
}
```

- [ ] **Step 2: Testar o endpoint (com a org Cataguases)**

Acesse no browser ou curl:
```
http://localhost:3000/api/org-branding?orgId=7d2e7f35-cef2-4a65-a218-187e85a35551
```

Esperado: JSON com `nome`, `brasao_url`, `cor_primaria`, `secretarias`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/org-branding/route.ts
git commit -m "feat(api): endpoint publico /api/org-branding com secretarias"
```

---

## Task 4: Contexto de branding do auth layout

**Files:**
- Create: `src/lib/auth/branding-context.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/lib/auth/branding-context.tsx
'use client'

import { createContext, useContext } from 'react'

export interface OrgBranding {
  cor_primaria:  string
  brasao_url:    string | null
  nome:          string | null
  secretarias:   { id: string; nome: string }[]
}

export const DEFAULT_BRANDING: OrgBranding = {
  cor_primaria: '#112239',
  brasao_url:   null,
  nome:         null,
  secretarias:  [],
}

interface AuthBrandingContextValue {
  branding:           OrgBranding
  setBrandingByOrgId: (orgId: string) => Promise<void>
}

export const AuthBrandingContext = createContext<AuthBrandingContextValue>({
  branding:           DEFAULT_BRANDING,
  setBrandingByOrgId: async () => {},
})

export function useAuthBranding() {
  return useContext(AuthBrandingContext)
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/branding-context.tsx
git commit -m "feat(auth): AuthBrandingContext para branding dinamico no layout"
```

---

## Task 5: Componente `HexColorPickerField`

**Files:**
- Create: `src/components/licita/hex-color-picker-field.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/components/licita/hex-color-picker-field.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { HexColorPicker } from 'react-colorful'

interface HexColorPickerFieldProps {
  value:    string
  onChange: (hex: string) => void
  label?:   string
}

export function HexColorPickerField({ value, onChange, label }: HexColorPickerFieldProps) {
  const [open, setOpen]       = useState(false)
  const [inputVal, setInput]  = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setInput(value) }, [value])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setInput(raw)
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) onChange(raw)
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
          {label}
        </label>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="w-9 h-9 rounded-md border-2 shrink-0 transition-shadow hover:shadow-md"
          style={{ backgroundColor: value, borderColor: 'var(--hairline)' }}
          aria-label="Abrir seletor de cor"
        />

        <div className="relative flex-1" ref={ref}>
          <input
            type="text"
            value={inputVal}
            onChange={handleInput}
            placeholder="#000000"
            maxLength={7}
            className="w-full h-9 px-3 rounded-md border text-sm font-mono"
            style={{
              borderColor: 'var(--hairline)',
              background:  'var(--surface)',
              color:       'var(--ink)',
            }}
          />
          {open && (
            <div
              className="absolute top-10 left-0 z-50 p-3 rounded-xl shadow-xl"
              style={{
                background:  'var(--surface)',
                border:      '1px solid var(--hairline)',
              }}
            >
              <HexColorPicker
                color={value}
                onChange={v => { onChange(v); setInput(v) }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Preview dos 4 tons derivados */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: 'var(--muted)' }}>Preview:</span>
        {([1, 0.7, 0.2, 0.08] as const).map((op, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded"
            style={{
              background: value,
              opacity:    op,
              border:     '1px solid rgba(0,0,0,0.08)',
            }}
          />
        ))}
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
git add src/components/licita/hex-color-picker-field.tsx
git commit -m "feat(ui): componente HexColorPickerField com react-colorful"
```

---

## Task 6: Componente `LogoFilePicker` (seleção sem upload imediato)

Usado no formulário de nova prefeitura, onde o orgId ainda não existe.

**Files:**
- Create: `src/components/licita/logo-file-picker.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/components/licita/logo-file-picker.tsx
'use client'

import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'

interface LogoFilePickerProps {
  onSelect: (file: File | null) => void
  label?:   string
}

const TIPOS_ACEITOS = ['image/png', 'image/svg+xml', 'image/jpeg']
const MAX_BYTES     = 2 * 1024 * 1024

export function LogoFilePicker({ onSelect, label }: LogoFilePickerProps) {
  const [preview,  setPreview]  = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!TIPOS_ACEITOS.includes(file.type)) {
      toast.error('Formato invalido. Use PNG, SVG ou JPG.')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('Arquivo muito grande. Maximo 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setFileName(file.name)
    onSelect(file)
  }

  function handleRemove() {
    setPreview(null)
    setFileName(null)
    onSelect(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
          {label}
        </label>
      )}

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <div className="flex items-center gap-3">
          <img
            src={preview}
            alt="Preview da logo"
            className="w-14 h-14 object-contain rounded-md border"
            style={{ borderColor: 'var(--hairline)' }}
          />
          <div className="space-y-1">
            <p className="text-xs" style={{ color: 'var(--inkSoft)' }}>{fileName}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-xs underline"
                style={{ color: 'var(--primary)' }}
              >
                Trocar
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs underline"
                style={{ color: 'var(--muted)' }}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 py-5 rounded-lg border-2 border-dashed transition-colors"
          style={{ borderColor: 'var(--hairline)', background: 'var(--surfaceAlt)' }}
        >
          <Upload className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            PNG, SVG ou JPG — max 2 MB
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos e commit**

```bash
npx tsc --noEmit
git add src/components/licita/logo-file-picker.tsx
git commit -m "feat(ui): componente LogoFilePicker para selecao de logo sem upload imediato"
```

---

## Task 7: Server Action `uploadOrgLogoRegistro`

Usado após criação da org (usuário não autenticado). Usa service client.

**Files:**
- Create: `src/lib/actions/storage.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
// src/lib/actions/storage.ts
'use server'

import { createServiceClient } from '@/lib/supabase/server'

interface UploadResult {
  success: boolean
  url?:    string
  error?:  string
}

/**
 * Faz upload da logo para uma org recém-criada (ativo=false).
 * Usa service client pois o usuario ainda nao esta autenticado.
 * Segurança: só atualiza orgs inativas (just created).
 */
export async function uploadOrgLogoRegistro(
  orgId:    string,
  formData: FormData
): Promise<UploadResult> {
  const file = formData.get('file') as File | null
  if (!file || !orgId) return { success: false, error: 'Dados invalidos' }

  const supabase = await createServiceClient()

  // Segurança: org deve estar inativa (recém-criada, não aprovada ainda)
  const { data: org } = await (supabase as any)
    .from('organizacoes')
    .select('id')
    .eq('id', orgId)
    .eq('ativo', false)
    .maybeSingle()

  if (!org) return { success: false, error: 'Organizacao nao encontrada' }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext    = file.name.split('.').pop() ?? 'png'
  const path   = `organizacoes/${orgId}/logo.${ext}`

  const { error: storageError } = await supabase.storage
    .from('org-logos')
    .upload(path, buffer, { upsert: true, contentType: file.type })

  if (storageError) {
    console.error('[uploadOrgLogoRegistro] storage error:', storageError.message)
    return { success: false, error: 'Erro ao enviar logo.' }
  }

  const { data: { publicUrl } } = supabase.storage.from('org-logos').getPublicUrl(path)

  await (supabase as any)
    .from('organizacoes')
    .update({ brasao_url: publicUrl })
    .eq('id', orgId)

  return { success: true, url: publicUrl }
}
```

- [ ] **Step 2: Verificar tipos e commit**

```bash
npx tsc --noEmit
git add src/lib/actions/storage.ts
git commit -m "feat(actions): uploadOrgLogoRegistro com service client"
```

---

## Task 8: Auth layout — contexto de branding + painel dinâmico

**Files:**
- Modify: `src/app/(auth)/layout.tsx`
- Modify: `src/app/(auth)/layout-client.tsx`

- [ ] **Step 1: Simplificar `layout.tsx`**

O layout server não precisa mais buscar nenhuma org — o branding é gerenciado pelo cliente.

```tsx
// src/app/(auth)/layout.tsx
import AuthLayoutClient from './layout-client'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayoutClient>{children}</AuthLayoutClient>
}
```

- [ ] **Step 2: Reescrever `layout-client.tsx`**

```tsx
/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { Brasao } from '@/components/licita/brasao'
import {
  AuthBrandingContext,
  DEFAULT_BRANDING,
  type OrgBranding,
} from '@/lib/auth/branding-context'

export default function AuthLayoutClient({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<OrgBranding>(DEFAULT_BRANDING)

  const setBrandingByOrgId = useCallback(async (orgId: string) => {
    if (!orgId) { setBrandingState(DEFAULT_BRANDING); return }
    try {
      const res = await fetch(`/api/org-branding?orgId=${encodeURIComponent(orgId)}`)
      if (res.ok) {
        const data = await res.json() as OrgBranding
        setBrandingState(data)
      }
    } catch { /* falha silenciosa — mantém branding atual */ }
  }, [])

  const { cor_primaria, brasao_url, nome } = branding

  return (
    <AuthBrandingContext.Provider value={{ branding, setBrandingByOrgId }}>
      <div className="min-h-screen flex" style={{ background: '#EDE8D8' }}>

        {/* Painel esquerdo: identidade institucional */}
        <div
          className="hidden lg:flex lg:w-[440px] xl:w-[500px] shrink-0 flex-col"
          style={{
            background:  cor_primaria,
            position:    'relative',
            overflow:    'hidden',
            transition:  'background-color 0.4s ease',
          }}
        >
          <div style={{ height: 3, background: 'linear-gradient(90deg, rgba(255,255,255,0.25), rgba(255,255,255,0.55), rgba(255,255,255,0.25))' }} />

          <div className="flex-1 flex flex-col justify-between p-10 xl:p-12 relative z-10">
            {/* Topo: LicitaIA */}
            <div className="flex items-center gap-3">
              <div
                className="rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', width: 38, height: 38 }}
              >
                <span className="text-white font-bold text-sm" style={{ fontFamily: 'var(--font-inter)' }}>LI</span>
              </div>
              <div>
                <span
                  className="text-lg font-bold tracking-tight"
                  style={{ color: '#F5F0E0', fontFamily: 'var(--font-newsreader)' }}
                >
                  LicitaIA
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Lei 14.133/21
                </p>
              </div>
            </div>

            {/* Centro: logo da prefeitura */}
            <div className="flex-1 w-full relative min-h-0 my-8 overflow-hidden">
              {brasao_url ? (
                <img
                  src={brasao_url}
                  alt={nome ?? 'Logo da Prefeitura'}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{ transition: 'opacity 0.3s ease' }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brasao size={160} theme="petroleo" />
                </div>
              )}
            </div>

            {/* Rodape */}
            <div className="shrink-0 flex flex-col items-start space-y-6">
              {nome && (
                <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {nome}
                </p>
              )}
              <p className="text-[13px] leading-relaxed max-w-[300px]" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-inter)' }}>
                Plataforma de automacao de processos licitatorios. Do DFD ao edital, com auxilio de inteligencia artificial.
              </p>
              <div className="space-y-2.5">
                {[
                  'Conformidade com a Lei 14.133/21',
                  'Geracao assistida por IA',
                  'Fluxo completo de tramitacao',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2.5">
                    <div className="rounded-full shrink-0" style={{ width: 5, height: 5, background: 'rgba(255,255,255,0.45)' }} />
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.40)' }}>{item}</span>
                  </div>
                ))}
                <p className="text-[11px] mt-4 pt-4" style={{ color: 'rgba(255,255,255,0.18)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  &copy; {new Date().getFullYear()} LicitaIA
                </p>
              </div>
            </div>
          </div>

          <div style={{ height: 3, background: 'linear-gradient(90deg, rgba(255,255,255,0.25), rgba(255,255,255,0.55), rgba(255,255,255,0.25))' }} />
        </div>

        {/* Painel direito: formulário */}
        <div
          className="flex-1 flex items-center justify-center px-6 py-12"
          style={{ zoom: 'var(--zoom-level, 1)' }}
        >
          <div className="w-full max-w-md">
            {/* Logo mobile */}
            <div className="lg:hidden flex flex-col items-center mb-10 gap-4">
              <div className="w-full h-[140px] relative">
                {brasao_url ? (
                  <img src={brasao_url} alt="Logo" className="absolute inset-0 w-full h-full object-contain" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Brasao size={100} theme="petroleo" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <span className="text-lg font-bold tracking-tight" style={{ color: '#112239', fontFamily: 'var(--font-newsreader)' }}>
                  LicitaIA
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mt-1" style={{ color: cor_primaria }}>
                  Lei 14.133/21
                </p>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </AuthBrandingContext.Provider>
  )
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(auth\)/layout.tsx src/app/\(auth\)/layout-client.tsx
git commit -m "feat(auth): layout com branding dinamico via AuthBrandingContext"
```

---

## Task 9: Rewrite da tela de login

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Substituir o arquivo completo**

```tsx
// src/app/(auth)/login/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, LogIn, Building2, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthBranding } from '@/lib/auth/branding-context'

interface Org { id: string; nome: string }

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { setBrandingByOrgId } = useAuthBranding()

  const [orgs,      setOrgs]      = useState<Org[]>([])
  const [orgId,     setOrgId]     = useState('')
  const [email,     setEmail]     = useState('')
  const [senha,     setSenha]     = useState('')
  const [carregando,setCarregando]= useState(false)
  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState(false)
  const [reenvioOk, setReenvioOk] = useState(false)

  useEffect(() => {
    const erro = searchParams.get('error')
    if (erro === 'link_invalido') toast.error('Link de confirmacao invalido ou expirado.')
  }, [searchParams])

  useEffect(() => {
    async function carregarOrgs() {
      const supabase = createClient()
      const { data } = await supabase
        .from('organizacoes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')
      setOrgs((data ?? []) as Org[])
    }
    carregarOrgs()
  }, [])

  async function handleOrgSelect(id: string) {
    setOrgId(id)
    await setBrandingByOrgId(id)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) { toast.error('Selecione sua prefeitura.'); return }
    setCarregando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setEmailNaoConfirmado(true)
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
    <div className="space-y-4">
      <Card className="shadow-lg border-0">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold">Acesso ao Sistema</CardTitle>
          <CardDescription>Entre com e-mail e senha da sua conta institucional</CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Prefeitura</Label>
              <Select onValueChange={handleOrgSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione sua prefeitura..." />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {o.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            {emailNaoConfirmado && (
              <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 space-y-2">
                <p>E-mail ainda nao confirmado. Verifique sua caixa de entrada.</p>
                {reenvioOk ? (
                  <p className="text-green-700 font-medium">Link reenviado com sucesso.</p>
                ) : (
                  <button
                    type="button"
                    className="font-semibold underline hover:no-underline"
                    onClick={async () => {
                      const supabase = createClient()
                      await supabase.auth.resend({ type: 'signup', email })
                      setReenvioOk(true)
                    }}
                  >
                    Reenviar e-mail de confirmacao
                  </button>
                )}
              </div>
            )}

            <p className="text-sm text-center text-muted-foreground">
              <Link href="/recuperar-senha" className="hover:underline">
                Esqueci minha senha
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>

      {/* Dois caminhos de cadastro */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/cadastro"
          className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-white hover:bg-gray-50 transition-colors text-center shadow-sm"
        >
          <UserPlus className="w-5 h-5 text-muted-foreground" />
          <div>
            <div className="text-sm font-semibold text-gray-900">Solicitar acesso</div>
            <div className="text-xs text-muted-foreground">Minha prefeitura ja esta cadastrada</div>
          </div>
        </Link>

        <Link
          href="/cadastro/nova-prefeitura"
          className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-white hover:bg-gray-50 transition-colors text-center shadow-sm"
        >
          <Building2 className="w-5 h-5 text-muted-foreground" />
          <div>
            <div className="text-sm font-semibold text-gray-900">Cadastrar prefeitura</div>
            <div className="text-xs text-muted-foreground">Sou o administrador da prefeitura</div>
          </div>
        </Link>
      </div>
    </div>
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

- [ ] **Step 2: Verificar tipos e build**

```bash
npx tsc --noEmit
npx next build 2>&1 | tail -5
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx
git commit -m "feat(auth): login com Select de orgs e branding dinamico"
```

---

## Task 10: Atualizar Server Actions de cadastro

**Files:**
- Modify: `src/lib/actions/auth-cadastro.ts`

- [ ] **Step 1: Substituir o arquivo completo**

```ts
// src/lib/actions/auth-cadastro.ts
'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface ResultadoCadastro {
  success:    boolean
  error?:     string
  codigoErro?: 'cnpj_existente' | string
  orgId?:     string
}

// --- SOLICITAR ACESSO (usuario comum) ---

const SchemaCadastroUsuario = z.object({
  email:          z.string().email('E-mail invalido'),
  senha:          z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  nomeCompleto:   z.string().min(3).max(200),
  papelSolicitado: z.enum([
    'requisitante', 'setor_compras', 'setor_licitacao',
    'procurador', 'gestor_publico', 'publicacao',
  ] as const),
  organizacaoId:  z.string().uuid('Organizacao invalida'),
  secretariaId:   z.string().uuid('Secretaria invalida').optional(),
})

export async function cadastrarUsuario(
  input: z.infer<typeof SchemaCadastroUsuario>
): Promise<ResultadoCadastro> {
  const parsed = SchemaCadastroUsuario.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const supabase = await createClient()

  const { data: orgRaw } = await (supabase as any)
    .from('organizacoes')
    .select('id, ativo')
    .eq('id', parsed.data.organizacaoId)
    .maybeSingle()
  const org = orgRaw as { id: string; ativo: boolean } | null

  if (!org || !org.ativo) return { success: false, error: 'Prefeitura nao encontrada ou inativa.' }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email:    parsed.data.email,
    password: parsed.data.senha,
    options:  { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/aguardando-aprovacao` },
  })
  if (authError || !authData.user) return { success: false, error: authError?.message ?? 'Erro ao criar conta.' }

  const { error: dbError } = await (supabase as any).from('usuarios').insert({
    id:              authData.user.id,
    organizacao_id:  parsed.data.organizacaoId,
    nome_completo:   parsed.data.nomeCompleto,
    papel:           parsed.data.papelSolicitado,
    papel_solicitado: parsed.data.papelSolicitado,
    secretaria_id:   parsed.data.secretariaId ?? null,
    status_aprovacao: 'aguardando_aprovacao',
    ativo:           false,
  })
  if (dbError) {
    console.error('[cadastrarUsuario] insert falhou:', authData.user.id, dbError.message)
    return { success: false, error: 'Erro ao registrar usuario. Tente novamente.' }
  }

  // Notificar admins da org
  const { data: admins } = await (supabase as any)
    .from('usuarios')
    .select('id')
    .eq('organizacao_id', parsed.data.organizacaoId)
    .in('papel', ['admin_organizacao', 'admin_plataforma'])
    .eq('ativo', true)
  if (admins?.length) {
    await (supabase as any).from('notificacoes').insert(
      admins.map((a: { id: string }) => ({
        usuario_id:     a.id,
        organizacao_id: parsed.data.organizacaoId,
        titulo:         'Novo usuario aguardando aprovacao',
        mensagem:       `${parsed.data.nomeCompleto} solicitou acesso como ${parsed.data.papelSolicitado}.`,
        lida:           false,
        link:           '/configuracoes/usuarios',
      }))
    )
  }

  return { success: true }
}

// --- CADASTRAR NOVA PREFEITURA (admin_organizacao) ---

const SECRETARIAS_PADRAO = [
  'Gabinete do Prefeito',
  'Secretaria de Administracao',
  'Secretaria de Financas',
  'Secretaria de Obras e Infraestrutura',
  'Secretaria de Saude',
  'Secretaria de Educacao',
  'Procuradoria Juridica',
  'Setor de Licitacoes e Contratos',
] as const

const SchemaCadastroAdminOrg = z.object({
  email:          z.string().email('E-mail invalido'),
  senha:          z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  nomeCompleto:   z.string().min(3).max(200),
  cargo:          z.string().max(200).optional(),
  secretariaNome: z.string().min(2).max(200),
  nomePrefeitura: z.string().min(3).max(300),
  cnpjPrefeitura: z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 digitos'),
  municipio:      z.string().min(2).max(200),
  estado:         z.string().length(2),
  cep:            z.string().regex(/^\d{8}$/, 'CEP deve ter 8 digitos'),
  logradouro:     z.string().min(2).max(300),
  numero:         z.string().max(20),
  bairro:         z.string().min(2).max(200),
  cor_primaria:   z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export async function cadastrarAdminOrg(
  input: z.infer<typeof SchemaCadastroAdminOrg>
): Promise<ResultadoCadastro> {
  const parsed = SchemaCadastroAdminOrg.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const supabase = await createServiceClient()

  // Verificar CNPJ duplicado
  const { data: existente } = await (supabase as any)
    .from('organizacoes')
    .select('id')
    .eq('cnpj', parsed.data.cnpjPrefeitura)
    .maybeSingle()
  if (existente) return { success: false, codigoErro: 'cnpj_existente', error: 'Esta prefeitura ja esta cadastrada.' }

  // Criar org
  const { data: novaOrgRaw, error: orgError } = await (supabase as any)
    .from('organizacoes')
    .insert({
      nome:        parsed.data.nomePrefeitura,
      cnpj:        parsed.data.cnpjPrefeitura,
      municipio:   parsed.data.municipio,
      estado:      parsed.data.estado,
      cep:         parsed.data.cep,
      logradouro:  parsed.data.logradouro,
      numero:      parsed.data.numero,
      bairro:      parsed.data.bairro,
      cor_primaria: parsed.data.cor_primaria ?? null,
      ativo:       false,
    })
    .select('id')
    .single()

  const novaOrg = novaOrgRaw as { id: string } | null
  if (orgError || !novaOrg) return { success: false, error: 'Erro ao registrar prefeitura.' }

  // Inserir secretarias padrao
  const { data: secretariasInseridas } = await (supabase as any)
    .from('secretarias')
    .insert(
      SECRETARIAS_PADRAO.map(nome => ({
        organizacao_id: novaOrg.id,
        nome,
        ativo: true,
      }))
    )
    .select('id, nome')

  // Encontrar secretaria_id correspondente à escolha do admin
  const secs = (secretariasInseridas ?? []) as { id: string; nome: string }[]
  const secEscolhida = secs.find(s => s.nome === parsed.data.secretariaNome)

  // Criar usuario admin
  const supabaseAuth = await createClient()
  const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
    email:    parsed.data.email,
    password: parsed.data.senha,
    options:  { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/aguardando-ativacao` },
  })
  if (authError || !authData.user) return { success: false, error: authError?.message ?? 'Erro ao criar conta.' }

  const { error: dbError } = await (supabase as any).from('usuarios').insert({
    id:              authData.user.id,
    organizacao_id:  novaOrg.id,
    nome_completo:   parsed.data.nomeCompleto,
    cargo:           parsed.data.cargo ?? null,
    secretaria_id:   secEscolhida?.id ?? null,
    papel:           'admin_organizacao',
    papel_solicitado: 'admin_organizacao',
    status_aprovacao: 'aguardando_aprovacao',
    ativo:           false,
  })
  if (dbError) {
    console.error('[cadastrarAdminOrg] insert usuario falhou:', authData.user.id, dbError.message)
    return { success: false, error: 'Erro ao registrar administrador.' }
  }

  // Notificar admin_plataforma
  const { data: adminsPlat } = await (supabase as any)
    .from('usuarios')
    .select('id')
    .eq('papel', 'admin_plataforma')
    .eq('ativo', true)
  if (adminsPlat?.length) {
    await (supabase as any).from('notificacoes').insert(
      adminsPlat.map((a: { id: string }) => ({
        usuario_id:     a.id,
        organizacao_id: novaOrg.id,
        titulo:         'Nova prefeitura aguardando ativacao',
        mensagem:       `${parsed.data.nomePrefeitura} (${parsed.data.municipio}/${parsed.data.estado}) aguarda ativacao.`,
        lida:           false,
        link:           '/admin/organizacoes',
      }))
    )
  }

  return { success: true, orgId: novaOrg.id }
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/auth-cadastro.ts
git commit -m "feat(actions): cadastrarAdminOrg com endereco/cor/secretaria e cadastrarUsuario com secretaria_id"
```

---

## Task 11: Rewrite de nova prefeitura

**Files:**
- Modify: `src/app/(auth)/cadastro/nova-prefeitura/page.tsx`

- [ ] **Step 1: Substituir o arquivo completo**

```tsx
// src/app/(auth)/cadastro/nova-prefeitura/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Loader2, Building2, ChevronLeft, Search,
  AlertCircle, UserPlus, LogIn, MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { buscarMunicipios, nomePrefeitura, type MunicipioSimplificado } from '@/lib/ibge'
import { cadastrarAdminOrg } from '@/lib/actions/auth-cadastro'
import { uploadOrgLogoRegistro } from '@/lib/actions/storage'
import { HexColorPickerField } from '@/components/licita/hex-color-picker-field'
import { LogoFilePicker } from '@/components/licita/logo-file-picker'

const SECRETARIAS_PADRAO = [
  'Gabinete do Prefeito',
  'Secretaria de Administracao',
  'Secretaria de Financas',
  'Secretaria de Obras e Infraestrutura',
  'Secretaria de Saude',
  'Secretaria de Educacao',
  'Procuradoria Juridica',
  'Setor de Licitacoes e Contratos',
] as const

function formatarCNPJ(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 14)
  return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function formatarCEP(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d{3})$/, '$1-$2')
}

export default function NovaPrefeituraPage() {
  const [passo, setPasso] = useState<1 | 2>(1)

  // Passo 1
  const [municipio,     setMunicipio]     = useState<MunicipioSimplificado | null>(null)
  const [termoBusca,    setTermoBusca]    = useState('')
  const [sugestoes,     setSugestoes]     = useState<MunicipioSimplificado[]>([])
  const [buscando,      setBuscando]      = useState(false)
  const [mostrarSugest, setMostrarSugest] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Passo 2 — prefeitura
  const [nomePref,    setNomePref]    = useState('')
  const [cnpj,        setCnpj]        = useState('')
  const [cep,         setCep]         = useState('')
  const [logradouro,  setLogradouro]  = useState('')
  const [numero,      setNumero]      = useState('')
  const [bairro,      setBairro]      = useState('')
  const [corPrimaria, setCorPrimaria] = useState('#112239')
  const [logoFile,    setLogoFile]    = useState<File | null>(null)
  const [buscandoCep, setBuscandoCep] = useState(false)

  // Passo 2 — admin
  const [nomeCompleto,    setNomeCompleto]    = useState('')
  const [cargo,           setCargo]           = useState('')
  const [secretariaNome,  setSecretariaNome]  = useState('')
  const [email,           setEmail]           = useState('')
  const [senha,           setSenha]           = useState('')
  const [confirmSenha,    setConfirmSenha]    = useState('')

  const [carregando,    setCarregando]    = useState(false)
  const [concluido,     setConcluido]     = useState(false)
  const [cnpjJaExiste,  setCnpjJaExiste]  = useState(false)

  // Busca cidade (passo 1)
  useEffect(() => {
    if (termoBusca.length < 2) { setSugestoes([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      const res = await buscarMunicipios(termoBusca)
      setSugestoes(res)
      setMostrarSugest(true)
      setBuscando(false)
    }, 350)
  }, [termoBusca])

  function selecionarMunicipio(m: MunicipioSimplificado) {
    setMunicipio(m)
    setNomePref(nomePrefeitura(m))
    setMostrarSugest(false)
    setTermoBusca('')
    setPasso(2)
  }

  // Auto-preenchimento via ViaCEP
  async function buscarCep(cepFormatado: string) {
    const nums = cepFormatado.replace(/\D/g, '')
    if (nums.length !== 8) return
    setBuscandoCep(true)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${nums}/json/`)
      const data = await res.json() as Record<string, string>
      if (!data.erro) {
        setLogradouro(data.logradouro ?? '')
        setBairro(data.bairro ?? '')
      } else {
        toast.error('CEP nao encontrado.')
      }
    } catch {
      toast.error('Erro ao buscar CEP.')
    } finally {
      setBuscandoCep(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const cnpjNums = cnpj.replace(/\D/g, '')
    const cepNums  = cep.replace(/\D/g, '')
    if (cnpjNums.length !== 14)   { toast.error('CNPJ deve ter 14 digitos.');   return }
    if (cepNums.length !== 8)     { toast.error('CEP deve ter 8 digitos.');     return }
    if (!secretariaNome)          { toast.error('Selecione sua secretaria.');   return }
    if (senha !== confirmSenha)   { toast.error('As senhas nao coincidem.');    return }
    if (!municipio)               { toast.error('Selecione o municipio.');      return }

    setCarregando(true)

    const resultado = await cadastrarAdminOrg({
      email, senha, nomeCompleto,
      cargo:          cargo || undefined,
      secretariaNome,
      nomePrefeitura: nomePref,
      cnpjPrefeitura: cnpjNums,
      municipio:      municipio.nome,
      estado:         municipio.siglaEstado,
      cep:            cepNums,
      logradouro,
      numero,
      bairro,
      cor_primaria:   /^#[0-9a-fA-F]{6}$/.test(corPrimaria) ? corPrimaria : undefined,
    })

    if (!resultado.success) {
      if (resultado.codigoErro === 'cnpj_existente') {
        setCnpjJaExiste(true)
      } else {
        toast.error(resultado.error ?? 'Erro ao cadastrar.')
      }
      setCarregando(false)
      return
    }

    // Upload de logo (se selecionada)
    if (logoFile && resultado.orgId) {
      const fd = new FormData()
      fd.append('file', logoFile)
      fd.append('orgId', resultado.orgId)
      await uploadOrgLogoRegistro(resultado.orgId, fd)
    }

    setConcluido(true)
    setCarregando(false)
  }

  // --- Telas de resultado ---

  if (concluido) {
    return (
      <Card className="shadow-lg border-0 text-center">
        <CardContent className="pt-8 pb-6 space-y-3">
          <Building2 className="w-10 h-10 text-primary mx-auto" />
          <h2 className="text-lg font-semibold">Prefeitura registrada!</h2>
          <p className="text-sm text-muted-foreground">
            O cadastro de {nomePref} foi enviado. Confirme seu e-mail e aguarde a ativacao pelo administrador da plataforma. Apos a ativacao, faca login normalmente.
          </p>
          <Link href="/login" className="text-sm font-semibold hover:underline">Voltar ao login</Link>
        </CardContent>
      </Card>
    )
  }

  if (cnpjJaExiste) {
    return (
      <Card className="shadow-lg border-0">
        <CardContent className="pt-8 pb-6 space-y-5">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Prefeitura ja cadastrada</p>
              <p className="text-sm mt-1">
                {nomePref} ja possui cadastro na plataforma.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <Link href="/login" className="flex items-center gap-3 p-3.5 rounded-lg border hover:bg-accent transition-colors">
              <LogIn className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <div className="text-sm font-semibold">Ja tenho uma conta</div>
                <div className="text-xs text-muted-foreground">Acessar com e-mail e senha</div>
              </div>
            </Link>
            <Link href="/cadastro" className="flex items-center gap-3 p-3.5 rounded-lg border hover:bg-accent transition-colors">
              <UserPlus className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <div className="text-sm font-semibold">Solicitar acesso</div>
                <div className="text-xs text-muted-foreground">Criar conta vinculada a esta prefeitura</div>
              </div>
            </Link>
          </div>
          <button type="button" onClick={() => { setCnpjJaExiste(false); setCnpj('') }} className="text-sm text-muted-foreground hover:underline w-full text-center">
            Informei o CNPJ errado, corrigir
          </button>
        </CardContent>
      </Card>
    )
  }

  // --- Formulário principal ---

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          {passo === 2 ? (
            <button type="button" onClick={() => setPasso(1)} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <Link href="/login" className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4" />
            </Link>
          )}
          <CardTitle className="text-xl">Cadastrar Prefeitura</CardTitle>
        </div>
        <CardDescription>
          {passo === 1
            ? 'Busque sua cidade para comecar'
            : `${municipio?.nome} — ${municipio?.siglaEstado}`}
        </CardDescription>
      </CardHeader>

      {/* Passo 1: Busca de cidade */}
      {passo === 1 && (
        <CardContent className="space-y-4">
          <div className="space-y-2 relative">
            <Label>Nome da cidade</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Digite o nome da cidade..."
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
                className="pl-8"
                autoComplete="off"
              />
              {buscando && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {mostrarSugest && sugestoes.length > 0 && (
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

      {/* Passo 2: Formulário completo */}
      {passo === 2 && municipio && (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            {/* Confirmação da cidade */}
            <div className="bg-muted/40 rounded-lg p-3 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <div className="font-semibold">{nomePref}</div>
                <div className="text-xs text-muted-foreground">{municipio.nome}, {municipio.siglaEstado}</div>
              </div>
            </div>

            {/* Bloco: Dados da Prefeitura */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados da Prefeitura</div>

              <div className="space-y-2">
                <Label>Nome oficial</Label>
                <Input value={nomePref} onChange={e => setNomePref(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={cnpj}
                  onChange={e => setCnpj(formatarCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  required
                />
              </div>

              {/* Endereco via CEP */}
              <div className="space-y-2">
                <Label>CEP</Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={cep}
                    onChange={e => {
                      const v = formatarCEP(e.target.value)
                      setCep(v)
                      if (v.replace(/\D/g, '').length === 8) buscarCep(v)
                    }}
                    placeholder="00000-000"
                    className="pl-8"
                    required
                  />
                  {buscandoCep && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Logradouro</Label>
                <Input value={logradouro} onChange={e => setLogradouro(e.target.value)} placeholder="Preenchido automaticamente via CEP" required />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2 col-span-1">
                  <Label>Numero</Label>
                  <Input value={numero} onChange={e => setNumero(e.target.value)} placeholder="S/N" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Bairro</Label>
                  <Input value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Preenchido via CEP" required />
                </div>
              </div>
            </div>

            {/* Bloco: Identidade Visual */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identidade Visual</div>
              <LogoFilePicker label="Logo / Brasao da Prefeitura" onSelect={setLogoFile} />
              <HexColorPickerField label="Cor primaria da prefeitura" value={corPrimaria} onChange={setCorPrimaria} />
            </div>

            {/* Bloco: Dados do Administrador */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seus Dados</div>

              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Secretario de Administracao" required />
              </div>

              <div className="space-y-2">
                <Label>Secretaria</Label>
                <Select onValueChange={setSecretariaNome}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione sua secretaria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SECRETARIAS_PADRAO.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>E-mail institucional</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@prefeitura.gov.br" required />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={senha} onChange={e => setSenha(e.target.value)} minLength={8} required placeholder="Min 8 caracteres" />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar senha</Label>
                  <Input type="password" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} required placeholder="Repita a senha" />
                </div>
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
          </CardFooter>
        </form>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Verificar tipos e build**

```bash
npx tsc --noEmit
npx next build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/cadastro/nova-prefeitura/page.tsx
git commit -m "feat(auth): nova prefeitura com CEP, endereco, logo, cor hex e secretaria padrao"
```

---

## Task 12: Rewrite de solicitar acesso

**Files:**
- Modify: `src/app/(auth)/cadastro/page.tsx`

- [ ] **Step 1: Substituir o arquivo completo**

```tsx
// src/app/(auth)/cadastro/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, UserPlus, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cadastrarUsuario } from '@/lib/actions/auth-cadastro'
import { LABEL_PAPEL } from '@/lib/permissions'
import { useAuthBranding } from '@/lib/auth/branding-context'

type PapelCadastravel =
  | 'requisitante'
  | 'setor_compras'
  | 'setor_licitacao'
  | 'procurador'
  | 'gestor_publico'
  | 'publicacao'

const PAPEIS: PapelCadastravel[] = [
  'requisitante', 'setor_compras', 'setor_licitacao',
  'procurador', 'gestor_publico', 'publicacao',
]

export default function CadastroPage() {
  const { branding, setBrandingByOrgId } = useAuthBranding()

  const [nome,           setNome]          = useState('')
  const [email,          setEmail]         = useState('')
  const [senha,          setSenha]         = useState('')
  const [confirmSenha,   setConfirmSenha]  = useState('')
  const [organizacaoId,  setOrganizacaoId] = useState('')
  const [secretariaId,   setSecretariaId]  = useState('')
  const [papelSolicitado, setPapel]        = useState<PapelCadastravel | ''>('')
  const [carregando,     setCarregando]    = useState(false)
  const [enviado,        setEnviado]       = useState(false)

  // Carrega orgs uma vez ao montar
  const [orgs, setOrgs] = useState<{ id: string; nome: string }[]>([])
  const [orgsCarregadas, setOrgsCarregadas] = useState(false)

  async function carregarOrgs() {
    if (orgsCarregadas) return
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase.from('organizacoes').select('id, nome').eq('ativo', true).order('nome')
    setOrgs((data ?? []) as { id: string; nome: string }[])
    setOrgsCarregadas(true)
  }

  async function handleOrgSelect(id: string) {
    setOrganizacaoId(id)
    setSecretariaId('')
    await setBrandingByOrgId(id)
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    if (!papelSolicitado)          { toast.error('Selecione o seu perfil de acesso.'); return }
    if (!organizacaoId)            { toast.error('Selecione a sua prefeitura.'); return }
    if (senha !== confirmSenha)    { toast.error('As senhas nao coincidem.'); return }

    setCarregando(true)
    const resultado = await cadastrarUsuario({
      email,
      senha,
      nomeCompleto:    nome,
      papelSolicitado,
      organizacaoId,
      secretariaId:    secretariaId || undefined,
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
          <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
          <h2 className="text-lg font-semibold">Solicitacao enviada!</h2>
          <p className="text-sm text-muted-foreground">
            Sua conta foi criada e aguarda aprovacao do administrador da sua prefeitura. Confirme seu e-mail e aguarde a liberacao.
          </p>
          <Link href="/login" className="text-sm font-semibold hover:underline">Voltar ao login</Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-xl">Solicitar Acesso</CardTitle>
        <CardDescription>Para uma prefeitura ja cadastrada na plataforma</CardDescription>
      </CardHeader>

      <form onSubmit={handleCadastro}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Seu nome completo" />
          </div>

          <div className="space-y-2">
            <Label>E-mail institucional</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.gov.br" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" value={senha} onChange={e => setSenha(e.target.value)} required minLength={8} placeholder="Min 8 caracteres" />
            </div>
            <div className="space-y-2">
              <Label>Confirmar senha</Label>
              <Input type="password" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} required placeholder="Repita a senha" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prefeitura</Label>
            <Select
              onOpenChange={open => { if (open) carregarOrgs() }}
              onValueChange={handleOrgSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione sua prefeitura..." />
              </SelectTrigger>
              <SelectContent>
                {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Secretaria (carregada após selecionar org via branding context) */}
          <div className="space-y-2">
            <Label>Secretaria</Label>
            <Select
              disabled={!organizacaoId || !branding.secretarias.length}
              onValueChange={setSecretariaId}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !organizacaoId ? 'Selecione a prefeitura primeiro' : 'Selecione sua secretaria...'
                } />
              </SelectTrigger>
              <SelectContent>
                {branding.secretarias.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Perfil de acesso</Label>
            <Select onValueChange={v => setPapel(v as PapelCadastravel)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione seu perfil..." />
              </SelectTrigger>
              <SelectContent>
                {PAPEIS.map(p => (
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
  )
}
```

- [ ] **Step 2: Verificar tipos e build**

```bash
npx tsc --noEmit
npx next build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/cadastro/page.tsx
git commit -m "feat(auth): solicitar acesso com confirmacao de senha e secretaria por org"
```

---

## Task 13: Componente `LogoUploadField` (configurações — autenticado)

**Files:**
- Create: `src/components/licita/logo-upload-field.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/components/licita/logo-upload-field.tsx
/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useRef } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface LogoUploadFieldProps {
  currentUrl: string | null
  orgId:      string
  onUpload:   (url: string) => void
  label?:     string
}

const TIPOS_ACEITOS = ['image/png', 'image/svg+xml', 'image/jpeg']
const MAX_BYTES     = 2 * 1024 * 1024

export function LogoUploadField({ currentUrl, orgId, onUpload, label }: LogoUploadFieldProps) {
  const [uploading,  setUploading]  = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!TIPOS_ACEITOS.includes(file.type)) { toast.error('Use PNG, SVG ou JPG.'); return }
    if (file.size > MAX_BYTES)              { toast.error('Maximo 2 MB.'); return }

    setUploading(true)
    const supabase = createClient()
    const ext  = file.name.split('.').pop() ?? 'png'
    const path = `organizacoes/${orgId}/logo.${ext}`

    const { error } = await supabase.storage
      .from('org-logos')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (error) { toast.error('Erro ao enviar logo.'); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('org-logos').getPublicUrl(path)
    setPreviewUrl(publicUrl)
    onUpload(publicUrl)
    setUploading(false)
    toast.success('Logo atualizada.')
  }

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{label}</label>}

      {previewUrl ? (
        <div className="flex items-center gap-3">
          <img
            src={previewUrl}
            alt="Logo atual"
            className="w-16 h-16 object-contain rounded-md border"
            style={{ borderColor: 'var(--hairline)' }}
          />
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors"
              style={{ borderColor: 'var(--hairline)', color: 'var(--inkSoft)' }}
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? 'Enviando...' : 'Trocar logo'}
            </button>
            <button
              type="button"
              onClick={() => { setPreviewUrl(null); onUpload('') }}
              className="text-xs"
              style={{ color: 'var(--muted)' }}
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center gap-2 py-6 rounded-lg border-2 border-dashed transition-colors"
          style={{ borderColor: 'var(--hairline)', background: 'var(--surfaceAlt)' }}
        >
          {uploading
            ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--muted)' }} />
            : <Upload className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          }
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            {uploading ? 'Enviando...' : 'Clique para enviar PNG, SVG ou JPG (max 2 MB)'}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos e commit**

```bash
npx tsc --noEmit
git add src/components/licita/logo-upload-field.tsx
git commit -m "feat(ui): LogoUploadField com upload direto ao Supabase Storage (autenticado)"
```

---

## Task 14: Configurações organização — logo + hex picker

**Files:**
- Modify: `src/app/(dashboard)/configuracoes/organizacao/form-organizacao.tsx`
- Modify: `src/lib/actions/organizacao.ts`
- Modify: `src/lib/validacao/organizacao.ts`

- [ ] **Step 1: Atualizar `src/lib/validacao/organizacao.ts`**

Abrir o arquivo e adicionar os campos `brasao_url` e `cor_primaria` ao schema existente:

```ts
// Adicionar ao schemaOrganizacao (junto com nome, cnpj, municipio, etc.)
brasao_url:   z.string().url().optional().or(z.literal('')),
cor_primaria: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal('')),
```

E ao tipo `OrganizacaoInput`:
```ts
brasao_url?:   string
cor_primaria?: string
```

- [ ] **Step 2: Atualizar `src/lib/actions/organizacao.ts` — incluir novos campos no update**

Localizar a função `atualizarOrganizacao` e garantir que os campos `brasao_url` e `cor_primaria` são incluídos no `.update(parsed.data)`. Como o schema Zod já valida esses campos, eles serão incluídos automaticamente no `parsed.data`. Nenhuma mudança no corpo da action é necessária se o update usa `parsed.data` diretamente.

Verificar que a linha de update é:
```ts
.update(parsed.data)
```
Se for, os novos campos serão incluídos automaticamente.

- [ ] **Step 3: Atualizar `form-organizacao.tsx`**

Adicionar imports no topo:
```tsx
import { LogoUploadField }      from '@/components/licita/logo-upload-field'
import { HexColorPickerField }  from '@/components/licita/hex-color-picker-field'
```

Atualizar a interface `Props` para incluir os novos campos:
```tsx
interface Props {
  organizacao: {
    id:                      string
    nome:                    string
    cnpj:                    string
    municipio:               string
    estado:                  string
    cabecalho_institucional: string | null
    rodape_institucional:    string | null
    tema_padrao?:            string | null
    cor_primaria?:           string | null
    brasao_url?:             string | null
  }
}
```

Adicionar estado para os novos campos logo após `temaEscolhido`:
```tsx
const [corPrimaria, setCorPrimaria] = useState<string>(
  organizacao.cor_primaria ?? '#112239'
)
const [brasaoUrl, setBrasaoUrl] = useState<string>(
  organizacao.brasao_url ?? ''
)
```

Adicionar ao `defaultValues` no `useForm`:
```tsx
cor_primaria: organizacao.cor_primaria ?? '',
brasao_url:   organizacao.brasao_url ?? '',
```

Dentro do `onSubmit`, antes de `atualizarOrganizacao`, incluir os novos campos:
```tsx
const result = await atualizarOrganizacao({
  ...data,
  tema_padrao:  temaEscolhido,
  cor_primaria: corPrimaria,
  brasao_url:   brasaoUrl,
})
```

Substituir o bloco de aparência (o `<div>` que contém os botões de tema predefinido) por:
```tsx
{/* Identidade visual */}
<div className="rounded-[var(--r-lg)] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}>
  <div className="px-5 py-4 border-b" style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}>
    <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
      Identidade Visual
    </h3>
    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
      Logo e cor exibidas no painel de login e no cabecalho do sistema.
    </p>
  </div>
  <div className="p-5 space-y-5">
    <LogoUploadField
      label="Logo / Brasao"
      currentUrl={brasaoUrl || null}
      orgId={organizacao.id}
      onUpload={url => { setBrasaoUrl(url); setValue('brasao_url', url) }}
    />
    <HexColorPickerField
      label="Cor primaria"
      value={corPrimaria}
      onChange={v => { setCorPrimaria(v); setValue('cor_primaria', v) }}
    />
  </div>
</div>
```

- [ ] **Step 4: Verificar tipos e build**

```bash
npx tsc --noEmit
npx next build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/validacao/organizacao.ts \
        src/lib/actions/organizacao.ts \
        src/app/\(dashboard\)/configuracoes/organizacao/form-organizacao.tsx
git commit -m "feat(config): upload de logo e seletor de cor hex em configuracoes/organizacao"
```

---

## Task 15: Verificação final e push

- [ ] **Step 1: TypeScript completo**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 2: Build de produção**

```bash
npx next build 2>&1 | tail -15
```

Esperado: build completo sem erros.

- [ ] **Step 3: Checklist funcional**

Verificar manualmente (ou via dev server) que:
- [ ] Tela de login carrega lista de orgs do banco (não IBGE)
- [ ] Ao selecionar Cataguases no login, o painel esquerdo muda para a cor/logo da org
- [ ] Botões "Solicitar acesso" e "Cadastrar prefeitura" aparecem abaixo do card de login
- [ ] `/cadastro`: confirmação de senha funciona, secretaria carrega após selecionar org
- [ ] `/cadastro/nova-prefeitura`: CEP preenche logradouro/bairro automaticamente, picker de cor funciona, logo preview funciona
- [ ] Configurações > Organização: LogoUploadField e HexColorPickerField exibidos

- [ ] **Step 4: Push**

```bash
git push origin master
```

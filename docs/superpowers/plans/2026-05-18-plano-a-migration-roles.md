# Plano A: Migration de Roles e Permissoes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expandir o enum `papel_usuario` de 6 para 8 papeis (adicionar `setor_compras` e `publicacao`, renomear `autoridade_competente` para `gestor_publico`) e atualizar todas as referencias no codebase.

**Architecture:** Migration SQL incremental (sem apagar dados), seguida de atualizacao cirurgica de tipos TypeScript e do arquivo de permissoes. Esta e a base para todos os outros planos deste ciclo de desenvolvimento.

**Tech Stack:** Supabase Postgres (ALTER TYPE), TypeScript, Next.js 14 App Router

---

## Mapeamento de Arquivos

| Arquivo | Acao | O que muda |
|---------|------|-----------|
| `supabase/migrations/20260518000001_add_roles_novos.sql` | Criar | Adiciona os 2 novos papeis e renomeia autoridade_competente |
| `src/types/database.ts` | Modificar | Atualiza tipo `PapelUsuario` |
| `src/lib/permissions.ts` | Modificar | Adiciona arrays de permissao para os novos papeis, renomeia referencias |
| `supabase/migrations/20260518000002_rls_novos_papeis.sql` | Criar | Atualiza policies que referenciam `autoridade_competente` |

---

### Task 1: Migration SQL — adicionar novos papeis ao enum

**Files:**
- Create: `supabase/migrations/20260518000001_add_roles_novos.sql`

Postgres nao permite remover valores de enum, mas permite adicionar novos e renomear via `ALTER TYPE ... RENAME VALUE`. O passo de renomear `autoridade_competente` para `gestor_publico` e uma operacao nativa do Postgres 14+.

- [ ] **Step 1: Criar arquivo de migration**

```sql
-- supabase/migrations/20260518000001_add_roles_novos.sql
-- ============================================================
-- Expansao do enum papel_usuario
-- Adiciona setor_compras e publicacao
-- Renomeia autoridade_competente para gestor_publico
-- Conforme spec: docs/superpowers/specs/2026-05-18-redesign-perfis-fluxo.md
-- ============================================================

-- Adiciona novos valores ao enum (nao destrói dados existentes)
ALTER TYPE papel_usuario ADD VALUE IF NOT EXISTS 'setor_compras';
ALTER TYPE papel_usuario ADD VALUE IF NOT EXISTS 'publicacao';

-- Renomeia autoridade_competente para gestor_publico
-- Atualiza o enum primeiro
ALTER TYPE papel_usuario RENAME VALUE 'autoridade_competente' TO 'gestor_publico';

-- Atualiza registros existentes na tabela usuarios
-- (o ALTER TYPE RENAME VALUE ja cuida do enum, mas se houver
--  colunas text com o valor antigo, atualizar aqui)
UPDATE usuarios
  SET papel = 'gestor_publico'
  WHERE papel::text = 'autoridade_competente';

-- Atualiza a constraint CHECK em permissoes_papel_organizacao
ALTER TABLE permissoes_papel_organizacao
  DROP CONSTRAINT IF EXISTS permissoes_papel_organizacao_papel_check;

ALTER TABLE permissoes_papel_organizacao
  ADD CONSTRAINT permissoes_papel_organizacao_papel_check
  CHECK (papel IN (
    'requisitante',
    'setor_compras',
    'setor_licitacao',
    'procurador',
    'gestor_publico',
    'admin_organizacao',
    'admin_plataforma',
    'publicacao'
  ));
```

- [ ] **Step 2: Verificar que o arquivo foi salvo corretamente**

```bash
cat supabase/migrations/20260518000001_add_roles_novos.sql
```

Expected: conteudo SQL completo sem erros de sintaxe visivel.

- [ ] **Step 3: Commitar**

```bash
git add supabase/migrations/20260518000001_add_roles_novos.sql
git commit -m "feat(db): adiciona setor_compras, publicacao; renomeia autoridade_competente para gestor_publico"
```

---

### Task 2: Migration SQL — RLS policies com o novo nome

As policies que antes referenciavam `'autoridade_competente'` precisam ser atualizadas para `'gestor_publico'`. Em Supabase, policies sao strings SQL; o `ALTER TYPE RENAME VALUE` nao as atualiza automaticamente se forem comparacoes de texto literais.

**Files:**
- Create: `supabase/migrations/20260518000002_rls_novos_papeis.sql`

- [ ] **Step 1: Verificar quais policies mencionam autoridade_competente**

```bash
grep -rn "autoridade_competente" supabase/migrations/
```

Expected: lista de arquivos e linhas com o valor antigo.

- [ ] **Step 2: Criar migration para recriar policies afetadas**

```sql
-- supabase/migrations/20260518000002_rls_novos_papeis.sql
-- ============================================================
-- Atualiza RLS policies que referenciavam autoridade_competente
-- ============================================================

-- Atualiza permissoes_papel_organizacao — policies que verificam papel via string literal
-- As policies existentes usam subquery em usuarios.papel (que ja foi renomeado via enum),
-- entao so precisam ser recriadas se usavam comparacao literal de texto.

-- Recria policy de autorizacoes (se existir tabela autorizacoes com RLS por papel)
DO $$
BEGIN
  -- Dropa policies antigas que comparam papel como texto
  DROP POLICY IF EXISTS "autorizacoes_gestor_insert" ON autorizacoes;
  DROP POLICY IF EXISTS "autorizacoes_gestor_update" ON autorizacoes;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Recria policies com o novo nome do papel
DO $$
BEGIN
  -- Insercao: apenas gestor_publico da propria org pode inserir autorizacao
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'autorizacoes') THEN
    EXECUTE $policy$
      CREATE POLICY "autorizacoes_gestor_insert" ON autorizacoes
        FOR INSERT WITH CHECK (
          organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
          AND (SELECT papel FROM usuarios WHERE id = auth.uid())
              IN ('gestor_publico', 'admin_organizacao', 'admin_plataforma')
        )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "autorizacoes_gestor_update" ON autorizacoes
        FOR UPDATE USING (
          organizacao_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
          AND (SELECT papel FROM usuarios WHERE id = auth.uid())
              IN ('gestor_publico', 'admin_organizacao', 'admin_plataforma')
        )
    $policy$;
  END IF;
END $$;

-- Atualiza tabela procuradores se existir coluna papel como text
DO $$
BEGIN
  UPDATE procuradores SET papel = 'gestor_publico' WHERE papel = 'autoridade_competente';
EXCEPTION WHEN undefined_table THEN NULL;
       WHEN undefined_column THEN NULL;
END $$;
```

- [ ] **Step 3: Commitar**

```bash
git add supabase/migrations/20260518000002_rls_novos_papeis.sql
git commit -m "feat(db): atualiza RLS policies para gestor_publico e novos papeis"
```

---

### Task 3: Atualizar tipo TypeScript `PapelUsuario`

**Files:**
- Modify: `src/types/database.ts` (linhas 7-12)

- [ ] **Step 1: Atualizar o tipo `PapelUsuario` em `src/types/database.ts`**

Localizar o bloco atual (linhas 7-12):
```typescript
export type PapelUsuario =
  | 'requisitante'
  | 'setor_licitacao'
  | 'procurador'
  | 'autoridade_competente'
  | 'admin_organizacao'
  | 'admin_plataforma'
```

Substituir por:
```typescript
export type PapelUsuario =
  | 'requisitante'
  | 'setor_compras'
  | 'setor_licitacao'
  | 'procurador'
  | 'gestor_publico'
  | 'publicacao'
  | 'admin_organizacao'
  | 'admin_plataforma'
```

- [ ] **Step 2: Verificar erros de tipo**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: erros listando todos os lugares que ainda referenciam `'autoridade_competente'` — esses serao corrigidos nos steps seguintes.

---

### Task 4: Atualizar `src/lib/permissions.ts`

**Files:**
- Modify: `src/lib/permissions.ts`

- [ ] **Step 1: Reescrever o arquivo completo com os novos papeis**

```typescript
import type { PapelUsuario } from '@/types/database'

// Roles que podem criar novos processos licitatorios
export const PODE_CRIAR_PROCESSO: PapelUsuario[] = [
  'requisitante', 'setor_compras', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma',
]

// Roles que podem editar documentos do wizard (DFD, ETP, TR, Cotacao, Riscos)
export const PODE_EDITAR_DOCUMENTOS: PapelUsuario[] = [
  'requisitante', 'setor_compras', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma',
]

// Tabs do processo visiveis para cada papel (slugs das etapas)
export const TABS_VISIVEIS_POR_PAPEL: Record<string, string[]> = {
  requisitante:      ['dfd', 'cotacao', 'etp', 'tr', 'riscos'],
  setor_compras:     ['dfd', 'cotacao', 'etp', 'tr', 'riscos', 'revisao'],
  setor_licitacao:   ['dfd', 'cotacao', 'etp', 'tr', 'riscos', 'edital', 'revisao', 'parecer', 'autorizacao', 'publicacao'],
  procurador:        ['parecer'],
  gestor_publico:    ['autorizacao'],
  publicacao:        ['publicacao'],
  admin_organizacao: ['dfd', 'cotacao', 'etp', 'tr', 'riscos', 'edital', 'revisao', 'parecer', 'autorizacao', 'publicacao'],
  admin_plataforma:  ['dfd', 'cotacao', 'etp', 'tr', 'riscos', 'edital', 'revisao', 'parecer', 'autorizacao', 'publicacao'],
}

// Roles que acessam apenas sua aba designada (sem ver o pipeline completo)
export const ACESSO_RESTRITO_PROCESSO: PapelUsuario[] = [
  'procurador', 'gestor_publico', 'publicacao',
]

// Roles que fazem a primeira revisao (Setor de Compras)
export const PODE_REVISAR_COMPRAS: PapelUsuario[] = [
  'setor_compras', 'admin_organizacao', 'admin_plataforma',
]

// Roles que fazem a segunda revisao e geram Edital/Oficio (Setor de Licitacoes)
export const PODE_REVISAR_LICITACOES: PapelUsuario[] = [
  'setor_licitacao', 'admin_organizacao', 'admin_plataforma',
]

// Roles que podem emitir parecer juridico (Art. 53 da Lei 14.133/21)
export const PODE_EMITIR_PARECER: PapelUsuario[] = [
  'procurador', 'admin_organizacao', 'admin_plataforma',
]

// Roles que podem autorizar a abertura do certame (Art. 72)
export const PODE_AUTORIZAR: PapelUsuario[] = [
  'gestor_publico', 'admin_organizacao', 'admin_plataforma',
]

// Roles que podem registrar publicacao no portal
export const PODE_PUBLICAR: PapelUsuario[] = [
  'publicacao', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma',
]

// Roles que podem acessar configuracoes da organizacao
export const PODE_CONFIGURAR: PapelUsuario[] = [
  'admin_organizacao', 'admin_plataforma',
]

/** Verifica se um papel tem uma determinada permissao. */
export function podeFazer(
  papel: PapelUsuario | null | undefined,
  permissao: PapelUsuario[]
): boolean {
  if (!papel) return false
  return permissao.includes(papel)
}

/**
 * Retorna a tab designada para papeis com acesso restrito ao processo.
 * Retorna null para papeis com acesso completo ao pipeline.
 */
export function getTabDesignada(papel: PapelUsuario): string | null {
  if (papel === 'procurador') return 'parecer'
  if (papel === 'gestor_publico') return 'autorizacao'
  if (papel === 'publicacao') return 'publicacao'
  return null
}

/** Label legivel de cada papel para exibicao em UI. */
export const LABEL_PAPEL: Record<PapelUsuario, string> = {
  requisitante:      'Requisitante',
  setor_compras:     'Setor de Compras',
  setor_licitacao:   'Setor de Licitacoes',
  procurador:        'Procuradoria',
  gestor_publico:    'Gestor Publico',
  publicacao:        'Publicacao',
  admin_organizacao: 'Administrador',
  admin_plataforma:  'Admin da Plataforma',
}

/** Cor de badge por papel, usada na timeline e no chat. */
export const COR_PAPEL: Record<PapelUsuario, string> = {
  requisitante:      '#3B82F6',
  setor_compras:     '#F59E0B',
  setor_licitacao:   '#7C3AED',
  procurador:        '#DC2626',
  gestor_publico:    '#059669',
  publicacao:        '#16A34A',
  admin_organizacao: '#475569',
  admin_plataforma:  '#1E293B',
}

/** Icone emoji por papel, usado na timeline visual do processo. */
export const ICONE_PAPEL: Record<PapelUsuario, string> = {
  requisitante:      '📝',
  setor_compras:     '🛒',
  setor_licitacao:   '⚖️',
  procurador:        '🏛️',
  gestor_publico:    '🤝',
  publicacao:        '📢',
  admin_organizacao: '⚙️',
  admin_plataforma:  '🔑',
}

/** Ordem dos papeis no fluxo de tramitacao (usado na timeline). */
export const ORDEM_FLUXO: PapelUsuario[] = [
  'requisitante',
  'setor_compras',
  'setor_licitacao',
  'procurador',
  'gestor_publico',
  'publicacao',
]
```

- [ ] **Step 2: Verificar erros de tipo apos a edicao**

```bash
npx tsc --noEmit 2>&1 | head -60
```

Expected: os erros agora serao apenas em arquivos que ainda usam `'autoridade_competente'` como literal de string (nao como tipo). Esses serao corrigidos na Task 5.

- [ ] **Step 3: Commitar**

```bash
git add src/types/database.ts src/lib/permissions.ts
git commit -m "feat(types): atualiza PapelUsuario com setor_compras, publicacao, gestor_publico; adiciona COR_PAPEL, ICONE_PAPEL, ORDEM_FLUXO"
```

---

### Task 5: Corrigir referencias residuais a `autoridade_competente`

**Files:**
- Modify: qualquer arquivo que use `'autoridade_competente'` como string literal

- [ ] **Step 1: Localizar todas as referencias**

```bash
grep -rn "autoridade_competente" src/ --include="*.ts" --include="*.tsx"
```

Expected: lista de arquivos com linha e contexto. Cada ocorrencia precisa ser trocada por `'gestor_publico'`.

- [ ] **Step 2: Aplicar substituicao global**

```bash
# Substituicao em todos os .ts e .tsx dentro de src/
find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/autoridade_competente/gestor_publico/g' {} +
```

- [ ] **Step 3: Verificar resultado**

```bash
grep -rn "autoridade_competente" src/
```

Expected: nenhum resultado (zero ocorrencias).

- [ ] **Step 4: Verificar tipos apos substituicao**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: zero erros de tipo relacionados ao enum.

- [ ] **Step 5: Commitar**

```bash
git add -A
git commit -m "fix(types): substitui todas as referencias a autoridade_competente por gestor_publico"
```

---

### Task 6: Atualizar `cached-permissions.ts` (se existir)

**Files:**
- Modify: `src/lib/cached-permissions.ts`

- [ ] **Step 1: Ler o arquivo**

```bash
cat src/lib/cached-permissions.ts
```

- [ ] **Step 2: Substituir referencias ao enum antigo**

Procurar qualquer ocorrencia de `'autoridade_competente'` e substituir por `'gestor_publico'`. Adicionar entradas para `'setor_compras'` e `'publicacao'` onde outros papeis estao listados, seguindo o padrao existente no arquivo.

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep -i "papel\|role\|permission" | head -20
```

Expected: zero erros relacionados a papeis.

- [ ] **Step 4: Commitar**

```bash
git add src/lib/cached-permissions.ts
git commit -m "fix(permissions): atualiza cached-permissions com novos papeis"
```

---

### Task 7: Verificacao final

- [ ] **Step 1: Rodar verificacao de tipos completa**

```bash
npx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 2: Rodar lint**

```bash
npx eslint src/ --ext .ts,.tsx --max-warnings 0 2>&1 | tail -20
```

Expected: zero warnings ou erros novos.

- [ ] **Step 3: Confirmar que o grep encontra zero referencias antigas**

```bash
grep -rn "autoridade_competente" src/ supabase/
```

Expected: zero resultados.

- [ ] **Step 4: Commit de verificacao (se nenhuma alteracao adicional)**

Nenhum commit necessario se os steps anteriores ja cobriram tudo.

---

## Notas para o implementador

- O `ALTER TYPE ... RENAME VALUE` e suportado no Postgres 10+. O Supabase usa Postgres 15, entao e seguro.
- A migration 00001 deve ser aplicada ANTES da 00002 (ordem numerica garante isso no Supabase).
- Se estiver usando Supabase local (`supabase start`), aplicar com `supabase db reset` ou `supabase migration up`.
- Se estiver em producao, aplicar via `supabase db push` ou pelo painel do Supabase (SQL Editor).
- O `cached-permissions.ts` pode ou nao existir — se nao existir, pular a Task 6.

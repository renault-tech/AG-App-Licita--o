# Profile Switcher e Modo Demo: Design

## Objetivo

Integrar o seletor de papel e o modo demo diretamente no dropdown do avatar no header, exclusivo para `admin_plataforma`. Remove a barra de rodape (`DemoSwitcher`) e o componente flutuante (`DemoPerfilSwitcher`). Introduce dois comportamentos distintos: simulacao de perspectiva na organizacao real e modo demo com prefeitura ficticia.

## Arquitetura

### Dois modos independentes

**Modo Perspectiva (fora do demo)**
- Admin master seleciona um papel no dropdown do avatar
- A UI filtra menus, tabs e views conforme as permissoes do papel selecionado
- Os dados sao reais (organizacao real do usuario)
- As server actions continuam usando o papel real (`admin_plataforma`) para autorizacao
- A filtragem e puramente de frontend

**Modo Demo**
- Admin master ativa a "Prefeitura Demo"
- O sistema carrega uma organizacao ficticia pre-semeada no Supabase
- Dentro do modo demo, o mesmo switcher de papel opera sobre a org ficticia
- Zero risco a dados reais
- Ao sair, retorna ao contexto real

### Logica de papel efetivo no layout

```typescript
const papelEfetivo =
  demoSession.ativo      ? demoSession.papelSimulado
  : viewAs.papel         ? viewAs.papel
  : papelAtual                                        // papel real do banco

// isAdminPlataforma usa SEMPRE o papel real, nunca o efetivo
const isAdminPlataforma = papelAtual === 'admin_plataforma'
```

O `papelEfetivo` e passado para:
- `AppHeader` (tabs de navegacao, indicadores)
- Dashboard page (qual view renderizar)
- Tabs do processo `[id]` (quais etapas aparecem)

As server actions **nao mudam**: `obterPapelUsuario()` continua retornando o papel real do banco.

---

## Estado: Dois Cookies Independentes

### Cookie novo: `licitaia_view_as`

Gerenciado por `src/lib/view-as-session.ts` (novo arquivo, espelho de `demo-session.ts`):

```typescript
export interface ViewAsSession {
  papel: PapelUsuario | null
}

export async function getViewAsSession(): Promise<ViewAsSession>
export async function setViewAs(papel: PapelUsuario): Promise<void>
export async function clearViewAs(): Promise<void>
```

Quando `demoSession.ativo === true`, o cookie `licitaia_view_as` e ignorado pelo layout. A troca de papel dentro do demo continua usando `trocarPapelDemo()` existente.

### Cookies de demo (existentes, sem alteracao)

`licitaia_demo_ativo`, `licitaia_demo_papel`, `licitaia_demo_org_id` em `src/lib/demo-session.ts`. Nenhum arquivo alterado.

---

## UI: Avatar Dropdown

### Estrutura do dropdown (somente quando `isAdminPlataforma`)

```
[Avatar] ▼
├── [nome do usuario]
├── [cargo]
├── Saldo: N creditos
│
│   [Quando simulando papel ou em modo demo]
│   ┌─────────────────────────────────────┐
│   │ 👁 Visualizando como: Procurador    │  ← fundo colorido (cor do papel)
│   │ [Voltar a visao completa]           │
│   └─────────────────────────────────────┘
│   ou
│   ┌─────────────────────────────────────┐
│   │ 🏛 Modo Demo: Prefeitura Exemplo    │  ← fundo laranja suave
│   │ [Sair do Modo Demo]                 │
│   └─────────────────────────────────────┘
│
├── ─────────────────────
├── Configuracoes
├── Usuarios
├── Secretarias
├── Creditos de IA
├── Administracao da Plataforma
├── ─────────────────────
│
│   VISUALIZAR COMO                        ← label de secao
│   ○ Requisitante
│   ○ Setor de Compras
│   ○ Setor de Licitacoes
│   ○ Procurador
│   ○ Gestor / Prefeito
│   ○ Publicacao
│   ○ Admin Organizacao
│   ─────────────────────
│   🏛 Prefeitura Demo
│
├── ─────────────────────
└── Sair da conta
```

### Indicador no avatar

Quando `papelEfetivo !== 'admin_plataforma'`:
- Borda colorida no avatar (cor vem de `COR_PAPEL[papelEfetivo]` em `permissions.ts`)
- Badge `👁` no canto superior direito do avatar
- Em modo demo: badge muda para `🏛`

Quando sem simulacao ativa:
- Avatar normal sem borda extra nem badge

---

## Prefeitura Demo no Supabase

### Migration: `supabase/migrations/20260521000003_demo_org_seed.sql`

Idempotente (verifica existencia pelo CNPJ `00.000.000/0001-00` antes de inserir).

**Organização:**
- Nome: "Prefeitura Municipal de Exemplo"
- CNPJ: 00.000.000/0001-00

**Secretarias (3):**
- Secretaria Municipal de Educacao
- Secretaria Municipal de Saude
- Secretaria Municipal de Obras

**Processos demo (2):**
- Processo 001/2026: Pregao Eletronico, aquisicao de material escolar
  - Etapas preenchidas: DFD, Cotacao, ETP, TR, Riscos
  - Status: aguardando parecer
- Processo 002/2026: Dispensa, servicos de manutencao predial
  - Etapas preenchidas: DFD, Cotacao
  - Status: em elaboracao

**Usuarios demo:**
Nao sao criados como registros reais em `auth.users` (complexidade desnecessaria). Os processos demo tem `criado_por` apontando para o proprio `admin_plataforma` que ativou o demo (lido via `auth.uid()` na migration nao e possivel, entao os processos usam um usuario placeholder). Na pratica, os nomes "Maria Silva", "Joao Santos" e "Ana Ferreira" aparecem apenas como texto nos campos de conteudo dos documentos (ex: campo `requisitante_nome` no DFD), sem FK real para `usuarios`. O campo `criado_por` dos processos demo recebe `NULL` ou um UUID hardcoded de um usuario demo criado na propria migration via INSERT em `usuarios` com `organizacao_id` da org demo.

**Configuracao da plataforma:**
Insere linha em `configuracoes_plataforma` com `chave = 'demo_org_id'` e `valor = <uuid da org demo>`, para que `iniciarModoDemo()` leia o ID sem hardcodar.

### Tabela `configuracoes_plataforma`

```sql
CREATE TABLE IF NOT EXISTS configuracoes_plataforma (
  chave  text PRIMARY KEY,
  valor  text NOT NULL
);
-- RLS: somente admin_plataforma pode ler/escrever
```

---

## Fluxos

### Entrar em simulacao de papel (fora do demo)

1. Admin master abre dropdown > clica em "Procurador"
2. Server action `setViewAsAction('procurador')` grava cookie `licitaia_view_as`
3. `router.refresh()` recarrega layout com `papelEfetivo = 'procurador'`
4. Avatar: borda roxa + badge `👁`
5. UI filtra para a perspectiva do Procurador

### Sair da simulacao

1. Abre dropdown > clica "Voltar a visao completa"
2. Server action `clearViewAsAction()` apaga cookie
3. `router.refresh()` restaura visao admin_plataforma

### Entrar no Modo Demo

1. Abre dropdown > clica "🏛 Prefeitura Demo"
2. Server action le `demo_org_id` de `configuracoes_plataforma`
3. Chama `iniciarModoDemo(orgDemoId)` (grava 3 cookies de demo)
4. Chama `clearViewAs()` (limpa qualquer simulacao ativa)
5. `router.refresh()` carrega a org ficticia

### Sair do Modo Demo

1. Abre dropdown > clica "Sair do Modo Demo"
2. Server action `sairModoDemo()` apaga cookies de demo
3. `router.refresh()` restaura contexto real

---

## Arquivos Afetados

### Novos
| Arquivo | Responsabilidade |
|---|---|
| `src/lib/view-as-session.ts` | Gerencia cookie `licitaia_view_as` |
| `supabase/migrations/20260521000003_demo_org_seed.sql` | Semeia org demo e tabela de config |

### Modificados
| Arquivo | Alteracao |
|---|---|
| `src/app/(dashboard)/layout.tsx` | Logica `papelEfetivo`, remove DemoSwitcher/DemoBanner/DemoPerfilSwitcher |
| `src/components/layout/app-header.tsx` | Secao "Visualizar como", indicadores no avatar, fluxo de troca |
| `src/lib/actions/usuario.ts` | `setViewAsAction`, `clearViewAsAction`, `iniciarModoDemoAction` (le `demo_org_id` de `configuracoes_plataforma` antes de chamar `iniciarModoDemo`) |

### Deletados
| Arquivo |
|---|
| `src/components/layout/demo-switcher.tsx` |
| `src/components/admin/demo-perfil-switcher.tsx` |
| `src/components/admin/demo-banner.tsx` |

---

## Restricoes e Seguranca

- A secao "Visualizar como" aparece APENAS quando `isAdminPlataforma === true`
- `isAdminPlataforma` e sempre calculado a partir do papel real do banco, nunca do `papelEfetivo`
- Server actions de mutacao (criar processo, emitir parecer, etc.) continuam usando `obterPapelUsuario()` que le o papel real, nao o simulado
- RLS no Supabase permanece intacto: a simulacao de papel nao bypassa nenhuma politica de banco
- A org demo deve ter RLS configurado normalmente, como qualquer outra org

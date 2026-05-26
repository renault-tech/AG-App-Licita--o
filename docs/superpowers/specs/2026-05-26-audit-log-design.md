# Audit Log — Design

> **Para workers agentes:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa por tarefa.

**Goal:** Criar um sistema de registro de auditoria de acoes dos usuarios, visivel apenas para administradores em Configuracoes, com exportacao CSV.

**Architecture:** Tabela `audit_log` no Postgres com RLS restrita a admins. Helper `registrarAuditoria()` instrumentado nas Server Actions existentes usando service client (fire-and-forget). UI em `/configuracoes/logs` com filtros de data, usuario e categoria, paginacao e exportacao CSV gerado server-side.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + RLS), TypeScript estrito, Server Actions, Server Components, Tailwind CSS, shadcn/ui.

---

## 1. Banco de Dados

### Tabela `audit_log`

```sql
create table audit_log (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  organizacao_id uuid not null references organizacoes(id) on delete cascade,
  usuario_id     uuid references usuarios(id) on delete set null,
  nome_usuario   text not null,
  papel_usuario  text not null,
  categoria      text not null check (categoria in ('processo', 'documento', 'usuario', 'organizacao')),
  acao           text not null,
  recurso_id     uuid,
  recurso_desc   text,
  detalhes       jsonb
);

-- Indices de performance
create index idx_audit_log_org_created  on audit_log (organizacao_id, created_at desc);
create index idx_audit_log_usuario      on audit_log (organizacao_id, usuario_id);
create index idx_audit_log_categoria    on audit_log (organizacao_id, categoria);

-- RLS
alter table audit_log enable row level security;

-- Leitura: somente admins da propria organizacao
create policy "audit_log leitura admin"
  on audit_log for select
  using (
    organizacao_id = get_organizacao_id()
    and get_papel_usuario() in ('admin_organizacao', 'admin_plataforma')
  );

-- Escrita: somente service role (via helper com service client)
-- Nenhuma policy de INSERT para usuarios normais
```

### Eventos registrados

| Categoria    | Acao                      | Gatilho                                  |
|--------------|---------------------------|------------------------------------------|
| processo     | `processo.criado`         | `criarProcessoInicial`                   |
| processo     | `processo.excluido`       | `excluirProcesso`                        |
| processo     | `processo.acessado`       | layout server component `[id]`           |
| processo     | `processo.tramitado`      | `src/lib/actions/tramitacao.ts`          |
| documento    | `dfd.editado`             | Server Action de save do DFD             |
| documento    | `etp.editado`             | Server Action de save do ETP             |
| documento    | `tr.editado`              | Server Action de save do TR              |
| documento    | `edital.editado`          | Server Action de save do Edital          |
| documento    | `parecer.editado`         | Server Action de save do Parecer         |
| documento    | `parecer.aprovado`        | Server Action de decisao do parecer      |
| documento    | `parecer.devolvido`       | Server Action de decisao do parecer      |
| usuario      | `usuario.convidado`       | Server Action de convite                 |
| usuario      | `usuario.papel_alterado`  | Server Action de mudanca de papel        |
| usuario      | `usuario.suspenso`        | Server Action de suspensao               |
| usuario      | `usuario.ativado`         | Server Action de reativacao              |
| organizacao  | `organizacao.atualizada`  | `atualizarOrganizacao`                   |

---

## 2. Helper `registrarAuditoria`

**Arquivo:** `src/lib/audit/log.ts`

```typescript
interface AuditoriaParams {
  organizacaoId: string
  usuarioId:     string
  nomeUsuario:   string
  papelUsuario:  string
  categoria:     'processo' | 'documento' | 'usuario' | 'organizacao'
  acao:          string
  recursoId?:    string
  recursoDesc?:  string
  detalhes?:     Record<string, unknown>
}

export async function registrarAuditoria(params: AuditoriaParams): Promise<void>
```

**Comportamento:**
- Usa `createServiceClient` (bypass de RLS — o log nunca pode ser bloqueado por permissao)
- Fire-and-forget: chamado com `void registrarAuditoria(...)` dentro das Server Actions
- Erros de escrita sao capturados e logados com `console.error` — nunca lancam excecao para o chamador
- A acao principal do usuario nunca e bloqueada por falha no log

**Uso nas Server Actions:**
```typescript
// Exemplo em excluirProcesso
void registrarAuditoria({
  organizacaoId: orgId,
  usuarioId:     user.id,
  nomeUsuario:   userData.nome_completo,
  papelUsuario:  userData.papel,
  categoria:     'processo',
  acao:          'processo.excluido',
  recursoId:     processoId,
  recursoDesc:   processo.objeto,
})
```

---

## 3. Interface

### Rota

`src/app/(dashboard)/configuracoes/logs/page.tsx`

Acesso restrito — o layout de configuracoes ja valida `PODE_CONFIGURAR`. O item "Logs" no sidebar so aparece para `admin_organizacao` e `admin_plataforma`.

### Arquivos

```
src/
  lib/
    audit/
      log.ts                        ← helper registrarAuditoria()
  app/(dashboard)/
    configuracoes/
      logs/
        page.tsx                    ← Server Component, lista paginada
        filtros-log.tsx             ← Client Component: filtros data/usuario/categoria
        exportar-csv.tsx            ← Client Component: botao exportacao
      sidebar-configuracoes.tsx     ← adicionar item "Logs" restrito a admins
```

### Pagina `/configuracoes/logs`

**Server Component** que recebe `searchParams` com: `de` (data inicio), `ate` (data fim, padrao hoje), `usuario_id`, `categoria`, `page` (padrao 1).

Renderiza:
- Cabecalho com titulo "Log de Auditoria" e botao "Exportar CSV"
- Componente de filtros (Client Component)
- Tabela com colunas: Data/Hora, Usuario, Papel, Acao, Recurso, Detalhes (expandivel)
- Paginacao (20 registros por pagina)

**Padrao de data padrao:** ultimos 30 dias.

### Tabela de logs

| Coluna     | Conteudo                                              |
|------------|-------------------------------------------------------|
| Data/Hora  | `dd/MM/yyyy HH:mm` em horario de Brasilia             |
| Usuario    | `nome_usuario` + badge com `papel_usuario`            |
| Acao       | label legivel mapeado do codigo (ex: "Processo excluido") |
| Recurso    | `recurso_desc` (texto truncado) linkavel se tiver ID  |
| Detalhes   | icone de expansao, abre inline com conteudo do JSONB  |

### Exportacao CSV

Botao "Exportar CSV" no cabecalho. Ao clicar:
1. Client Component chama Server Action `exportarAuditoriaCsv(filtros)`
2. Server Action executa a mesma query sem paginacao (limite de 10.000 registros)
3. Retorna string CSV formatada
4. Client faz download via `Blob` + `URL.createObjectURL`

Colunas do CSV: `Data`, `Hora`, `Usuario`, `Papel`, `Categoria`, `Acao`, `Recurso`, `Detalhes`

Sem dependencia de biblioteca externa — CSV gerado como template string no servidor.

---

## 4. Seguranca e Consistencia

- **RLS dupla:** tabela so aceita SELECT de admins; INSERT so via service role
- **Nome salvo no momento da acao:** `nome_usuario` e `papel_usuario` sao strings imutaveis no log, mesmo que o usuario seja renomeado ou tenha o papel alterado depois
- **Fire-and-forget:** falha no log nunca afeta a acao do usuario
- **Sem dados sensiveis no log:** `detalhes` nao deve conter senhas, tokens ou conteudo de documentos — apenas metadados (IDs, status, campos alterados)
- **Limite de exportacao:** 10.000 linhas por exportacao para evitar timeout

---

## 5. Mapeamento de Acoes para Labels

```typescript
// src/lib/audit/labels.ts
export const LABEL_ACAO: Record<string, string> = {
  'processo.criado':        'Processo criado',
  'processo.excluido':      'Processo excluido',
  'processo.acessado':      'Processo acessado',
  'processo.tramitado':     'Processo encaminhado',
  'dfd.editado':            'DFD editado',
  'etp.editado':            'ETP editado',
  'tr.editado':             'TR editado',
  'edital.editado':         'Edital editado',
  'parecer.editado':        'Parecer editado',
  'parecer.aprovado':       'Parecer aprovado',
  'parecer.devolvido':      'Parecer devolvido',
  'usuario.convidado':      'Usuario convidado',
  'usuario.papel_alterado': 'Papel de usuario alterado',
  'usuario.suspenso':       'Usuario suspenso',
  'usuario.ativado':        'Usuario reativado',
  'organizacao.atualizada': 'Configuracoes da organizacao atualizadas',
}
```

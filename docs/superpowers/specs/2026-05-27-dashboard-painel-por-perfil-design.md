# Dashboard Painel por Perfil — Design Spec

**Data:** 2026-05-27
**Escopo:** Redesign completo do painel `/dashboard` para todos os 8 papéis de usuário, com funil de fases clicável, cards configuráveis, busca global em tempo real e navegação por URL com filtros pré-aplicados.

---

## Arquitetura de Arquivos

### App Router
```
src/app/(dashboard)/dashboard/
  page.tsx                           ← roteador fino: lê papel e redireciona
  dashboard-requisitante.tsx         ← Server Component
  dashboard-compras.tsx
  dashboard-licitacoes.tsx
  dashboard-procurador.tsx
  dashboard-gestor-publico.tsx
  dashboard-publicacao.tsx
  dashboard-admin-org.tsx
  dashboard-admin-master.tsx         ← visão global da plataforma

src/app/(dashboard)/admin/prefeituras/
  [orgId]/
    page.tsx                         ← drill-down de prefeitura específica (Admin Master)
```

### Componentes Compartilhados
```
src/components/dashboard/
  fase-timeline.tsx          ← funil de fases clicável (Client Component)
  pendencias-card.tsx        ← card de pendências com config de dias
  card-config-shell.tsx      ← shell: gear discreto + popover de configuração
  busca-global.tsx           ← search no AppHeader com dropdown realtime
  processo-row-dashboard.tsx ← linha de processo adaptada para dashboard
  kpi-bar.tsx                ← extraído de dashboard/page.tsx (atualizar import lá)
```

### Migrations
```
supabase/migrations/
  20260527000002_dashboard_preferencias.sql
  20260527000003_search_tsvector_processos.sql
```

---

## Componentes Compartilhados — Especificação

### FaseTimeline
- Faixa horizontal no topo de cada dashboard operacional (todos exceto admins)
- Cada nó = uma fase do fluxo: Requisitante → Compras → Licitações → Procuradoria → Gestor → Publicação
- Cada nó exibe a contagem de processos naquela fase (0 é válido e exibido)
- Clicar no nó navega para `/processos?fase=<fase>` (ou `/processos?criado_por=me&fase=<fase>` para Requisitante)
- Fase com processos devolvidos: nó fica vermelho
- Fase com processos parados além do threshold: nó fica âmbar
- Fase atual do usuário: destaque visual (borda accent, fundo primaryWash)
- Props: `fases: { key: string; label: string; count: number; devolvidos: number; parados: number; href: string }[]`

### PendenciasCard
- Card listando processos parados há ≥ N dias na fase relevante do usuário
- Ordenação: mais antigo primeiro
- Cada linha: nome do processo, dias parado (badge vermelho/âmbar), link para o processo
- Engrenagem no canto superior direito abre `CardConfigShell`
- Config disponível: campo numérico "Avisar após X dias parado" (mín: 1, máx: 90, padrão: 5)
- Persiste em `dashboard_preferencias` com `config_key = 'pendencias_dias'`
- Se lista vazia: empty state "Nenhuma pendência no momento"

### CardConfigShell
- Wrapper reutilizável para qualquer card configurável
- Props: `configKey: string`, `configContent: ReactNode`, `children: ReactNode`
- Ícone de engrenagem (`Settings` lucide) discreto, `opacity-40 hover:opacity-100`, canto superior direito do card
- Abre Popover (shadcn) com o `configContent`
- Ao fechar o popover, dispara Server Action `salvarPreferenciaDashboard(userId, configKey, value)`
- Não recarrega a página: usa optimistic update

### BuscaGlobal
- Input no `AppHeader` existente (substituir ou complementar o que existe)
- Debounce de 300ms após digitação
- Query cobre: `processos_licitatorios.numero_processo`, `.objeto`, `.modalidade`, `.valor_estimado` (faixa se digitar número), `cotacoes_itens.descricao`, `secretarias.nome`
- Resultados: dropdown com até 8 resultados, agrupados por status (Em andamento / Concluídos / Rascunhos)
- Cada resultado mostra: número do processo (ou objeto truncado), modalidade, StatusPill
- `Enter` ou clique num resultado: navega para `/processos?q=<termo>`
- `Escape`: fecha dropdown
- Respeita RLS: usuário vê apenas processos da sua organização; Requisitante vê apenas os seus

### ProcessoRowDashboard
- Variante de `ProcessoRow` para uso nos dashboards
- Adiciona: badge de fase atual, badge de "X dias parado" (âmbar/vermelho conforme threshold)
- Remove: `tempoRelativo` (substituído pelo badge de dias parado quando relevante)
- Sempre leva ao documento principal da fase atual do processo

---

## Dashboards por Papel

### Requisitante
**Dados exibidos:** apenas processos criados pelo próprio usuário (`criado_por = auth.uid()`)

**Layout (de cima para baixo):**
1. `SectionHeader` com edition, contextLine e cargo
2. `FaseTimeline` — fases com contagem dos processos dele
3. `KPIBar` — Total criados | Em andamento | Concluídos | Créditos IA usados (mês)
4. Card de Notificações — notificações não lidas, clicável para `/notificacoes`
5. Card de Demandas de Compra Conjunta — demandas recebidas aguardando adesão, clicável para cada demanda
6. `PendenciasCard` — processos dele parados há N dias (configurável)
7. Lista: 5 processos mais recentes com `ProcessoRowDashboard`
8. `FooterEditorial`

**Permissões de leitura:** após o processo avançar de fase, o Requisitante pode visualizar todos os documentos em modo leitura. Comentários via chat do processo.

**Navegação dos cards:** todos os cards de fase e pendências levam a `/processos?criado_por=me&fase=<fase>`.

---

### Setor de Compras
**Dados exibidos:** processos da organização em fase `setor_compras`

**Layout:**
1. `SectionHeader`
2. `FaseTimeline` — foco na fase `setor_compras`, demais fases como contexto
3. `KPIBar` — Na fila | Cotações feitas (semana) | Valor total em cotação | Créditos IA
4. Alerta (se fila > 0): lembrete do Art. 23 da Lei 14.133/21
5. `PendenciasCard` — processos aguardando cotação há N dias
6. Lista: fila de processos ordenada por mais antigo
7. Lista secundária: processos com cotação concluída (últimos 10)
8. `FooterEditorial`

---

### Setor de Licitações
**Dados exibidos:** todos os processos da organização (visão operacional completa)

**Layout:**
1. `SectionHeader`
2. `FaseTimeline` — todos os processos da organização por fase
3. `KPIBar` — Na minha fila | Em procuradoria | Devolvidos (vermelho se > 0) | Publicados
4. Card de Editais: editais aguardando assinatura | em elaboração | publicados
5. `PendenciasCard` — processos devolvidos para correção há N dias
6. Lista: processos na fase `setor_licitacao`
7. Lista secundária: enviados para procuradoria (até 5)
8. `FooterEditorial`

**Nota:** compra conjunta não aparece neste painel.

---

### Procurador
**Dados exibidos:** pareceres da organização vinculados ao usuário ou à organização (conforme configuração)

**Layout:**
1. `SectionHeader`
2. `FaseTimeline` — fases de parecer: Pendente | Aprovado | Aprovado c/ ressalvas | Devolvido
3. `KPIBar` — Fila de análise | Aprovados (mês) | Devolvidos | Tempo médio de resposta (dias)
4. `PendenciasCard` — processos com parecer pendente há N dias
5. Lista: fila de pareceres ordenada por mais antigo
6. Lista secundária: histórico de pareceres emitidos
7. `FooterEditorial`

---

### Gestor Público (Autoridade Competente)
**Dados exibidos:** autorizações da organização

**Layout:**
1. `SectionHeader`
2. `FaseTimeline` — Aguardando autorização | Autorizado | Devolvido
3. `KPIBar` — Aguardando minha decisão | Autorizados (mês) | Devolvidos | Valor total autorizado
4. `PendenciasCard` — processos aguardando autorização há N dias
5. Lista: processos pendentes de autorização
6. Lista secundária: histórico de autorizações
7. `FooterEditorial`

---

### Publicação (Setor de Comunicações)
**Dados exibidos:** publicações e processos prontos para publicar

**Layout:**
1. `SectionHeader`
2. `FaseTimeline` — Aguardando publicação | Publicado (PNCP) | Publicado (Diário Oficial) | Publicado (Portal)
3. `KPIBar` — Aguardando | Publicados (semana) | Com número PNCP | Sem PNCP ainda
4. `PendenciasCard` — processos autorizados aguardando publicação há N dias
5. Lista: processos aguardando publicação
6. Lista secundária: histórico de publicações (com links, datas e veículo)
7. `FooterEditorial`

---

### Admin Organização
**Dados exibidos:** visão gerencial da própria prefeitura. Sem acesso a editar documentos.

**Layout:**
1. `SectionHeader` — subtítulo: nome da prefeitura
2. `KPIBar` — Usuários ativos | Processos em andamento | Créditos consumidos (mês) | Créditos disponíveis
3. Card de Uso de IA: tabela de consumo por usuário, clicável por usuário (abre sheet com histórico individual). Configurável: período (7/15/30/60/90 dias via `CardConfigShell`)
4. Card de Usuários: lista com papel, status (ativo/pendente/suspenso), último acesso. Botão "Gerenciar" → `/configuracoes/usuarios`
5. Card de Processos por Fase: totais de todos os processos da org agrupados por fase (leitura)
6. `FooterEditorial`

**Nota:** Admin Organização não vê dados de outras prefeituras, não edita documentos.

---

### Admin Master — Visão Global
**Dados exibidos:** dados de toda a plataforma via `createServiceClient()`

**Layout:**
1. `SectionHeader` — supTitle "Administração da Plataforma"
2. `KPIBar` — Total de prefeituras | Total de usuários | Total de processos | Ações de IA (período configurável)
3. Card de Ações de IA: gráfico de consumo total. Filtro de período: 7, 15, 30, 60, 90 dias (configurável via `CardConfigShell`, persiste em `ia_periodo_dias`). Clicável por prefeitura.
4. Lista de Prefeituras: cada linha mostra nome, município/estado, usuários ativos, processos, consumo de IA. Clicável → abre `DashboardAdminPrefeitura`
5. Filtros na lista de prefeituras: por estado, por município, por faixa de consumo de IA
6. `FooterEditorial`

### Admin Master — Visão Prefeitura Específica
**Rota:** `/admin/prefeituras/[orgId]` ou painel inline com breadcrumb

**Layout:**
1. Breadcrumb: "Plataforma > Prefeituras > [Nome da Prefeitura]" com link de volta
2. Herda **todo** o layout do Admin Organização com os dados daquela prefeitura
3. Adiciona: histórico completo de créditos (compras + consumo), log de auditoria, botão "Conceder créditos"
4. Admin Master pode ver e fazer tudo que qualquer outro papel pode — quando navegar para um processo específico, vê todos os documentos e ações disponíveis para aquele processo

---

## Modelo de Dados

### Tabela `dashboard_preferencias`
```sql
CREATE TABLE dashboard_preferencias (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id     uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id),
  config_key     text NOT NULL,
  config_value   jsonb NOT NULL DEFAULT '{}',
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, config_key)
);

ALTER TABLE dashboard_preferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proprias preferencias" ON dashboard_preferencias
  FOR ALL USING (usuario_id = auth.uid());
```

**Chaves de configuração:**

| config_key | Papéis | Padrão |
|---|---|---|
| `pendencias_dias` | todos os operacionais | `{"dias": 5}` |
| `ia_periodo_dias` | admin_master, admin_org | `{"dias": 30}` |

### Índice Full-Text para Busca
```sql
ALTER TABLE processos_licitatorios
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('portuguese',
      coalesce(numero_processo, '') || ' ' ||
      coalesce(objeto, '') || ' ' ||
      coalesce(modalidade::text, '')
    )
  ) STORED;

CREATE INDEX idx_processos_search ON processos_licitatorios USING gin(search_vector);
```

---

## Busca Global — Comportamento Detalhado

- Campo no `AppHeader`, visível em todas as páginas do dashboard
- Debounce 300ms
- Query paralela em:
  - `processos_licitatorios`: `search_vector @@ plainto_tsquery('portuguese', termo)` + `ilike` em `numero_processo`
  - `cotacoes_itens`: `ilike` em `descricao`
  - Resultado de cotacoes é "colapsado" no processo pai
- Dropdown: máximo 8 resultados, agrupados por status
- Resposta esperada: < 200ms (com índice GIN)
- `Enter` / clique no resultado: `/processos?q=<termo>`
- `Escape`: fecha sem navegar
- RLS aplicada: Requisitante vê apenas seus processos; demais veem os da organização; Admin Master usa service client

---

## Navegação por URL

Todos os cards e nós da FaseTimeline geram URLs navegáveis:

```
/processos?fase=setor_licitacao
/processos?criado_por=me&fase=em_revisao
/processos?q=compra+cadeiras
/processos?q=compra+cadeiras&modalidade=pregao_eletronico
/processos?fase=procurador&status=devolvido
/admin/prefeituras/[orgId]
```

A página `/processos` já existente deve aceitar esses query params e pré-aplicar os filtros ao carregar.

---

## Restrições e Guardrails

- Admin Organização **nunca** vê dados de outras prefeituras
- Requisitante **nunca** vê processos de outros requisitantes (RLS + filtro `criado_por`)
- Todos os dashboards usam `createClient()` (RLS ativa), exceto Admin Master que usa `createServiceClient()` na visão global
- Configurações de card são por usuário, não por organização
- Busca sempre respeita RLS (não há bypass de organização para usuários não-admin)
- Documentos exibidos fora da fase do usuário são sempre somente leitura

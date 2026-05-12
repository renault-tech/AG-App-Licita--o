# Módulo Procuradoria — Design Spec

**Data:** 2026-05-12
**Autor:** Daniel Renault de Castro

---

## Objetivo

Criar uma área de trabalho dedicada ao procurador jurídico para gerenciar, redigir e emitir pareceres jurídicos conforme o Art. 53 da Lei 14.133/21. O módulo inclui: fila de pareceres com priorização por prazo, fluxo estruturado de redação com veredito, suporte de IA como consultora jurídica, minuta inicial gerada por IA, painel de precedentes por similaridade, e configurações globais de prazo no painel do admin master.

---

## Fluxo completo do parecer

```
Processo chega na etapa "parecer"
  → Notificação para procuradores da org
  → Fila /procuradoria — botão "Criar parecer"

Criar parecer:
  1. Procurador seleciona veredito: Aprovar / Aprovar com ressalvas / Parecer contrário
  2. Sistema oferece opção de carregar minuta gerada por IA (baseada nos docs do processo)
  3. Procurador redige/edita o texto livremente no editor
  4. Painel de precedentes exibe pareceres similares (só se houver similaridade relevante)
  5. Botão "Analisar com IA" — gera análise jurídica independente do texto atual:
     corrobora ou questiona os argumentos, aponta riscos legais, cita artigos da Lei 14.133/21
  6. Procurador decide se incorpora ou ignora a análise
  7. Procurador emite o parecer (salva + muda status)
  8. Assinatura eletrônica (adapter existente)

Após emissão:
  - Aprovado / Aprovado com ressalvas → processo avança para etapa "autorizacao"
  - Parecer contrário → setor de licitações recebe notificação; decide entre corrigir (volta para revisão) ou arquivar
```

---

## 1. Rota /procuradoria

### Acesso
Guard em `layout.tsx`: apenas `procurador`, `admin_organizacao`, `admin_plataforma`. Outros papéis são redirecionados para `/dashboard`.

### Estrutura da página
Página única com 3 abas:

| Aba | Status incluídos | Ordenação |
|---|---|---|
| Pendentes | `pendente` | Mais antigos primeiro (maior urgência) |
| Em análise | `em_analise` | Mais antigos primeiro |
| Histórico | `aprovado`, `aprovado_com_ressalvas`, `contrario` | Mais recentes primeiro |

### Campos exibidos por item da lista
1. Objeto do processo
2. Número do processo
3. Modalidade (Pregão, Concorrência, Dispensa, etc.)
4. Valor estimado
5. Secretaria requisitante
6. Data de envio para a procuradoria
7. Status do parecer (badge colorido)
8. Badge de urgência (baseado em dias configurados no admin)

### Badge de urgência
- Leitura da tabela `configuracoes_plataforma`:
  - `prazo_urgencia_parecer_dias` (padrão: 5) → badge "URGENTE" vermelho
  - `prazo_alerta_parecer_dias` (padrão: 10) → badge "ATENÇÃO" âmbar
- Cálculo: `hoje - data_envio_para_procuradoria > prazo`
- Se não atingiu nenhum prazo: badge "NOVO" (verde) se menos de 2 dias, sem badge se entre 2 e o limite de atenção

### Botão contextual
- Parecer sem conteúdo e status `pendente`: botão "Criar parecer"
- Parecer com conteúdo ou status `em_analise`: botão "Abrir parecer"

### KPIs no topo
- Total pendentes (vermelho se > 0)
- Total em análise
- Total emitidos no mês corrente

---

## 2. Tela do parecer — /processos/[id]/parecer

### Seletor de veredito
Exibido proeminentemente no topo, antes do editor. Três opções exclusivas:
- **Aprovar** — processo avança para autorização ao emitir
- **Aprovar com ressalvas** — avança para autorização; campo de ressalvas obrigatório no momento da emissão
- **Parecer contrário** — devolve para o setor de licitações ao emitir; motivo obrigatório

O veredito é salvo no banco ao ser selecionado (`salvarVeredito` action). Se o procurador mudar de ideia, pode alterar antes de emitir.

Ao selecionar veredito pela primeira vez, o status muda de `pendente` para `em_analise`.

### Minuta inicial por IA
Botão "Gerar minuta" disponível quando o editor está vazio. A IA lê DFD, TR, ETP e Edital do processo e gera uma minuta de parecer coerente com o veredito selecionado. O texto é inserido no editor como ponto de partida. O procurador edita livremente. Consome créditos de IA (registrado em `acoes_ia`).

**Requisito:** veredito deve estar selecionado antes de gerar a minuta. Se não estiver, o botão exibe tooltip "Selecione o veredito antes de gerar a minuta".

### Editor de texto
Editor rico (textarea com formatação básica — padrão do projeto). Salvamento automático a cada mudança (debounce 2s). Campo `conteudo` na tabela `pareceres`.

### Botão "Analisar com IA"
Disponível a qualquer momento após o procurador ter redigido ao menos 100 caracteres. Gera análise jurídica independente que:
- Corrobora ou questiona os argumentos jurídicos presentes no texto
- Aponta riscos legais específicos ao objeto e modalidade
- Cita artigos da Lei 14.133/21 aplicáveis
- Não reescreve o parecer — apresenta a análise num painel separado à direita/abaixo do editor

A análise é salva no campo `analise_ia` da tabela `pareceres`. O procurador lê e decide se incorpora algo. Consumo de créditos registrado em `acoes_ia`.

### Painel lateral de documentos
Colapsável, abre à direita do editor. Lista os documentos do processo disponíveis (DFD, TR, ETP, Edital) com link para abrir cada um em nova aba. Permite consulta sem sair da tela do parecer.

### Painel de precedentes
Exibido somente quando o sistema encontra pareceres anteriores com similaridade relevante ao objeto/tema do processo atual. Critérios de busca por similaridade:
- Objeto do processo (palavras-chave)
- Modalidade
- Faixa de valor (±50%)

A busca considera pareceres de:
- Mesma organização: sempre incluídos
- Outras organizações: incluídos apenas se a org optou por participar do pool coletivo (configurável em `configuracoes_organizacao`)

Para cada precedente exibido:
- Objeto do processo relacionado
- Veredito emitido (Aprovado / Aprovado com ressalvas / Contrário)
- Procurador responsável (nome, da mesma org; anonimizado de outras orgs)
- Data
- Indicação "Em linha" ou "Divergente" em relação ao veredito atual sendo redigido

Se nenhum precedente relevante for encontrado, o painel não aparece.

O banco aprende com cada parecer emitido: ao emitir, o sistema indexa o parecer na tabela `pareceres_precedentes` com os metadados de similaridade.

---

## 3. Configurações globais — /admin/configuracoes-plataforma

Nova página no painel do `admin_plataforma`, acessível via sidebar admin.

### Campos configuráveis (fase inicial)
| Chave | Label | Padrão | Descrição |
|---|---|---|---|
| `prazo_urgencia_parecer_dias` | Urgência de parecer (dias) | 5 | Dias sem parecer para badge "URGENTE" |
| `prazo_alerta_parecer_dias` | Alerta de prazo (dias) | 10 | Dias sem parecer para badge "ATENÇÃO" |

Formulário simples com inputs numéricos, validação (urgência < alerta), botão salvar. Exibe data/usuário da última alteração.

---

## 4. Modelo de dados

### Tabela `configuracoes_plataforma` (nova)
```sql
CREATE TABLE configuracoes_plataforma (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave       text NOT NULL UNIQUE,
  valor       text NOT NULL,
  descricao   text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES usuarios(id)
);
-- RLS: leitura para todos autenticados, escrita restrita a admin_plataforma
```

### Tabela `pareceres_precedentes` (nova)
```sql
CREATE TABLE pareceres_precedentes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parecer_id      uuid NOT NULL REFERENCES pareceres(id) ON DELETE CASCADE,
  organizacao_id  uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  objeto_keywords text[],         -- palavras-chave extraídas do objeto
  modalidade      text,
  faixa_valor     text,           -- 'ate_50k','50k_100k','100k_500k','acima_500k'
  veredito        text NOT NULL,  -- 'aprovar','aprovar_com_ressalvas','contrario'
  procurador_id   uuid REFERENCES usuarios(id),
  emitido_em      timestamptz NOT NULL DEFAULT now(),
  participa_pool  boolean NOT NULL DEFAULT false -- se org optou por pool coletivo
);
CREATE INDEX idx_precedentes_keywords ON pareceres_precedentes USING gin(objeto_keywords);
CREATE INDEX idx_precedentes_modalidade ON pareceres_precedentes(modalidade, faixa_valor);
-- RLS: org lê seus próprios + os que têm participa_pool = true
```

### Alterações na tabela `pareceres`
```sql
ALTER TABLE pareceres
  ADD COLUMN veredito    text CHECK (veredito IN ('aprovar','aprovar_com_ressalvas','contrario')),
  ADD COLUMN analise_ia  text,
  ADD COLUMN ressalvas   text,   -- obrigatório quando veredito = 'aprovar_com_ressalvas'
  ADD COLUMN motivo_contrario text; -- obrigatório quando veredito = 'contrario'
```

### Alteração no enum `status_parecer`
```sql
ALTER TYPE status_parecer ADD VALUE 'em_analise' BEFORE 'aprovado';
ALTER TYPE status_parecer ADD VALUE 'contrario'  AFTER 'aprovado_com_ressalvas';
```

### Alteração em `organizacoes` (existente)
```sql
ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS participa_pool_precedentes boolean NOT NULL DEFAULT false;
```

---

## 5. Mapa de arquivos

### Novos
| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20260512000006_procuradoria.sql` | Todas as alterações de banco acima |
| `src/lib/actions/procuradoria.ts` | `listarPareceresOrg`, `marcarEmAnalise`, `salvarVeredito`, `salvarConteudo`, `emitirParecer`, `gerarMinutaIA`, `analisarComIA`, `buscarPrecedentes` |
| `src/lib/actions/configuracoes-plataforma.ts` | `obterConfiguracoes`, `salvarConfiguracao` |
| `src/app/(dashboard)/procuradoria/layout.tsx` | Guard de acesso por papel |
| `src/app/(dashboard)/procuradoria/page.tsx` | Server Component: busca pareceres + configs de prazo |
| `src/app/(dashboard)/procuradoria/lista-pareceres.tsx` | Client Component: abas, lista, badges, KPIs |
| `src/app/(dashboard)/admin/configuracoes-plataforma/page.tsx` | Formulário de configs globais |
| `src/app/(dashboard)/processos/[id]/parecer/painel-documentos.tsx` | Painel lateral colapsável |

### Modificados
| Arquivo | O que muda |
|---|---|
| `src/app/(dashboard)/processos/[id]/parecer/page.tsx` | Passa `veredito`, `analise_ia`, `precedentes` para o editor |
| `src/app/(dashboard)/processos/[id]/parecer/editor-parecer.tsx` | Seletor de veredito, botão "Gerar minuta", botão "Analisar com IA", painel de análise, painel de precedentes, painel de documentos |
| `src/app/(dashboard)/admin/sidebar-admin.tsx` | Link "Configurações da Plataforma" |
| `src/components/layout/navbar.tsx` | Link "Procuradoria" visível para `procurador` e admins |
| `src/types/database.ts` | `StatusParecer` atualizado com `em_analise` e `contrario` |

---

## 6. Guardrails de IA

- A IA **nunca emite o parecer** — apenas gera minuta e análise consultiva
- Toda saída de IA exibe aviso: "Análise gerada por IA. A decisão final é de responsabilidade exclusiva do procurador signatário."
- A análise é apresentada em painel separado, nunca sobrescreve o texto do procurador
- Consumo de créditos registrado em `acoes_ia` antes de cada chamada; saldo verificado antes de executar
- Campo `gerado_por_ia: true` marcado quando minuta é usada como base

---

## 7. Notificações

| Evento | Destinatário | Mensagem |
|---|---|---|
| Processo chega em "parecer" | Todos os procuradores da org | "Novo processo aguarda parecer jurídico: [objeto]" |
| Procurador emite parecer contrário | Setor de licitações | "Parecer contrário emitido pela procuradoria para: [objeto]. Acesse para decidir." |
| Procurador emite parecer favorável | Autoridade competente | "Parecer jurídico aprovado. Processo [número] aguarda sua autorização." |

---

## 8. Fora de escopo (próximas fases)

- Busca semântica vetorial nos precedentes (fase futura — hoje usa keywords)
- Notificação por e-mail para procuradores externos
- Múltiplos procuradores no mesmo parecer (coautoria)
- Prazo legal obrigatório (SLA com escalação automática)

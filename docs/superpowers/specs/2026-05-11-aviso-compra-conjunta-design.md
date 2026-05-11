# Aviso de Compra Conjunta — Design Spec

## Objetivo

Permitir que uma secretaria que pretende abrir um processo licitatório comunique sua intenção às demais secretarias da organização, possibilitando que estas adiram formalmente à compra, informando suas quantidades, itens adicionais, fiscal do contrato e dotação orçamentária. Ao encerrar o prazo, a secretaria de origem visualiza um consolidado unificado e inicia o processo com todos os dados pré-carregados no wizard.

---

## Fluxo geral

```
Secretaria de Origem
  1. Acessa "Novo Aviso de Compra Conjunta" (módulo independente no dashboard)
  2. Preenche: modalidade, categoria, itens próprios (com quantidades), prazo, destinatárias
  3. Envia aviso → sistema cria notificações para todas as destinatárias

Secretarias Destinatárias
  4. Recebem notificação no sino → clicam no link
  5. Veem os itens (sem quantidades da origem) e preenchem: quantidade desejada por item,
     itens adicionais (mesma categoria), fiscal do contrato, dotação orçamentária
  6. Confirmam adesão (todos os campos são obrigatórios)

Secretaria de Origem (acompanhamento)
  7. Vê painel com status de cada secretaria + tabela consolidada parcial em tempo real
  8. Pode encerrar o prazo antecipadamente
  9. Quando prazo vence (ou encerra manualmente):
     - Se nenhuma secretaria aderiu → sistema pergunta se quer prosseguir mesmo assim
     - Se ao menos uma aderiu → botão "Iniciar Processo" fica disponível
  10. Clica em "Iniciar Processo" → wizard abre pré-preenchido com todos os itens consolidados
```

---

## Decisões de design

| Decisão | Escolha | Razão |
|---|---|---|
| Onde o módulo se encaixa | Módulo separado com integração ao wizard | Fluxo limpo, aviso pode durar dias sem travar o wizard |
| Layout do formulário de criação | Página linear (uma tela) | Simples, tudo visível de uma vez |
| Layout da tela de adesão | Tabela com quantidade inline por item | Eficiente para preencher vários itens |
| Layout do painel de acompanhamento | Tudo em uma tela: status + consolidado + ação | Sem abas, visão completa imediata |
| Quem pode criar um aviso | Qualquer usuário que possa criar processos | Mesmo papel que acessa o wizard |
| Prazo vence sem adesões | Sistema pergunta se quer prosseguir | Não bloqueia, mas confirma antes |
| Item de categoria diferente na adesão | Bloqueio imediato, não permite salvar | Sem ambiguidade, integridade dos dados |
| Fiscal e dotação na adesão | Obrigatórios para confirmar adesão | Sem dados incompletos no consolidado |

---

## Banco de dados (novas tabelas)

### `avisos_compra_conjunta`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `organizacao_id` | uuid FK organizacoes | RLS |
| `secretaria_origem_id` | uuid FK secretarias | Quem criou o aviso |
| `criado_por` | uuid FK usuarios | |
| `modalidade` | text | Enum ModalidadeLicitacao |
| `categoria_objeto` | text | Enum CategoriaObjeto |
| `prazo_adesao` | timestamptz | Data limite para resposta |
| `status` | text | `aberto` / `encerrado` / `processo_iniciado` |
| `processo_id` | uuid FK processos_licitatorios nullable | Preenchido ao iniciar o processo |
| `created_at` | timestamptz | |

### `avisos_itens`

Itens declarados pela secretaria de origem.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `aviso_id` | uuid FK avisos_compra_conjunta | |
| `descricao` | text | Nome do item |
| `unidade` | text | Ex: "unidade", "caixa" |
| `quantidade_origem` | integer | Qtd da secretaria de origem |
| `categoria_objeto` | text | Mesma categoria do aviso (redundante para validação) |

### `avisos_destinatarias`

Secretarias que foram convidadas.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `aviso_id` | uuid FK avisos_compra_conjunta | |
| `secretaria_id` | uuid FK secretarias | |
| `status` | text | `pendente` / `aderiu` / `recusou` |
| `respondido_em` | timestamptz nullable | |

### `avisos_adesoes`

Resposta de cada secretaria aderente.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `aviso_id` | uuid FK avisos_compra_conjunta | |
| `secretaria_id` | uuid FK secretarias | |
| `fiscal_nome` | text | Obrigatório |
| `dotacao_orcamentaria` | text | Obrigatório |
| `created_at` | timestamptz | |

### `avisos_adesoes_itens`

Itens que a secretaria aderente está pedindo.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `adesao_id` | uuid FK avisos_adesoes | |
| `aviso_item_id` | uuid FK avisos_itens nullable | null se item adicional |
| `descricao` | text | Copiado se item existente, livre se adicional |
| `unidade` | text | |
| `quantidade` | integer | Qtd desejada pela secretaria aderente |
| `categoria_objeto` | text | Validado: deve ser igual à categoria do aviso |

**RLS:** todas as tabelas filtram por `organizacao_id` (join via `avisos_compra_conjunta`).

---

## Rotas

```
/processos/aviso-compra-conjunta/novo          — Formulário de criação (secretaria de origem)
/processos/aviso-compra-conjunta/[id]          — Painel de acompanhamento (secretaria de origem)
/processos/aviso-compra-conjunta/[id]/aderir   — Tela de adesão (secretarias destinatárias)
```

Acesso à rota `/aderir`: qualquer usuário autenticado da mesma organização cujo `secretaria_id` esteja em `avisos_destinatarias` para aquele aviso.

---

## Telas

### 1. Formulário de criação (`/novo`)

Campos em página linear (sem wizard):

- **Modalidade** (select, mesmas opções do wizard)
- **Categoria do objeto** (select, mesmas opções do wizard)
- **Prazo para adesão** (date picker, mínimo D+1, sugestão D+5)
- **Itens que pretendo licitar** (tabela editável: descrição, unidade, quantidade; botão "+ Adicionar item")
- **Secretarias destinatárias** (multi-select das secretarias da organização, exceto a própria)
- Botão **"Enviar Aviso"**

Ao enviar:
- Insere nas tabelas `avisos_compra_conjunta`, `avisos_itens`, `avisos_destinatarias`
- Cria uma `notificacao` para cada usuário de cada secretaria destinatária com link para `/aderir`
- Redireciona para o painel de acompanhamento `/[id]`

### 2. Painel de acompanhamento (`/[id]`)

Visível apenas para usuários da secretaria de origem.

Seção de métricas (3 cards):
- Secretarias que aderiram (verde)
- Secretarias pendentes (amarelo)
- Dias/horas restantes (neutro)

Seção "Status das secretarias":
- Uma linha por destinatária: nome + status ("Aderiu" / "Aguardando")

Seção "Itens consolidados":
- Tabela com itens na vertical, secretarias nas colunas, total na última coluna
- Itens adicionais de secretarias aderentes aparecem ao final, marcados com a secretaria de origem

Ações:
- **"Encerrar prazo agora"** — muda status para `encerrado`, mostra confirmação se ainda há pendentes
- **"Iniciar Processo"** — disponível quando `status = encerrado` ou prazo vencido; se nenhuma aderiu, exibe dialog de confirmação antes de prosseguir
- Ao iniciar: chama Server Action que cria o processo e redireciona para o wizard com dados pré-carregados via query params ou sessionStorage

### 3. Tela de adesão (`/[id]/aderir`)

Visível apenas para usuários de secretarias destinatárias.

Cabeçalho informativo (somente leitura):
- Nome da secretaria de origem, modalidade, categoria, prazo restante

Tabela de itens:
- Coluna "Item" (somente leitura, sem quantidade da origem)
- Coluna "Quantidade que desejo" (input numérico, 0 = sem interesse; itens com quantidade 0 não são incluídos no consolidado nem nos `avisos_adesoes_itens`)

Seção de itens adicionais:
- Botão "+ Adicionar item desta secretaria"
- Cada item adicional tem: descrição, unidade, quantidade
- Validação de categoria: ao salvar, se `categoria_objeto` do item diferir do aviso, bloqueio com mensagem de erro ("Este item é de categoria diferente da licitação. Somente itens de [categoria] são permitidos.")

Campos obrigatórios:
- **Fiscal do contrato** (text input)
- **Dotação orçamentária** (text input)

Botão **"Confirmar Adesão"** — disabled até todos os campos obrigatórios preenchidos.

---

## Integração com o wizard

Ao clicar em "Iniciar Processo" no painel de acompanhamento:

1. Server Action consolida todos os itens:
   - Itens da origem com `quantidade_origem`
   - Itens de cada secretaria aderente com suas quantidades
   - Itens adicionais de secretarias aderentes
2. Mapeia para o formato `ItemWizard[]` do wizard (`id`, `descricao`, `unidade`, `quantidade`)
3. Pré-preenche `DadosWizard`:
   - `modalidade` ← aviso
   - `categoria_objeto` ← aviso
   - `secretaria_id` ← secretaria de origem
   - `itens` ← consolidado
4. Persiste no `localStorage` com a chave `licitaia_wizard_draft`
5. Redireciona para `/processos/novo`

O wizard lê o draft do localStorage normalmente. O usuário verá os itens já preenchidos na Etapa 3 (Requisitos/Itens).

---

## Notificações

Sistema de notificações já existente (`notificacoes`).

Eventos que geram notificação:
- Aviso criado → notificação para cada usuário de secretaria destinatária
- Secretaria aderiu → notificação para criador do aviso
- Prazo encerrado → notificação para criador do aviso
- Processo iniciado → notificação para todos os aderentes (com link para o processo)

---

## Validações

| Regra | Onde validar |
|---|---|
| Prazo mínimo D+1 | Client + Server Action |
| Pelo menos 1 item da origem | Client + Server Action |
| Pelo menos 1 destinatária | Client + Server Action |
| Categoria dos itens adicionais == categoria do aviso | Client (bloqueio imediato) + Server Action |
| Fiscal e dotação obrigatórios na adesão | Client (disabled button) + Server Action |
| Aviso só pode ser respondido por secretaria destinatária | Server Action + RLS |
| Aviso encerrado não aceita mais adesões | Server Action |

---

## Fora do escopo desta fase

- Recusa formal de adesão (secretaria pode simplesmente não responder)
- Histórico de versões do aviso
- Edição do aviso após envio
- Aviso entre organizações diferentes

# Wizard Inteligente de Novo Processo com Geracao Automatica de DFD, ETP e TR

**Data:** 2026-05-10
**Status:** Aprovado pelo usuario

---

## Resumo

Substituir o formulario inicial de novo processo (`/processos/novo`) por um wizard inteligente de 5 etapas que coleta todos os dados necessarios para gerar automaticamente os documentos DFD, ETP e TR de forma completa, profissional e em conformidade com a Lei 14.133/21.

O motor de geracao e baseado em templates institucionais com substituicao de variaveis (custo zero). Uma camada opcional de IA (Gemini Flash, gratuito por padrao) personaliza os textos gerados. O sistema aprende com cada edicao do usuario, reduzindo progressivamente a necessidade de IA.

---

## Problema Atual

- O wizard atual (`/processos/novo`) coleta apenas dados basicos (objeto, modalidade, prazo) e cria o processo
- O usuario entao precisa preencher manualmente DFD, ETP e TR em editores separados, reescrevendo informacoes ja fornecidas
- Os editores sao blocos de texto em branco sem guia de preenchimento
- Nao ha aproveitamento de processos anteriores como referencia

---

## Fluxo Completo

```
[Novo Processo]
      |
      v
[Wizard Inteligente - 5 etapas]
  Etapa 1: Identificacao e Modalidade
  Etapa 2: Objeto e Necessidade
  Etapa 3: Requisitos Tecnicos
  Etapa 4: Condicoes Contratuais
  Etapa 5: Revisao Pre-geracao
      |
      v
[Tela de Clarificacao]
  IA/logica detecta ambiguidades nos dados
  Exibe perguntas objetivas com opcoes de escolha
  Usuario responde antes de gerar
      |
      v
[Selecao de IA + Custo estimado]
  Usuario escolhe modelo (Gemini Flash pre-selecionado)
  Custo exibido claramente (R$ 0,00 para gratuito)
      |
      v
[Geracao Paralela dos 3 documentos]
  Motor de templates substitui variaveis
  IA ajusta texto gerado (se configurada)
  DFD, ETP e TR gerados simultaneamente
      |
      v
[Revisao em 3 Abas: DFD | ETP | TR]
  Usuario revisa, edita secoes se necessario
  Badge de origem por secao (aprendizado / template / IA)
  Badge clicavel mostra processos de referencia
      |
      v
[Confirmar -> Processo criado com 3 documentos preenchidos]
```

**Importante:** o registro em `processos_licitatorios` so e criado apos a confirmacao final. Os dados do wizard ficam em estado React (memoria do cliente) durante o preenchimento.

---

## Experiencia de Preenchimento (UX)

### Principios

- O usuario digita o minimo possivel. O sistema expande, organiza e aprofunda.
- Cada campo tem icone `?` com popover explicando em linguagem simples + exemplo real de municipio pequeno.
- Placeholders sao exemplos concretos, nao instrucoes genericas.
- Campos com opcoes fixas usam listas suspensas, cards visuais ou checkboxes.
- Sugestoes contextuais aparecem automaticamente com base na categoria e modalidade escolhidas.

### Etapa 1: Identificacao e Modalidade

- **Secretaria Requisitante:** dropdown das secretarias cadastradas na organizacao
- **Categoria do Objeto:** seletor hierarquico em cascata (ex: Bens > Equipamentos > Informatica). A selecao pre-preenche campos das etapas seguintes automaticamente.
- **Modalidade:** cards visuais (nao dropdown). Cada card mostra nome, artigo da lei e quando usar. As 3 mais comuns ficam visiveis, demais em "Ver outras modalidades". Ao selecionar, exibe descricao contextual da modalidade.

### Etapa 2: Objeto e Necessidade

- **Objeto:** campo de texto com sugestao pre-carregada pela categoria. Usuario ajusta.
- **Itens:** tabela inline com descricao, unidade de medida (lista suspensa com unidades comuns) e quantidade. Botao "Adicionar item".
- **Justificativa da Necessidade:** dividida em 3 sub-perguntas simples ("Qual o problema atual?", "Qual o impacto se nao contratar?", "Qual a solucao proposta?"). O sistema monta o paragrafo completo automaticamente.
- **Prazo esperado:** seletor com opcoes comuns (30, 60, 90, 180 dias) + campo livre.

### Etapa 3: Requisitos Tecnicos

- **Normas aplicaveis:** checkboxes pre-selecionadas pela categoria (ex: categoria Informatica marca ABNT NBR 16407 por padrao). Usuario pode desmarcar ou adicionar.
- **Especificacoes minimas:** modelo sugerido pela categoria, editavel.
- **Criterios de sustentabilidade:** checkboxes com opcoes comuns (certificacao energetica, materiais reciclados, etc.).

### Etapa 4: Condicoes Contratuais

- **Valor estimado:** campo numerico com mascara monetaria.
- **Forma de pagamento:** opcoes (30 dias apos medicao, parcelas mensais, entrega unica). Sistema gera texto completo da clausula ao selecionar.
- **Garantia contratual:** opcoes (5%, 10%, dispensada com justificativa automatica baseada no valor).
- **Prazo de vigencia do contrato:** seletor com opcoes comuns.
- **Sancoes administrativas:** template padrao pre-preenchido, editavel.

### Etapa 5: Revisao Pre-geracao

- Resumo visual em cards compactos de todos os dados preenchidos.
- Campos incompletos ou inconsistentes destacados em amarelo com botao "Corrigir".
- Perguntas de clarificacao geradas pela logica do sistema (ex: "Os equipamentos serao fornecidos com instalacao inclusa?") com opcoes de escolha.
- Seletor de modelo de IA (ver secao abaixo).
- Botao "Gerar Documentos" so ativo quando todos os campos obrigatorios estiverem preenchidos.

---

## Selecao de IA

Exibida na Etapa 5. Opcoes:

| Modelo | Custo | Configuracao | Pre-selecionado |
|--------|-------|--------------|-----------------|
| Gemini Flash (Google) | R$ 0,00 | Chave global da plataforma no `.env` | Sim |
| Sem IA (somente templates) | R$ 0,00 | Nenhuma | Nao |
| Claude Sonnet | X creditos | Chave da organizacao | Nao |

- O custo e sempre exibido antes da geracao.
- Nenhuma chamada externa e feita sem o usuario ver e confirmar o custo.
- A escolha e salva em `processos_licitatorios.ia_config (jsonb)`.

---

## Motor de Geracao de Documentos

### Banco de Clausulas (`clausulas_padrao`)

```sql
CREATE TABLE clausulas_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_campo text NOT NULL,         -- ex: 'sancoes', 'justificativa_solucao'
  documento text NOT NULL,          -- 'dfd' | 'etp' | 'tr'
  modalidade text,                  -- null = vale para todas
  categoria_objeto text,            -- null = vale para todas
  texto_template text NOT NULL,     -- texto com {{variaveis}}
  variaveis jsonb,                  -- schema das variaveis esperadas
  versao int DEFAULT 1,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now()
);
```

### Sistema de Aprendizado (`clausulas_aprendidas`)

```sql
CREATE TABLE clausulas_aprendidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid REFERENCES organizacoes(id),
  tipo_campo text NOT NULL,
  documento text NOT NULL,
  modalidade text,
  categoria_objeto text,
  texto_original text NOT NULL,     -- o que o sistema gerou
  texto_aprovado text NOT NULL,     -- o que o usuario aprovou (pos-edicao)
  uso_count int DEFAULT 1,
  score_qualidade numeric DEFAULT 1.0,  -- media de reuso sem nova edicao
  ultima_vez_em timestamptz DEFAULT now(),
  criado_em timestamptz DEFAULT now()
);
```

**Logica de selecao de template (prioridade decrescente):**

1. Clausula aprendida desta organizacao + mesma modalidade + mesma categoria
2. Clausula aprendida desta organizacao + mesma categoria
3. Clausula aprendida desta organizacao (qualquer)
4. Template padrao global + mesma modalidade + mesma categoria
5. Template padrao global + mesma categoria
6. Template padrao global (mais generico)
7. IA gera do zero (ultimo recurso)

**Gatilho de aprendizado:** quando o usuario edita qualquer secao no editor de DFD, ETP ou TR apos a geracao e salva, o sistema registra o delta em `clausulas_aprendidas`. Se a clausula ja existe para aquela combinacao (organizacao + tipo_campo + modalidade + categoria), incrementa `uso_count` e atualiza `texto_aprovado`.

### Camada de IA (ajuste fino)

Funcao `ajustarComIA(textoTemplate: string, dados: DadosProcesso, modelo: string): Promise<string>`:

- Recebe o texto ja gerado pelo template (nao gera do zero)
- Prompt compacto: contexto legal + dados especificos + instrucao de personalizacao
- Retorna texto ajustado
- Se falhar, retorna o texto do template sem erro para o usuario

### Integracao Gemini Flash

- Chave configurada em `GOOGLE_AI_API_KEY` no `.env`
- Endpoint: Google AI Studio (gratuito, sem cartao de credito)
- Modelo: `gemini-1.5-flash` ou `gemini-2.0-flash`
- Cliente centralizado em `lib/ai/gemini-client.ts`
- Fallback automatico para template puro se a chave nao estiver configurada

---

## Badge de Origem e Rastreabilidade

Cada secao dos documentos gerados exibe um badge:

| Badge | Significado |
|-------|-------------|
| 🟢 Verde "Baseado em X processos anteriores" | Clausula aprendida desta organizacao, sem IA |
| 🟡 Amarelo "Template padrao, ajustado por IA" | Template global + ajuste por IA |
| ⚪ Cinza "Gerado por IA" | Primeiro uso desta categoria, IA gerou do zero |

**Badge clicavel:** ao clicar no badge verde, abre popover com lista dos processos de referencia:
- Numero do processo (`#XXXX`) — campo `numero` de `processos_licitatorios`, exibido como `#` + numero com zeros a esquerda (ex: `#0023`)
- Modalidade — campo `modalidade` do processo
- Objeto (resumido, max 80 chars) — campo `objeto` do processo
- Clique no numero abre `/processos/[id]` em nova aba

Os IDs dos processos de referencia sao armazenados em `clausulas_aprendidas.processos_referencia (uuid[])`, populados no momento do aprendizado.

---

## Layout Visual

### Principios de Design

- Fundo `gray-50`, cards brancos com sombra sutil (`shadow-sm`)
- Stepper horizontal sempre visivel no topo da pagina
- Cor primaria: `blue-600` (acoes, selecoes ativas)
- Cor de confirmacao: `green-600`
- Cor de alerta/ambiguidade: `amber-500`
- Tipografia clara, espacamento generoso, sem poluicao visual
- Mobile-friendly, otimizado para desktop

### Stepper

5 nos horizontais com linhas de conexao. No ativo em azul cheio, nos concluidos em verde, nos futuros em cinza. Label abaixo de cada no, visivel em telas >= sm.

### Cards de Modalidade (Etapa 1)

Grid de 3 colunas com cards clicaveis. Cada card: icone, nome, artigo da lei, descricao curta. Card selecionado com borda azul e fundo `blue-50`. Botao "Ver outras modalidades" expande grid com as demais opcoes.

### Tela de Revisao (3 abas)

Abas: DFD | ETP | TR. Cada aba exibe o documento em secoes com:
- Titulo da secao + badge de origem
- Texto gerado em caixa editavel (mas com visual de "leitura" por padrao)
- Botao "Editar" discreto no canto direito que ativa edicao inline
- Ao salvar edicao, sistema registra aprendizado automaticamente

---

## Arquitetura de Arquivos (novos e modificados)

```
src/
  app/(dashboard)/processos/novo/
    page.tsx                          -- SUBSTITUIDO: novo wizard inteligente
    etapa-identificacao.tsx           -- Etapa 1
    etapa-objeto.tsx                  -- Etapa 2
    etapa-requisitos.tsx              -- Etapa 3
    etapa-condicoes.tsx               -- Etapa 4
    etapa-revisao.tsx                 -- Etapa 5 + selecao IA
    tela-documentos-gerados.tsx       -- 3 abas com revisao

  api/gerar-documentos/
    route.ts                          -- POST: orquestra geracao paralela

lib/
  ai/
    gemini-client.ts                  -- NOVO: cliente Gemini Flash
    motor-templates.ts                -- NOVO: motor de templates + aprendizado
    prompts/
      ajuste-dfd.ts                   -- NOVO: prompt de ajuste fino DFD
      ajuste-etp.ts                   -- NOVO: prompt de ajuste fino ETP
      ajuste-tr.ts                    -- NOVO: prompt de ajuste fino TR

  actions/
    gerar-documentos.ts               -- NOVO: server action de geracao
    clausulas.ts                      -- NOVO: CRUD clausulas_padrao e aprendidas

supabase/migrations/
  YYYYMMDD_clausulas_padrao.sql       -- NOVA tabela clausulas_padrao
  YYYYMMDD_clausulas_aprendidas.sql   -- NOVA tabela clausulas_aprendidas
  YYYYMMDD_ia_config_processo.sql     -- ADD COLUMN ia_config jsonb em processos_licitatorios
```

---

## O que Muda nos Editores Existentes

Os editores de DFD, ETP e TR **nao mudam estruturalmente**. A unica diferenca e que serao abertos com conteudo ja preenchido (gerado pelo wizard) em vez de campos vazios. O gatilho de aprendizado e adicionado ao evento de salvamento de cada editor.

---

## Variaveis de Ambiente Novas

| Variavel | Descricao |
|----------|-----------|
| `GOOGLE_AI_API_KEY` | Chave da API Google AI Studio (Gemini Flash, gratuita) |

---

## Fora do Escopo desta Feature

- Geracao de Edital, Mapa de Riscos ou Parecer via wizard (documentos posteriores no fluxo)
- Interface de administracao do banco de clausulas (CRUD manual de templates)
- Metricas de qualidade dos templates
- Exportacao dos documentos (ja existe)

# Spec: Fluxo de Cadastro e Login — LicitaIA

**Data:** 2026-05-26
**Fase:** 6 — Dashboard Geral, Assinaturas e Gestão de Créditos IA
**Escopo:** Reestruturação completa das telas de login, cadastro de usuário comum e cadastro de nova prefeitura, com identidade visual dinâmica por organização.

---

## 1. Visão geral

O fluxo de entrada na plataforma tem três caminhos distintos, todos acessados a partir de uma única tela de login:

1. **Login** — usuário já cadastrado seleciona prefeitura, informa e-mail e senha
2. **Solicitar acesso** — usuário novo de org já cadastrada solicita cadastro
3. **Cadastrar prefeitura** — administrador cadastra uma nova org e se torna seu admin_organizacao

O admin master (papel `admin_plataforma`) faz login pelo caminho normal (1), selecionando qualquer prefeitura cadastrada. Tem acesso pleno a tudo que admin_organizacao pode fazer, em qualquer org.

---

## 2. Tela de login

### 2.1 Layout

Estrutura B (aprovada): login compacto no topo, dois botões simétricos abaixo.

**Card de login:**
- Prefeitura (Select com busca, carrega orgs ativas do banco — não IBGE)
- E-mail institucional
- Senha
- Link "Esqueci minha senha"
- Botão "Entrar"

**Botões abaixo do card:**
- "Solicitar acesso" — redireciona para `/cadastro`
- "Cadastrar minha prefeitura" — redireciona para `/cadastro/nova-prefeitura`

### 2.2 Branding dinâmico (Opção C aprovada)

- Painel esquerdo inicia com identidade genérica LicitaIA (cor `#112239`, logo LI)
- Quando usuário seleciona prefeitura no dropdown:
  - Fetch client-side para `/api/org-branding?orgId=<id>`
  - Endpoint público (sem autenticação), retorna `{ cor_primaria, brasao_url, nome }`
  - Painel esquerdo transiciona via CSS (`transition: background-color 0.4s ease`) para a `cor_primaria` da org
  - Logo da org substitui o SVG genérico
  - Botão "Entrar" também adota a cor primária da org

### 2.3 Notas de implementação

- O campo Prefeitura no login é obrigatório para o UX, mas a autenticação em si continua sendo `email + senha` via Supabase Auth. A prefeitura serve para: (a) carregar o branding dinâmico e (b) validar pós-login que o usuário pertence àquela org (caso um e-mail exista em mais de uma org, o sistema usa o `organizacao_id` da seleção para carregar o contexto correto).
- Admin master (`admin_plataforma`) seleciona qualquer org ativa. Após login, tem acesso global.
- Substituir busca IBGE no login por Select das orgs cadastradas (`organizacoes` where `ativo = true`)
- Criar endpoint `/api/org-branding/route.ts` (GET, público, sem autenticação)

---

## 3. Cadastro de nova prefeitura (`/cadastro/nova-prefeitura`)

### 3.1 Passo 1 — Busca da cidade

Mantém o fluxo atual: autocomplete IBGE, ao selecionar cidade avança para passo 2.

### 3.2 Passo 2 — Formulário completo

**Bloco: Dados da Prefeitura**

| Campo | Comportamento |
|---|---|
| Nome | Preenchido automaticamente pelo IBGE (nomePrefeitura), editável |
| CNPJ | Máscara XX.XXX.XXX/XXXX-XX, validação de 14 dígitos |
| CEP | Ao preencher 8 dígitos, chama ViaCEP e preenche logradouro, bairro, cidade, UF |
| Logradouro | Preenchido via CEP, editável |
| Número | Campo livre |
| Bairro | Preenchido via CEP, editável |

**Bloco: Identidade Visual**

| Campo | Comportamento |
|---|---|
| Logo / Brasão | Upload PNG ou SVG, máx 2 MB, enviado ao Supabase Storage, URL salva em `brasao_url` |
| Cor primária | Quadrado de cor clicável abre painel react-colorful (espectro visual + arrasto de mouse) + campo hex digitável. Ao mudar, atualiza preview em tempo real |

**Preview da cor:** abaixo do picker, exibe 4 swatches derivados automaticamente (primária, hover `-10% luminosidade`, wash `+40% luminosidade`, fundo `+55% luminosidade`) para o admin visualizar como ficará.

**Bloco: Dados do Administrador**

| Campo | Notas |
|---|---|
| Nome completo | Obrigatório, mín 3 chars |
| Cargo | Obrigatório (ex: Secretário de Administração) |
| Secretaria | Select das secretarias padrão (pré-populadas ao criar org) |
| E-mail | Obrigatório, validação de formato |
| Senha | Mín 8 caracteres |
| Confirmação de senha | Deve coincidir com senha |

### 3.3 Pós-cadastro

1. Org criada com `ativo: false`
2. Secretarias padrão inseridas automaticamente: Gabinete, Administração, Finanças, Obras, Saúde, Educação, Jurídico, Licitações
3. Admin criado com `papel: 'admin_organizacao'`, `status_aprovacao: 'aguardando_aprovacao'`, `ativo: false`
4. Notificação enviada a todos os `admin_plataforma` ativos
5. Tela de confirmação orienta o admin a aguardar ativação pelo admin master

### 3.4 Pós-ativação pelo admin master

Admin faz login normalmente: seleciona a prefeitura no dropdown, informa e-mail e senha. Sem fluxo especial de primeiro acesso.

---

## 4. Solicitar acesso (`/cadastro`)

Para usuários novos de org já cadastrada.

### 4.1 Campos

| Campo | Comportamento |
|---|---|
| Nome completo | Obrigatório, mín 3 chars |
| E-mail | Obrigatório |
| Senha | Mín 8 caracteres |
| Confirmação de senha | Deve coincidir |
| Prefeitura | Select das orgs ativas (mesmo componente do login) |
| Secretaria | Select carregado após seleção da prefeitura, lista secretarias daquela org |
| Perfil de acesso | Select com 6 opções: Requisitante, Setor de Compras, Setor de Licitação, Procurador, Gestor Público, Publicação — sem admin_organizacao nem admin_plataforma |

### 4.2 Pós-envio

1. Usuário criado com `status_aprovacao: 'aguardando_aprovacao'`, `ativo: false`
2. `secretaria_id` salvo no registro do usuário
3. Notificação enviada ao(s) `admin_organizacao` e `admin_plataforma` ativos da org
4. Tela de confirmação orienta aguardar aprovação

---

## 5. Identidade visual por organização

### 5.1 Onde é configurada

| Contexto | Quem pode |
|---|---|
| Formulário de nova prefeitura (cadastro inicial) | Qualquer pessoa cadastrando uma nova org |
| Configurações > Organização | admin_organizacao e admin_plataforma |

### 5.2 Campos de identidade visual em Configurações > Organização

- **Logo / Brasão:** upload (mesmo comportamento do cadastro inicial). Exibe preview da logo atual com botão "Trocar".
- **Cor primária:** picker react-colorful + campo hex + preview dos 4 swatches derivados.
- Substituir os 5 temas predefinidos (`tema_padrao`) por este novo sistema. Manter coluna `tema_padrao` como fallback para orgs que ainda não definiram `cor_primaria`.

### 5.3 Uso da identidade visual

| Local | Comportamento |
|---|---|
| Painel esquerdo do login | Cor de fundo = `cor_primaria`, logo = `brasao_url` (após org selecionada) |
| Header do dashboard | Logo da org ao lado do nome da organização |
| Cor primária do sistema | Variáveis CSS `--primary` e derivadas aplicadas para usuários daquela org |

---

## 6. Alterações no banco de dados

### 6.1 Migration: campos novos em `organizacoes`

```sql
ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS cor_primaria   text,
  ADD COLUMN IF NOT EXISTS cep            text,
  ADD COLUMN IF NOT EXISTS logradouro     text,
  ADD COLUMN IF NOT EXISTS numero         text,
  ADD COLUMN IF NOT EXISTS bairro         text;
```

### 6.2 Migration: `secretaria_id` em `usuarios`

```sql
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS secretaria_id uuid references secretarias(id) on delete set null;
```

### 6.3 Secretarias padrão

Ao criar uma nova org (via Server Action `cadastrarAdminOrg`), inserir automaticamente no banco:

```
Gabinete do Prefeito
Secretaria de Administração
Secretaria de Finanças
Secretaria de Obras e Infraestrutura
Secretaria de Saúde
Secretaria de Educação
Procuradoria Jurídica
Setor de Licitações e Contratos
```

### 6.4 Endpoint público de branding

`GET /api/org-branding?orgId=<uuid>`

Retorna:
```json
{
  "cor_primaria": "#1A5C3A",
  "brasao_url": "https://...",
  "nome": "Prefeitura Municipal de Cataguases"
}
```

Usa `createServiceClient` (sem autenticação). Dados são públicos (identidade visual institucional). Cache de 60 segundos (`Cache-Control: public, max-age=60`).

---

## 7. Arquivos criados e modificados

**Criar:**
- `src/app/api/org-branding/route.ts`
- `supabase/migrations/20260526000002_auth_branding_campos.sql`

**Modificar:**
- `src/app/(auth)/login/page.tsx` — Select de orgs, branding dinâmico, remover IBGE
- `src/app/(auth)/layout.tsx` — remover lógica single-tenant (primeira org)
- `src/app/(auth)/layout-client.tsx` — aceitar `orgId` como prop, fetch dinâmico via `/api/org-branding`
- `src/app/(auth)/cadastro/page.tsx` — adicionar confirmação de senha, secretaria, redesign
- `src/app/(auth)/cadastro/nova-prefeitura/page.tsx` — CEP, endereço, logo upload, hex picker, secretaria do admin, confirmação de senha
- `src/app/(dashboard)/configuracoes/organizacao/form-organizacao.tsx` — substituir temas por hex picker + upload de logo
- `src/lib/actions/auth-cadastro.ts` — `cadastrarAdminOrg` + `cadastrarUsuario` com novos campos
- `src/lib/actions/organizacao.ts` — adicionar action de upload de logo

**Dependência nova:**
- `react-colorful` (2KB, sem dependências transitivas)

---

## 8. O que não muda

- Rotas de recuperação de senha (`/recuperar-senha`, `/nova-senha`)
- Fluxo de aprovação de usuários (já implementado em `aprovacao-usuario.ts`)
- Notificações entre usuários (já implementado)
- RLS em todas as tabelas (mantido integralmente)
- Admin master não precisa se recadastrar — login já funciona

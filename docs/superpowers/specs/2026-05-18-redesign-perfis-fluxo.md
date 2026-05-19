# LicitaIA — Redesign de Perfis, Fluxo e Funcionalidades Transversais

**Data**: 2026-05-18
**Autor**: Daniel (aprovado em sessão de brainstorming)
**Status**: Aprovado, pronto para implementação

---

## Objetivo

Expandir a plataforma LicitaIA de 6 para 8 perfis de usuário, reestruturar o fluxo de tramitação de documentos, implementar chat interno em 3 modos, linha do tempo visual por processo, redesenho do login e cadastro com validação em cadeia, e modo demo exclusivo do Admin Master.

---

## Seção 1: Papéis de Usuário (papel_usuario)

### Enum atualizado

| Valor no enum | Nome na UI | Descrição |
|---|---|---|
| `admin_plataforma` | Admin Master | Criador da plataforma, acesso irrestrito, externo a todas as prefeituras |
| `admin_organizacao` | Admin da Organização | Gerencia sua prefeitura: usuários, layout, permissões, fluxo |
| `requisitante` | Requisitante | Inicia o processo, preenche wizard, revisa documentos gerados |
| `setor_compras` | Setor de Compras | Revisor 1, primeira revisão com auxílio de IA |
| `setor_licitacao` | Setor de Licitações | Revisor 2, gera Edital e Ofício, encaminha à Procuradoria |
| `procurador` | Procuradoria | Emite parecer jurídico |
| `gestor_publico` | Gestor Público | Prefeito ou autoridade competente, autoriza ou devolve |
| `publicacao` | Publicação | Setor de Comunicação, marca edital como publicado |

### Migration necessária

- Adicionar `setor_compras` e `publicacao` ao enum `papel_usuario`
- Renomear `autoridade_competente` para `gestor_publico`
- Atualizar todas as RLS policies que referenciam o enum
- Atualizar tabela `permissoes_papel_organizacao` com os novos papéis
- Atualizar `src/lib/permissions.ts` com as novas constantes

---

## Seção 2: Fluxo de Tramitação de Documentos

### Fluxo principal

```
Requisitante → Setor de Compras → Setor de Licitações → Procuradoria → Gestor Público → Publicação
```

### Wizard do Requisitante

- Formulário único multi-etapa
- Botão "Melhorar com IA" disponível em cada campo de texto individualmente
- A IA gera textos completos, detalhados e dentro da legislação vigente (Lei 14.133/21)
- A IA nunca inventa dados objetivos (CNPJ, valores, fornecedores) sem input do usuário
- Ao finalizar o wizard, a IA gera simultaneamente: DFD, ETP e TR
- O Requisitante revisa cada documento separadamente antes de enviar
- Em cada documento é possível: editar livremente qualquer trecho e adicionar campos extras
- Cotação é preenchida no wizard pelo Requisitante
- Se a cotação não for preenchida, o documento é gerado normalmente mas sinalizado com aviso amarelo de pendência
- A ausência de cotação não bloqueia o envio para Compras

### Retornos possíveis

| De | Pode devolver para |
|---|---|
| Setor de Compras | Requisitante |
| Setor de Licitações | Requisitante ou Setor de Compras |
| Procuradoria | Setor de Licitações |
| Gestor Público | Setor de Licitações |

- Motivo de devolução é **obrigatório** em toda devolução
- Cada mudança de fase (avanço ou devolução) gera entrada na linha do tempo

### Documentos gerados por etapa

| Etapa | Documentos |
|---|---|
| Requisitante (wizard) | DFD, ETP, TR, Cotação |
| Setor de Licitações | Edital, Ofício de Abertura |
| Procuradoria | Parecer Jurídico |
| Gestor Público | Autorização (documento formal gerado por IA ou escrito manualmente) |

---

## Seção 3: Linha do Tempo

### Comportamento

- Exibida em cada processo, mostrando todas as etapas do fluxo
- Mostra apenas marcos principais de mudança de fase (não ações internas)
- Linha conectora entre etapas com cor indicando progresso

### Status visuais

| Status | Cor | Ícone |
|---|---|---|
| Concluído | Verde (#22C55E) | Preenchido com check |
| Pendência | Amarelo (#F59E0B) | Preenchido com aviso |
| Em andamento | Roxo (#7C3AED) | Preenchido com animação pulsante |
| Aguardando | Cinza (#CBD5E1) | Vazio/outline |

### Ícones por setor

| Setor | Ícone |
|---|---|
| Requisitante | 📝 |
| Setor de Compras | 🛒 |
| Setor de Licitações | ⚖️ |
| Procuradoria | 🏛️ |
| Gestor Público | 🤝 |
| Publicação | 📢 |

### Tooltip (ao passar o mouse)

Exibe: nome do responsável, papel, data e hora, destino do envio, motivo (se devolução), pendências.
Em repouso: mostra apenas as etapas e o local atual do processo.

### Clique no ícone do setor

Ao clicar em qualquer ícone de setor na linha do tempo, abre painel lateral ou popover listando todos os processos que estão naquele setor no momento, com status e link direto para cada processo.

### Requisitos visuais

- Linha conectora e letras com alto contraste e boa visibilidade
- Linha conectora colorida reflete o progresso real (verde nas etapas concluídas, amarelo nas com pendência, cinza nas futuras)

---

## Seção 4: Chat Interno

### 3 modos de chat

| Modo | Escopo | Participantes | Identificação visual |
|---|---|---|---|
| Chat do Processo | Por processo | Todos os perfis envolvidos naquele processo | Cor azul, ícone do processo + número |
| Chat do Setor | Por setor | Apenas membros do mesmo setor | Cor do papel do setor |
| Chat Direto | Entre usuários | 2 usuários quaisquer da mesma prefeitura | Avatar do destinatário, fundo neutro |

### Comportamento

- Painel recolhível no canto inferior direito (estilo chat flutuante)
- Pode ser fixado como coluna lateral (botão de fixar/desafixar)
- 3 abas no painel: Processo / Setor / Direto
- Contador de mensagens não lidas por aba
- Cada mensagem exibe: avatar, nome completo, papel e horário

### Segurança

- Cada perfil só enxerga os chats pertinentes ao seu papel e aos processos em que está envolvido
- Chat interno do setor não é visível para outros setores
- RLS aplicado nas tabelas de mensagens por `organizacao_id` e `papel_usuario`

---

## Seção 5: Login, Cadastro e Onboarding

### Tela de login

- Campos: e-mail, senha
- Campo "Prefeitura" com autocomplete (busca por nome da cidade, retorna lista das prefeituras ativas)
- Ao selecionar a prefeitura, exibe nome oficial e brasão (se configurado)

### Cadastro de usuário comum (prefeitura já existente)

1. Preenche nome, e-mail, senha
2. Seleciona a prefeitura e o papel desejado (todos exceto Admin Master)
3. Conta fica com status "aguardando aprovação"
4. Admin de Org recebe notificação e aprova ou recusa

### Cadastro de Admin de Org (prefeitura nova)

1. Fluxo separado, acessado por link "Minha prefeitura ainda não está cadastrada"
2. Digita o nome da cidade
3. Sistema autocompleta automaticamente: nome oficial da prefeitura, CNPJ, cidade, estado (via API pública, ex: IBGE + CNPJ.ws)
4. Preenche dados pessoais (nome, e-mail, cargo)
5. Conta fica com status "aguardando ativação"
6. Admin Master recebe notificação e ativa a prefeitura

### Validação em cadeia

```
Admin Master ativa prefeituras novas
    ↓
Admin de Org aprova usuários da sua prefeitura
    ↓
Nenhum usuário acessa sem aprovação do nível acima
```

---

## Seção 6: Admin Master — Modos de Atuação

O Admin Master opera em 3 contextos distintos:

### 1. Painel Admin Master (gestão global)

- Lista de todas as prefeituras cadastradas (ativas, pendentes, suspensas)
- Ativa prefeituras novas (após cadastro do Admin de Org)
- Suspende prefeituras por inadimplência ou outro motivo
- Visualiza métricas globais da plataforma

### 2. Acesso direto à Cataguases (desenvolvimento e testes)

- Entra na prefeitura real de Cataguases com poderes plenos
- Pode criar processos, editar documentos, usar IA e testar todas as funções
- Dados criados são reais e persistem na prefeitura
- Usado para desenvolvimento, homologação e suporte

### 3. Modo Demo (demonstração comercial)

- Botão "Modo Demo" no painel do Admin Master
- Acessa uma prefeitura fictícia isolada ("Prefeitura Demo")
- Banner laranja fixo no topo: "MODO DEMO ATIVO"
- Barra lateral exibe os 8 perfis clicáveis (incluindo Admin Master)
- Ao clicar em um perfil, a interface inteira exibe o que aquele perfil vê e pode fazer
- Ao simular Admin Master no demo, exibe funções de gestão global (lista de prefeituras, ativação, suspensão, parâmetros da plataforma) dentro do ambiente fictício
- Pode criar processos e usar todas as funções dentro do ambiente demo
- "Sair do Modo Demo" retorna ao painel de Admin Master
- Não afeta nenhuma prefeitura real
- Serve para demonstração comercial a potenciais clientes

---

## Seção 7: Permissões e Visibilidade

- Cada perfil vê por padrão apenas o que é pertinente à sua área
- Admin de Org pode editar permissões dos papéis da sua prefeitura
- Fluxo de tramitação é configurável por prefeitura (Admin de Org ou Admin Master podem adicionar/remover etapas)
- RLS obrigatório em todas as tabelas, política base: `organizacao_id` + `papel_usuario`

---

## Decisões técnicas

- **Abordagem**: migração incremental (Opção A), sem reescrita total
- **Migration**: cirúrgica, adiciona novos papéis e renomeia sem apagar dados existentes
- **IA**: `claude-sonnet-4-5` para melhorar campo a campo, `claude-opus-4-7` para geração completa de documentos
- **Textos de IA**: sempre completos, detalhados, dentro da Lei 14.133/21, sem invenção de dados objetivos
- **Chat**: tabelas `mensagens_processo`, `mensagens_setor`, `mensagens_diretas` com RLS por org e papel
- **Linha do tempo**: tabela `tramitacao_historico` com campos: `processo_id`, `de_papel`, `para_papel`, `usuario_id`, `timestamp`, `motivo`, `status`
- **Autocomplete de prefeituras no cadastro**: API IBGE (municípios) + CNPJ.ws para dados da prefeitura

---

## Fora do escopo desta iteração

- Assinatura eletrônica (já implementada, não alterada)
- Exportação PDF/DOCX (já implementada, não alterada)
- Sistema de créditos e pagamentos (não alterado)
- Integração com PNCP para publicação (fase futura)

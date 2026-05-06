-- ============================================================
-- LicitaIA - Schema Inicial
-- Conforme arquitetura definida em CLAUDE.md
-- ============================================================

-- Extensões
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type papel_usuario as enum (
  'requisitante',
  'setor_licitacao',
  'procurador',
  'autoridade_competente',
  'admin_organizacao',
  'admin_plataforma'
);

create type status_documento as enum (
  'rascunho',
  'em_revisao',
  'assinado',
  'publicado',
  'devolvido'
);

create type modalidade_licitacao as enum (
  'pregao_eletronico',
  'pregao_presencial',
  'concorrencia',
  'concurso',
  'leilao',
  'dialogo_competitivo',
  'dispensa',
  'inexigibilidade'
);

create type tipo_acao_ia as enum (
  'aprimorar_texto',
  'sugerir_conteudo',
  'gerar_documento'
);

create type fonte_cotacao as enum (
  'pncp',
  'banco_municipal',
  'pesquisa_direta'
);

create type status_parecer as enum (
  'pendente',
  'aprovado',
  'aprovado_com_ressalvas',
  'devolvido'
);

-- ============================================================
-- ORGANIZACOES (multi-tenant root)
-- ============================================================

create table organizacoes (
  id                       uuid primary key default uuid_generate_v4(),
  created_at               timestamptz not null default now(),
  nome                     text not null,
  cnpj                     text not null unique,
  brasao_url               text,
  cabecalho_institucional  text,
  rodape_institucional     text,
  municipio                text not null,
  estado                   char(2) not null,
  ativo                    boolean not null default true
);

-- ============================================================
-- USUARIOS
-- ============================================================

create table usuarios (
  id             uuid primary key references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  organizacao_id uuid not null references organizacoes(id) on delete cascade,
  papel          papel_usuario not null default 'requisitante',
  nome_completo  text not null,
  cargo          text,
  ativo          boolean not null default true
);

-- ============================================================
-- SECRETARIAS
-- ============================================================

create table secretarias (
  id             uuid primary key default uuid_generate_v4(),
  organizacao_id uuid not null references organizacoes(id) on delete cascade,
  nome           text not null,
  sigla          text,
  responsavel    text,
  ativo          boolean not null default true
);

-- ============================================================
-- PROCESSOS LICITATORIOS
-- ============================================================

create table processos_licitatorios (
  id               uuid primary key default uuid_generate_v4(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  organizacao_id   uuid not null references organizacoes(id) on delete cascade,
  numero_processo  text,
  objeto           text not null,
  modalidade       modalidade_licitacao not null,
  valor_estimado   numeric(15,2),
  status           status_documento not null default 'rascunho',
  criado_por       uuid not null references usuarios(id),
  etapa_atual      smallint not null default 1 -- 1=DFD, 2=Cotacao, ..., 10=Publicacao
);

create index idx_processos_organizacao on processos_licitatorios(organizacao_id);
create index idx_processos_status on processos_licitatorios(status);

-- Atualiza updated_at automaticamente
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_processos_updated_at
  before update on processos_licitatorios
  for each row execute function set_updated_at();

-- ============================================================
-- SECRETARIAS ENVOLVIDAS (pivô processo <-> secretaria)
-- ============================================================

create table secretarias_envolvidas (
  processo_id   uuid not null references processos_licitatorios(id) on delete cascade,
  secretaria_id uuid not null references secretarias(id) on delete cascade,
  ordem_assinatura smallint,
  primary key (processo_id, secretaria_id)
);

-- ============================================================
-- DFD (Documento de Formalização da Demanda - Art. 6º, X)
-- ============================================================

create table dfd (
  id                     uuid primary key default uuid_generate_v4(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  processo_id            uuid not null references processos_licitatorios(id) on delete cascade,
  organizacao_id         uuid not null references organizacoes(id),
  secretaria_id          uuid references secretarias(id),
  responsavel_elaboracao text not null,
  descricao_necessidade  text not null,
  justificativa          text not null,
  prazo_contratacao      text,
  observacoes            text,
  status                 status_documento not null default 'rascunho',
  gerado_por_ia          boolean not null default false,
  criado_por             uuid not null references usuarios(id)
);

create trigger trg_dfd_updated_at
  before update on dfd
  for each row execute function set_updated_at();

-- ============================================================
-- COTACOES (Art. 23)
-- ============================================================

create table cotacoes (
  id                  uuid primary key default uuid_generate_v4(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  processo_id         uuid not null references processos_licitatorios(id) on delete cascade,
  organizacao_id      uuid not null references organizacoes(id),
  fonte               fonte_cotacao not null,
  justificativa_fonte text, -- obrigatório se fonte = pesquisa_direta
  valor_medio         numeric(15,2),
  valor_mediana       numeric(15,2),
  valor_estimado      numeric(15,2),
  tem_outlier         boolean not null default false,
  status              status_documento not null default 'rascunho',
  criado_por          uuid not null references usuarios(id)
);

create trigger trg_cotacoes_updated_at
  before update on cotacoes
  for each row execute function set_updated_at();

create table cotacoes_fornecedores (
  id                    uuid primary key default uuid_generate_v4(),
  cotacao_id            uuid not null references cotacoes(id) on delete cascade,
  nome_fornecedor       text not null,
  cnpj_fornecedor       text,
  justificativa_escolha text, -- obrigatório para pesquisa_direta
  pedido_url            text,
  resposta_url          text,
  valor_proposto        numeric(15,2)
);

create table cotacoes_itens (
  id            uuid primary key default uuid_generate_v4(),
  cotacao_id    uuid not null references cotacoes(id) on delete cascade,
  descricao     text not null,
  unidade       text not null,
  quantidade    numeric(15,4) not null,
  valor_unitario numeric(15,4),
  valor_total   numeric(15,2)
);

-- ============================================================
-- ETP (Estudo Técnico Preliminar - Art. 18)
-- ============================================================

create table etp (
  id                        uuid primary key default uuid_generate_v4(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  processo_id               uuid not null references processos_licitatorios(id) on delete cascade,
  organizacao_id            uuid not null references organizacoes(id),
  descricao_necessidade     text,
  requisitos_contratacao    text,
  levantamento_mercado      text,
  estimativa_quantidades    text,
  estimativa_valores        text,
  justificativa_solucao     text,
  parcelamento              text,
  resultados_pretendidos    text,
  providencias              text,
  contratacoes_correlatas   text,
  impactos_ambientais       text,
  viabilidade               text,
  analise_risco             jsonb,
  conclusao_risco           text,
  status                    status_documento not null default 'rascunho',
  gerado_por_ia             boolean not null default false,
  criado_por                uuid not null references usuarios(id)
);

create trigger trg_etp_updated_at
  before update on etp
  for each row execute function set_updated_at();

-- ============================================================
-- TERMO DE REFERENCIA (Art. 6º, XXIII)
-- ============================================================

create table termo_referencia (
  id                    uuid primary key default uuid_generate_v4(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  processo_id           uuid not null references processos_licitatorios(id) on delete cascade,
  organizacao_id        uuid not null references organizacoes(id),
  objeto                text,
  fundamentacao         text,
  descricao             text,
  requisitos_tecnicos   text,
  modelo_execucao       text,
  modelo_gestao         text,
  criterios_medicao     text,
  forma_pagamento       text,
  garantias             text,
  sancoes               text,
  status                status_documento not null default 'rascunho',
  gerado_por_ia         boolean not null default false,
  criado_por            uuid not null references usuarios(id)
);

create trigger trg_tr_updated_at
  before update on termo_referencia
  for each row execute function set_updated_at();

-- ============================================================
-- MAPA DE RISCOS (Art. 22)
-- ============================================================

create table mapa_riscos (
  id             uuid primary key default uuid_generate_v4(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  processo_id    uuid not null references processos_licitatorios(id) on delete cascade,
  organizacao_id uuid not null references organizacoes(id),
  riscos         jsonb not null default '[]',
  status         status_documento not null default 'rascunho',
  gerado_por_ia  boolean not null default false,
  criado_por     uuid not null references usuarios(id)
);

create trigger trg_mapa_updated_at
  before update on mapa_riscos
  for each row execute function set_updated_at();

-- ============================================================
-- EDITAL (Art. 82 a 92)
-- ============================================================

create table edital (
  id             uuid primary key default uuid_generate_v4(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  processo_id    uuid not null references processos_licitatorios(id) on delete cascade,
  organizacao_id uuid not null references organizacoes(id),
  conteudo       jsonb not null default '{}',
  status         status_documento not null default 'rascunho',
  gerado_por_ia  boolean not null default false,
  criado_por     uuid not null references usuarios(id)
);

create trigger trg_edital_updated_at
  before update on edital
  for each row execute function set_updated_at();

-- ============================================================
-- PARECERES JURIDICOS (Art. 53)
-- ============================================================

create table pareceres (
  id             uuid primary key default uuid_generate_v4(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  processo_id    uuid not null references processos_licitatorios(id) on delete cascade,
  organizacao_id uuid not null references organizacoes(id),
  procurador_id  uuid references usuarios(id),
  conteudo       text,
  status         status_parecer not null default 'pendente',
  gerado_por_ia  boolean not null default false
);

create trigger trg_pareceres_updated_at
  before update on pareceres
  for each row execute function set_updated_at();

-- ============================================================
-- VERSOES DE DOCUMENTO (histórico imutável)
-- ============================================================

create table versoes_documento (
  id             uuid primary key default uuid_generate_v4(),
  created_at     timestamptz not null default now(),
  tabela_origem  text not null,
  documento_id   uuid not null,
  organizacao_id uuid not null references organizacoes(id),
  usuario_id     uuid not null references usuarios(id),
  conteudo_snap  jsonb not null,
  motivo         text
);

create index idx_versoes_documento on versoes_documento(tabela_origem, documento_id);

-- ============================================================
-- ASSINATURAS
-- ============================================================

create table assinaturas (
  id             uuid primary key default uuid_generate_v4(),
  created_at     timestamptz not null default now(),
  tabela_origem  text not null,
  documento_id   uuid not null,
  organizacao_id uuid not null references organizacoes(id),
  usuario_id     uuid not null references usuarios(id),
  provedor       text not null,
  hash_documento text,
  timestamp_assinatura timestamptz,
  status         text not null default 'pendente'
);

-- ============================================================
-- CREDITOS E TRANSACOES
-- ============================================================

create table creditos_usuario (
  id             uuid primary key default uuid_generate_v4(),
  usuario_id     uuid not null references usuarios(id) on delete cascade unique,
  organizacao_id uuid not null references organizacoes(id),
  saldo          integer not null default 0 check (saldo >= 0),
  updated_at     timestamptz not null default now()
);

create table transacoes_credito (
  id             uuid primary key default uuid_generate_v4(),
  created_at     timestamptz not null default now(),
  usuario_id     uuid not null references usuarios(id),
  organizacao_id uuid not null references organizacoes(id),
  tipo           text not null check (tipo in ('compra', 'consumo', 'estorno')),
  quantidade     integer not null,
  saldo_anterior integer not null,
  saldo_posterior integer not null,
  descricao      text,
  referencia_id  uuid
);

-- ============================================================
-- ACOES DE IA (log completo)
-- ============================================================

create table acoes_ia (
  id                  uuid primary key default uuid_generate_v4(),
  created_at          timestamptz not null default now(),
  usuario_id          uuid not null references usuarios(id),
  organizacao_id      uuid not null references organizacoes(id),
  processo_id         uuid references processos_licitatorios(id),
  tipo_acao           tipo_acao_ia not null,
  provedor            text not null,
  modelo              text not null,
  tokens_entrada      integer not null default 0,
  tokens_saida        integer not null default 0,
  creditos_consumidos integer not null default 0,
  input_resumo        text,
  sucesso             boolean not null default true,
  erro_mensagem       text
);

create index idx_acoes_ia_usuario on acoes_ia(usuario_id);
create index idx_acoes_ia_processo on acoes_ia(processo_id);

-- ============================================================
-- NOTIFICACOES
-- ============================================================

create table notificacoes (
  id             uuid primary key default uuid_generate_v4(),
  created_at     timestamptz not null default now(),
  usuario_id     uuid not null references usuarios(id) on delete cascade,
  organizacao_id uuid not null references organizacoes(id),
  processo_id    uuid references processos_licitatorios(id),
  titulo         text not null,
  mensagem       text not null,
  lida           boolean not null default false,
  link           text
);

create index idx_notificacoes_usuario on notificacoes(usuario_id, lida);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Habilitar RLS em todas as tabelas
alter table organizacoes enable row level security;
alter table usuarios enable row level security;
alter table secretarias enable row level security;
alter table processos_licitatorios enable row level security;
alter table secretarias_envolvidas enable row level security;
alter table dfd enable row level security;
alter table cotacoes enable row level security;
alter table cotacoes_fornecedores enable row level security;
alter table cotacoes_itens enable row level security;
alter table etp enable row level security;
alter table termo_referencia enable row level security;
alter table mapa_riscos enable row level security;
alter table edital enable row level security;
alter table pareceres enable row level security;
alter table versoes_documento enable row level security;
alter table assinaturas enable row level security;
alter table creditos_usuario enable row level security;
alter table transacoes_credito enable row level security;
alter table acoes_ia enable row level security;
alter table notificacoes enable row level security;

-- Helper: retorna organizacao_id do usuário logado
create or replace function get_organizacao_id()
returns uuid language sql security definer stable as $$
  select organizacao_id from usuarios where id = auth.uid()
$$;

-- Helper: retorna papel do usuário logado
create or replace function get_papel_usuario()
returns papel_usuario language sql security definer stable as $$
  select papel from usuarios where id = auth.uid()
$$;

-- ============================================================
-- POLÍTICAS RLS
-- ============================================================

-- organizacoes: usuário vê apenas a sua
create policy "usuarios veem propria organizacao"
  on organizacoes for select
  using (id = get_organizacao_id());

create policy "admin_organizacao pode atualizar organizacao"
  on organizacoes for update
  using (id = get_organizacao_id() and get_papel_usuario() in ('admin_organizacao', 'admin_plataforma'));

-- usuarios: veem apenas da mesma organização
create policy "usuarios veem mesma organizacao"
  on usuarios for select
  using (organizacao_id = get_organizacao_id());

create policy "usuario ve proprio perfil"
  on usuarios for update
  using (id = auth.uid());

create policy "admin pode gerenciar usuarios"
  on usuarios for all
  using (organizacao_id = get_organizacao_id() and get_papel_usuario() in ('admin_organizacao', 'admin_plataforma'));

-- secretarias
create policy "secretarias da organizacao"
  on secretarias for select
  using (organizacao_id = get_organizacao_id());

create policy "admin gerencia secretarias"
  on secretarias for all
  using (organizacao_id = get_organizacao_id() and get_papel_usuario() in ('admin_organizacao', 'admin_plataforma'));

-- processos_licitatorios
create policy "processos da organizacao"
  on processos_licitatorios for select
  using (organizacao_id = get_organizacao_id());

create policy "criar processo"
  on processos_licitatorios for insert
  with check (organizacao_id = get_organizacao_id());

create policy "editar processo"
  on processos_licitatorios for update
  using (organizacao_id = get_organizacao_id());

-- documentos do processo (DFD, ETP, TR, etc.): política genérica por organizacao_id
create policy "dfd da organizacao" on dfd for all using (organizacao_id = get_organizacao_id());
create policy "cotacoes da organizacao" on cotacoes for all using (organizacao_id = get_organizacao_id());
create policy "etp da organizacao" on etp for all using (organizacao_id = get_organizacao_id());
create policy "tr da organizacao" on termo_referencia for all using (organizacao_id = get_organizacao_id());
create policy "mapa_riscos da organizacao" on mapa_riscos for all using (organizacao_id = get_organizacao_id());
create policy "edital da organizacao" on edital for all using (organizacao_id = get_organizacao_id());
create policy "pareceres da organizacao" on pareceres for all using (organizacao_id = get_organizacao_id());
create policy "versoes da organizacao" on versoes_documento for all using (organizacao_id = get_organizacao_id());
create policy "assinaturas da organizacao" on assinaturas for all using (organizacao_id = get_organizacao_id());
create policy "creditos proprios" on creditos_usuario for all using (organizacao_id = get_organizacao_id());
create policy "transacoes proprias" on transacoes_credito for all using (organizacao_id = get_organizacao_id());
create policy "acoes_ia proprias" on acoes_ia for all using (organizacao_id = get_organizacao_id());
create policy "notificacoes proprias" on notificacoes for all using (usuario_id = auth.uid());

-- cotacoes_fornecedores e itens: via join com cotacoes
create policy "fornecedores via cotacao"
  on cotacoes_fornecedores for all
  using (exists (
    select 1 from cotacoes c
    where c.id = cotacao_id and c.organizacao_id = get_organizacao_id()
  ));

create policy "itens via cotacao"
  on cotacoes_itens for all
  using (exists (
    select 1 from cotacoes c
    where c.id = cotacao_id and c.organizacao_id = get_organizacao_id()
  ));

create policy "secretarias_envolvidas via processo"
  on secretarias_envolvidas for all
  using (exists (
    select 1 from processos_licitatorios p
    where p.id = processo_id and p.organizacao_id = get_organizacao_id()
  ));

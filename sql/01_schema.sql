-- Schema do Sistema de Gestão de Eventos e Auditórios FCI (RF-01)
-- Banco: Amazon RDS for PostgreSQL, database "eventos".
-- Executar a partir do bastion:  \i 01_schema.sql
-- O script é idempotente apenas para recriação completa: ele apaga e recria as tabelas.

begin;

drop table if exists arquivo, inscricao, participante, evento, bloqueio_local, local cascade;

-- Salas, auditórios e espaços digitais (US01)
create table local (
    id           bigint generated always as identity primary key,
    nome         text        not null unique,
    tipo         text        not null check (tipo in ('fisico', 'digital')),
    localizacao  text,
    capacidade   integer     check (capacidade > 0),
    ativo        boolean     not null default true,
    criado_em    timestamptz not null default now(),
    -- Local físico precisa de capacidade para o controle de vagas
    constraint local_fisico_tem_capacidade check (tipo = 'digital' or capacidade is not null)
);

-- Períodos de indisponibilidade de um local (US01)
create table bloqueio_local (
    id        bigint generated always as identity primary key,
    local_id  bigint      not null references local (id) on delete cascade,
    inicio    timestamptz not null,
    fim       timestamptz not null,
    motivo    text,
    constraint bloqueio_periodo_valido check (fim > inicio)
);

-- Eventos e atividades. Uma atividade é um evento com evento_pai_id preenchido (US02 a US06)
create table evento (
    id                    bigint generated always as identity primary key,
    evento_pai_id         bigint      references evento (id) on delete cascade,
    local_id              bigint      references local (id),
    titulo                text        not null,
    descricao             text,
    tipo                  text        not null default 'palestra',
    modalidade            text        not null check (modalidade in ('presencial', 'digital', 'hibrida')),
    inicio                timestamptz not null,
    fim                   timestamptz not null,
    vagas                 integer     check (vagas > 0),          -- null = sem limite (só digital)
    link_acesso           text,
    situacao              text        not null default 'aberto'
                          check (situacao in ('aberto', 'lotado', 'encerrado', 'realizado', 'cancelado')),
    permite_cancelamento  boolean     not null default true,      -- participante pode cancelar a inscrição
    criado_em             timestamptz not null default now(),
    constraint evento_periodo_valido check (fim > inicio),
    constraint evento_presencial_tem_local check (modalidade = 'digital' or local_id is not null),
    constraint evento_digital_tem_link check (modalidade = 'presencial' or link_acesso is not null),
    constraint evento_presencial_tem_vagas check (modalidade = 'digital' or vagas is not null)
);

create index evento_local_periodo_idx on evento (local_id, inicio, fim);
create index evento_pai_idx on evento (evento_pai_id);

-- Alunos da FCI e participantes de outras unidades (US07 a US09)
create table participante (
    id         bigint generated always as identity primary key,
    nome       text        not null,
    email      text        not null unique,
    ra         text        unique,
    criado_em  timestamptz not null default now()
);

-- Resolve o N:N entre evento e participante (US07 a US09)
create table inscricao (
    id               bigint generated always as identity primary key,
    evento_id        bigint      not null references evento (id) on delete cascade,
    participante_id  bigint      not null references participante (id) on delete cascade,
    situacao         text        not null default 'confirmado'
                     check (situacao in ('confirmado', 'em_espera', 'cancelado', 'concluido')),
    criado_em        timestamptz not null default now(),
    cancelado_em     timestamptz
);

-- Um participante não pode ter duas inscrições ativas na mesma atividade
create unique index inscricao_ativa_unica on inscricao (evento_id, participante_id)
    where situacao <> 'cancelado';

-- Fotos dos eventos (US10 · RF-02); colunas de metadados preenchidas pela Lambda do RF-03
create table arquivo (
    id               bigint generated always as identity primary key,
    evento_id        bigint      not null references evento (id) on delete cascade,
    chave_s3         text        not null unique,
    nome_original    text        not null,
    legenda          text,
    tipo_mime        text,
    tamanho_bytes    bigint,
    largura          integer,
    altura           integer,
    chave_miniatura  text,
    processado_em    timestamptz,
    criado_em        timestamptz not null default now()
);

commit;

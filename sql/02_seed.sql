-- Dados iniciais para demonstração. Executar depois do 01_schema.sql:  \i 02_seed.sql

begin;

insert into local (nome, tipo, localizacao, capacidade) values
    ('Auditório Ruy Barbosa', 'fisico',  'Prédio 19 - Ed. Ashbel Green Simonton', 150),
    ('Anfiteatro da FCI',     'fisico',  'Prédio 31 - Ed. Paulo Breda Filho',      120),
    ('Sala 305',              'fisico',  'Prédio 31 - Ed. Paulo Breda Filho',       60),
    ('Laboratório 12',        'fisico',  'Prédio 33 - Ed. Rev. Matthias Gomes',     40),
    ('Teams FCI',             'digital', null,                                     null);

insert into bloqueio_local (local_id, inicio, fim, motivo)
select id, '2026-11-20 08:00-03', '2026-11-21 22:00-03', 'Manutenção do ar-condicionado'
from local where nome = 'Sala 305';

-- Evento principal (sem local próprio) e suas atividades
insert into evento (titulo, descricao, tipo, modalidade, inicio, fim, vagas, link_acesso)
values ('Semana de Tecnologia e Inovação 2026', 'STI da FCI', 'semana', 'digital',
        '2026-11-09 08:00-03', '2026-11-13 22:00-03', null, 'https://fci.mackenzie.br/sti');

insert into evento (evento_pai_id, local_id, titulo, tipo, modalidade, inicio, fim, vagas, link_acesso)
select pai.id, l.id, a.titulo, a.tipo, a.modalidade, a.inicio::timestamptz, a.fim::timestamptz, a.vagas, a.link
from (values
    ('Auditório Ruy Barbosa', 'Abertura: carreira em nuvem',       'palestra', 'hibrida',    '2026-11-09 19:00-03', '2026-11-09 21:00-03', 150, 'https://teams.example/abertura'),
    ('Laboratório 12',        'Oficina: versionamento com Git',    'oficina',  'presencial', '2026-11-10 14:00-03', '2026-11-10 17:00-03',  40, null),
    ('Anfiteatro da FCI',     'Workshop: AWS Lambda na prática',   'workshop', 'presencial', '2026-11-11 19:00-03', '2026-11-11 22:00-03', 100, null),
    ('Teams FCI',             'Segurança da informação: por onde começar', 'palestra', 'digital', '2026-11-12 19:00-03', '2026-11-12 20:30-03', null, 'https://teams.example/seguranca')
) as a (local_nome, titulo, tipo, modalidade, inicio, fim, vagas, link)
join local l on l.nome = a.local_nome
cross join (select id from evento where titulo = 'Semana de Tecnologia e Inovação 2026') pai;

insert into participante (nome, email, ra) values
    ('Isadora Castelo', 'isadora.castelo@mackenzista.com.br', '32210455'),
    ('Pedro Antunes',   'pedro.antunes@mackenzista.com.br',   '32215566'),
    ('Marina Lopes',    'marina.lopes@mackenzista.com.br',    '32219988');

insert into inscricao (evento_id, participante_id)
select e.id, p.id
from evento e cross join participante p
where e.titulo = 'Abertura: carreira em nuvem'
   or (e.titulo = 'Oficina: versionamento com Git' and p.ra <> '32219988');

commit;

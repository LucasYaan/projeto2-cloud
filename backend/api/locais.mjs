// Locais e bloqueios (US01 · RF-01)
import { consultar, transacao } from './db.mjs';
import { falha, texto, inteiroPositivo, dataHora, umDe, idDaRota } from './http.mjs';

const SELECT_LOCAL = `
  select l.*,
         (select count(*) from evento e
           where e.local_id = l.id and e.situacao <> 'cancelado' and e.fim > now()) as eventos_futuros
  from local l`;

async function buscarLocal(id, cliente = { consultar }) {
  const [local] = await cliente.consultar(`${SELECT_LOCAL} where l.id = $1`, [id]);
  if (!local) throw falha(404, 'Local não encontrado.');
  return local;
}

function validarLocal(dados) {
  const local = {
    nome: texto(dados.nome, 'nome', { obrigatorio: true }),
    tipo: umDe(dados.tipo, 'tipo', ['fisico', 'digital'], { obrigatorio: true }),
    localizacao: texto(dados.localizacao, 'localizacao'),
    capacidade: inteiroPositivo(dados.capacidade, 'capacidade'),
    ativo: dados.ativo === undefined ? true : dados.ativo !== false && dados.ativo !== 'false',
  };
  if (local.tipo === 'fisico' && local.capacidade === null) {
    throw falha(400, 'Local físico precisa de capacidade, usada no controle de vagas.');
  }
  return local;
}

export async function listar({ query }) {
  const ativo = query.ativo === undefined ? null : query.ativo === 'true';
  return consultar(`${SELECT_LOCAL} where ($1::boolean is null or l.ativo = $1) order by l.nome`, [ativo]);
}

export async function obter({ params }) {
  const local = await buscarLocal(idDaRota(params.id));
  local.bloqueios = await consultar(
    'select * from bloqueio_local where local_id = $1 order by inicio', [local.id]);
  return local;
}

export async function criar({ corpo }) {
  const l = validarLocal(corpo);
  const [novo] = await consultar(
    `insert into local (nome, tipo, localizacao, capacidade, ativo)
     values ($1, $2, $3, $4, $5) returning *`,
    [l.nome, l.tipo, l.localizacao, l.capacidade, l.ativo]);
  return { status: 201, corpo: novo };
}

export async function atualizar({ params, corpo }) {
  const atual = await buscarLocal(idDaRota(params.id));
  const l = validarLocal({ ...atual, ...corpo });
  if (l.capacidade !== null) {
    const [maior] = await consultar(
      `select titulo, vagas from evento
        where local_id = $1 and situacao <> 'cancelado' and fim > now() and vagas > $2
        order by vagas desc limit 1`, [atual.id, l.capacidade]);
    if (maior) {
      throw falha(422, `A atividade "${maior.titulo}" tem ${maior.vagas} vagas; reduza as vagas dela antes de diminuir a capacidade para ${l.capacidade}.`);
    }
  }
  const [salvo] = await consultar(
    `update local set nome = $2, tipo = $3, localizacao = $4, capacidade = $5, ativo = $6
     where id = $1 returning *`,
    [atual.id, l.nome, l.tipo, l.localizacao, l.capacidade, l.ativo]);
  return salvo;
}

// Sem histórico: exclui de verdade. Com histórico: desativa. Com eventos futuros: recusa (US01).
export async function remover({ params }) {
  return transacao(async (c) => {
    const local = await buscarLocal(idDaRota(params.id), c);
    if (local.eventos_futuros > 0) {
      throw falha(409, `O local tem ${local.eventos_futuros} evento(s) futuro(s) agendado(s). Remaneje ou cancele antes de desativar.`);
    }
    const [{ total }] = await c.consultar('select count(*) as total from evento where local_id = $1', [local.id]);
    if (total > 0) {
      await c.consultar('update local set ativo = false where id = $1', [local.id]);
    } else {
      await c.consultar('delete from local where id = $1', [local.id]);
    }
    return { status: 204 };
  });
}

// ---- bloqueios ----

export async function listarBloqueios({ params }) {
  const local = await buscarLocal(idDaRota(params.id));
  return consultar('select * from bloqueio_local where local_id = $1 order by inicio', [local.id]);
}

export async function criarBloqueio({ params, corpo, query }) {
  const local = await buscarLocal(idDaRota(params.id));
  const inicio = dataHora(corpo.inicio, 'inicio', { obrigatorio: true });
  const fim = dataHora(corpo.fim, 'fim', { obrigatorio: true });
  if (fim <= inicio) throw falha(400, 'O fim do bloqueio deve ser depois do início.');

  // Bloqueio não cancela eventos; o administrador confirma reenviando com ?forcar=true
  if (query.forcar !== 'true') {
    const conflitos = await consultar(
      `select id, titulo, inicio, fim from evento
        where local_id = $1 and situacao <> 'cancelado' and inicio < $3 and fim > $2
        order by inicio`, [local.id, inicio, fim]);
    if (conflitos.length) {
      throw falha(409, `Já há ${conflitos.length} evento(s) neste local no período, a começar por "${conflitos[0].titulo}". Reenvie com ?forcar=true para bloquear mesmo assim.`);
    }
  }
  const [bloqueio] = await consultar(
    `insert into bloqueio_local (local_id, inicio, fim, motivo) values ($1, $2, $3, $4) returning *`,
    [local.id, inicio, fim, texto(corpo.motivo, 'motivo')]);
  return { status: 201, corpo: bloqueio };
}

export async function removerBloqueio({ params }) {
  const linhas = await consultar(
    'delete from bloqueio_local where id = $1 and local_id = $2 returning id',
    [idDaRota(params.bloqueioId), idDaRota(params.id)]);
  if (!linhas.length) throw falha(404, 'Bloqueio não encontrado.');
  return { status: 204 };
}

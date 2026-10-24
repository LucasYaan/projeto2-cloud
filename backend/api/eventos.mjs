// Eventos e atividades (US02 a US06 · RF-01). Atividade = evento com evento_pai_id.
import { consultar, transacao } from './db.mjs';
import { falha, texto, inteiroPositivo, dataHora, umDe, idDaRota } from './http.mjs';

const MODALIDADES = ['presencial', 'digital', 'hibrida'];
const SITUACOES = ['aberto', 'lotado', 'encerrado', 'realizado', 'cancelado'];

// Evento com o nome do local e o total de inscrições confirmadas
const SELECT_EVENTO = `
  select e.*, l.nome as local_nome, l.localizacao as local_localizacao,
         coalesce(i.confirmados, 0) as inscritos
  from evento e
  left join local l on l.id = e.local_id
  left join (select evento_id, count(*) as confirmados
               from inscricao where situacao = 'confirmado'
              group by evento_id) i on i.evento_id = e.id`;

export async function buscarEvento(id, cliente = { consultar }) {
  const [evento] = await cliente.consultar(`${SELECT_EVENTO} where e.id = $1`, [id]);
  if (!evento) throw falha(404, 'Evento não encontrado.');
  return evento;
}

// Valida os campos e as regras de agenda e capacidade (US02, US03)
async function validarEvento(c, dados, idAtual = null) {
  const ev = {
    evento_pai_id: inteiroPositivo(dados.evento_pai_id, 'evento_pai_id'),
    local_id: inteiroPositivo(dados.local_id, 'local_id'),
    titulo: texto(dados.titulo, 'titulo', { obrigatorio: true }),
    descricao: texto(dados.descricao, 'descricao'),
    tipo: texto(dados.tipo, 'tipo') || 'palestra',
    modalidade: umDe(dados.modalidade, 'modalidade', MODALIDADES, { obrigatorio: true }),
    inicio: dataHora(dados.inicio, 'inicio', { obrigatorio: true }),
    fim: dataHora(dados.fim, 'fim', { obrigatorio: true }),
    vagas: inteiroPositivo(dados.vagas, 'vagas'),
    link_acesso: texto(dados.link_acesso, 'link_acesso'),
    permite_cancelamento: dados.permite_cancelamento === undefined ? true : dados.permite_cancelamento !== false,
  };
  if (ev.fim <= ev.inicio) throw falha(400, 'O fim deve ser depois do início.');
  if (ev.modalidade !== 'presencial' && !ev.link_acesso) {
    throw falha(400, 'Atividade digital ou híbrida precisa do link de acesso.');
  }

  if (ev.evento_pai_id) {
    if (ev.evento_pai_id === idAtual) throw falha(400, 'Um evento não pode ser atividade de si mesmo.');
    const [pai] = await c.consultar('select id from evento where id = $1', [ev.evento_pai_id]);
    if (!pai) throw falha(400, 'Evento principal (evento_pai_id) não encontrado.');
  }

  let local = null;
  if (ev.local_id) {
    [local] = await c.consultar('select * from local where id = $1', [ev.local_id]);
    if (!local) throw falha(400, 'Local não encontrado.');
    if (!local.ativo) throw falha(422, `O local "${local.nome}" está desativado.`);
  }
  if (ev.modalidade !== 'digital') {
    if (!local) throw falha(400, 'Atividade presencial ou híbrida precisa de um local físico.');
    if (local.tipo !== 'fisico') throw falha(400, 'Atividade presencial ou híbrida precisa de um local físico.');
    if (ev.vagas === null) throw falha(400, 'Atividade presencial ou híbrida precisa da quantidade de vagas.');
  }
  if (local && local.capacidade !== null && ev.vagas !== null && ev.vagas > local.capacidade) {
    throw falha(422, `As ${ev.vagas} vagas excedem a capacidade de ${local.capacidade} lugares de "${local.nome}".`);
  }

  if (local && local.tipo === 'fisico') {
    // Mesmo local e horário sobreposto; evento principal e suas atividades não conflitam entre si
    const [conflito] = await c.consultar(
      `select titulo, inicio, fim from evento
        where local_id = $1 and situacao <> 'cancelado'
          and inicio < $3 and fim > $2
          and id is distinct from $4::bigint
          and id is distinct from $5::bigint
          and ($4::bigint is null or evento_pai_id is distinct from $4::bigint)
        limit 1`,
      [local.id, ev.inicio, ev.fim, idAtual, ev.evento_pai_id]);
    if (conflito) {
      throw falha(409, `"${local.nome}" já está ocupado por "${conflito.titulo}" de ${conflito.inicio.toISOString()} a ${conflito.fim.toISOString()}.`);
    }
    const [bloqueio] = await c.consultar(
      `select motivo from bloqueio_local where local_id = $1 and inicio < $3 and fim > $2 limit 1`,
      [local.id, ev.inicio, ev.fim]);
    if (bloqueio) {
      throw falha(409, `"${local.nome}" está bloqueado no período${bloqueio.motivo ? ': ' + bloqueio.motivo : ''}.`);
    }
  }
  return ev;
}

export async function listar({ query }) {
  const filtros = [];
  const p = [];
  const add = (sql, valor) => { p.push(valor); filtros.push(sql.replace('?', '$' + p.length)); };
  if (query.tipo) add('e.tipo = ?', query.tipo);
  if (query.situacao) add('e.situacao = ?', umDe(query.situacao, 'situacao', SITUACOES));
  if (query.local_id) add('e.local_id = ?', idDaRota(query.local_id));
  if (query.de) add('e.fim >= ?', dataHora(query.de, 'de'));
  if (query.ate) add('e.inicio <= ?', dataHora(query.ate, 'ate'));
  if (query.principal === 'true') filtros.push('e.evento_pai_id is null');
  const where = filtros.length ? ' where ' + filtros.join(' and ') : '';
  return consultar(`${SELECT_EVENTO}${where} order by e.inicio, e.id`, p);
}

export async function obter({ params }) {
  const evento = await buscarEvento(idDaRota(params.id));
  evento.atividades = await consultar(`${SELECT_EVENTO} where e.evento_pai_id = $1 order by e.inicio`, [evento.id]);
  return evento;
}

export async function criar({ corpo }) {
  return transacao(async (c) => {
    const ev = await validarEvento(c, corpo);
    const [novo] = await c.consultar(
      `insert into evento (evento_pai_id, local_id, titulo, descricao, tipo, modalidade,
                           inicio, fim, vagas, link_acesso, permite_cancelamento)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
      [ev.evento_pai_id, ev.local_id, ev.titulo, ev.descricao, ev.tipo, ev.modalidade,
        ev.inicio, ev.fim, ev.vagas, ev.link_acesso, ev.permite_cancelamento]);
    return { status: 201, corpo: await buscarEvento(novo.id, c) };
  });
}

export async function atualizar({ params, corpo }) {
  return transacao(async (c) => {
    const atual = await buscarEvento(idDaRota(params.id), c);
    if (['cancelado', 'realizado'].includes(atual.situacao)) {
      throw falha(409, `Evento ${atual.situacao} não pode ser alterado.`);
    }
    // Campo ausente no corpo mantém o valor atual; null explícito apaga (e a validação decide)
    const ev = await validarEvento(c, { ...atual, ...corpo }, atual.id);
    if (ev.vagas !== null && ev.vagas < atual.inscritos) {
      throw falha(422, `Já há ${atual.inscritos} inscrições confirmadas; as vagas não podem ficar abaixo disso.`);
    }
    let situacao = atual.situacao;
    if (situacao === 'aberto' || situacao === 'lotado') {
      situacao = ev.vagas !== null && atual.inscritos >= ev.vagas ? 'lotado' : 'aberto';
    }
    await c.consultar(
      `update evento set evento_pai_id = $2, local_id = $3, titulo = $4, descricao = $5, tipo = $6,
              modalidade = $7, inicio = $8, fim = $9, vagas = $10, link_acesso = $11,
              permite_cancelamento = $12, situacao = $13
        where id = $1`,
      [atual.id, ev.evento_pai_id, ev.local_id, ev.titulo, ev.descricao, ev.tipo, ev.modalidade,
        ev.inicio, ev.fim, ev.vagas, ev.link_acesso, ev.permite_cancelamento, situacao]);
    return buscarEvento(atual.id, c);
  });
}

export async function alterarSituacao({ params, corpo }) {
  const situacao = umDe(corpo.situacao, 'situacao', SITUACOES, { obrigatorio: true });
  if (situacao === 'cancelado') return cancelar({ params });
  const evento = await buscarEvento(idDaRota(params.id));
  if (evento.situacao === 'cancelado') throw falha(409, 'Evento cancelado não muda de situação.');
  await consultar('update evento set situacao = $2 where id = $1', [evento.id, situacao]);
  return buscarEvento(evento.id);
}

// Cancela o evento e suas atividades, e cancela as inscrições ativas (US04)
export async function cancelar({ params }) {
  return transacao(async (c) => {
    const evento = await buscarEvento(idDaRota(params.id), c);
    if (evento.situacao === 'realizado') throw falha(409, 'Evento já realizado não pode ser cancelado.');
    const cancelados = await c.consultar(
      `update evento set situacao = 'cancelado'
        where (id = $1 or evento_pai_id = $1) and situacao <> 'realizado'
        returning id`, [evento.id]);
    const inscricoes = await c.consultar(
      `update inscricao set situacao = 'cancelado', cancelado_em = now()
        where evento_id = any($1) and situacao in ('confirmado', 'em_espera')
        returning id`, [cancelados.map((e) => e.id)]);
    const atualizado = await buscarEvento(evento.id, c);
    return { ...atualizado, atividades_canceladas: cancelados.length - 1, inscricoes_canceladas: inscricoes.length };
  });
}

// Exclusão definitiva, para eventos cadastrados por engano. Com inscrições ativas, o caminho é cancelar.
export async function remover({ params }) {
  return transacao(async (c) => {
    const evento = await buscarEvento(idDaRota(params.id), c);
    const [{ ativas }] = await c.consultar(
      `select count(*) as ativas from inscricao i join evento e on e.id = i.evento_id
        where (e.id = $1 or e.evento_pai_id = $1) and i.situacao in ('confirmado', 'em_espera')`,
      [evento.id]);
    if (ativas > 0) {
      throw falha(409, `O evento tem ${ativas} inscrição(ões) ativa(s). Use o cancelamento para avisar os inscritos.`);
    }
    await c.consultar('delete from evento where id = $1', [evento.id]);
    return { status: 204 };
  });
}

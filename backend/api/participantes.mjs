// Participantes e inscrições (US07 a US09 · RF-01). Inscrição resolve o N:N evento ↔ participante.
import { consultar, transacao } from './db.mjs';
import { falha, texto, idDaRota, inteiroPositivo } from './http.mjs';
import { buscarEvento } from './eventos.mjs';

const SELECT_INSCRICAO = `
  select i.*, p.nome as participante_nome, p.email as participante_email,
         e.titulo as evento_titulo, e.inicio as evento_inicio, e.fim as evento_fim,
         e.modalidade as evento_modalidade, e.link_acesso as evento_link,
         e.situacao as evento_situacao, l.nome as local_nome
  from inscricao i
  join participante p on p.id = i.participante_id
  join evento e on e.id = i.evento_id
  left join local l on l.id = e.local_id`;

async function buscarParticipante(id, cliente = { consultar }) {
  const [participante] = await cliente.consultar('select * from participante where id = $1', [id]);
  if (!participante) throw falha(404, 'Participante não encontrado.');
  return participante;
}

function validarParticipante(dados) {
  const p = {
    nome: texto(dados.nome, 'nome', { obrigatorio: true }),
    email: texto(dados.email, 'email', { obrigatorio: true })?.toLowerCase(),
    ra: texto(dados.ra, 'ra'),
  };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) throw falha(400, 'E-mail inválido.');
  return p;
}

export async function listar() {
  return consultar('select * from participante order by nome');
}

export async function obter({ params }) {
  return buscarParticipante(idDaRota(params.id));
}

export async function criar({ corpo }) {
  const p = validarParticipante(corpo);
  const [novo] = await consultar(
    'insert into participante (nome, email, ra) values ($1, $2, $3) returning *', [p.nome, p.email, p.ra]);
  return { status: 201, corpo: novo };
}

export async function atualizar({ params, corpo }) {
  const atual = await buscarParticipante(idDaRota(params.id));
  const p = validarParticipante({ ...atual, ...corpo });
  const [salvo] = await consultar(
    'update participante set nome = $2, email = $3, ra = $4 where id = $1 returning *',
    [atual.id, p.nome, p.email, p.ra]);
  return salvo;
}

// ---- inscrições ----

export async function inscricoesDoParticipante({ params }) {
  const participante = await buscarParticipante(idDaRota(params.id));
  return consultar(`${SELECT_INSCRICAO} where i.participante_id = $1 order by e.inicio`, [participante.id]);
}

export async function inscricoesDoEvento({ params }) {
  const evento = await buscarEvento(idDaRota(params.id));
  return consultar(`${SELECT_INSCRICAO} where i.evento_id = $1 order by i.criado_em`, [evento.id]);
}

// US07: valida vaga e duplicidade; a última vaga deixa o evento "lotado"
export async function inscrever({ params, corpo }) {
  const participanteId = inteiroPositivo(corpo.participante_id, 'participante_id', { obrigatorio: true });
  return transacao(async (c) => {
    const eventoId = idDaRota(params.id);
    // Trava a linha do evento para duas inscrições simultâneas não passarem da última vaga
    const [travado] = await c.consultar('select id from evento where id = $1 for update', [eventoId]);
    if (!travado) throw falha(404, 'Evento não encontrado.');
    const evento = await buscarEvento(eventoId, c);
    const participante = await buscarParticipante(participanteId, c);

    if (evento.situacao === 'lotado') throw falha(409, 'Não há mais vagas nesta atividade.');
    if (evento.situacao !== 'aberto') throw falha(422, `A atividade está ${evento.situacao} e não aceita inscrições.`);
    const [duplicada] = await c.consultar(
      `select id from inscricao where evento_id = $1 and participante_id = $2 and situacao <> 'cancelado'`,
      [evento.id, participante.id]);
    if (duplicada) throw falha(409, `${participante.nome} já está inscrito(a) nesta atividade.`);
    if (evento.vagas !== null && evento.inscritos >= evento.vagas) {
      await c.consultar(`update evento set situacao = 'lotado' where id = $1`, [evento.id]);
      throw falha(409, 'Não há mais vagas nesta atividade.');
    }

    const [nova] = await c.consultar(
      `insert into inscricao (evento_id, participante_id) values ($1, $2) returning id`,
      [evento.id, participante.id]);
    if (evento.vagas !== null && evento.inscritos + 1 >= evento.vagas) {
      await c.consultar(`update evento set situacao = 'lotado' where id = $1`, [evento.id]);
    }
    const [inscricao] = await c.consultar(`${SELECT_INSCRICAO} where i.id = $1`, [nova.id]);
    return { status: 201, corpo: inscricao };
  });
}

// US09: cancela a inscrição e libera a vaga
export async function cancelarInscricao({ params }) {
  return transacao(async (c) => {
    const [inscricao] = await c.consultar(
      `select i.*, e.permite_cancelamento, e.situacao as evento_situacao
         from inscricao i join evento e on e.id = i.evento_id
        where i.id = $1 for update of i`, [idDaRota(params.id)]);
    if (!inscricao) throw falha(404, 'Inscrição não encontrada.');
    if (inscricao.situacao === 'cancelado') return { status: 204 };
    if (!inscricao.permite_cancelamento) {
      throw falha(409, 'O organizador não permite cancelar inscrições nesta atividade.');
    }
    await c.consultar(
      `update inscricao set situacao = 'cancelado', cancelado_em = now() where id = $1`, [inscricao.id]);
    if (inscricao.evento_situacao === 'lotado') {
      await c.consultar(`update evento set situacao = 'aberto' where id = $1`, [inscricao.evento_id]);
    }
    return { status: 204 };
  });
}

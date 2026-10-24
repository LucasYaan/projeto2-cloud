// Lambda da API (ADR-001): um único handler atrás do API Gateway, rota "ANY /{proxy+}".
import { consultar } from './db.mjs';
import { lerRequisicao, resposta, traduzirErroBanco, ErroHttp } from './http.mjs';
import * as locais from './locais.mjs';
import * as eventos from './eventos.mjs';
import * as participantes from './participantes.mjs';

// Mostra que a Lambda alcança o RDS e quantos registros há em cada tabela (útil no vídeo)
async function saude() {
  const [banco] = await consultar(
    `select current_database() as banco, version() as versao, now() as agora,
            inet_server_addr()::text as ip_privado_rds`);
  const tabelas = await consultar(
    `select 'local' as tabela, count(*) as registros from local
     union all select 'bloqueio_local', count(*) from bloqueio_local
     union all select 'evento', count(*) from evento
     union all select 'participante', count(*) from participante
     union all select 'inscricao', count(*) from inscricao
     union all select 'arquivo', count(*) from arquivo`);
  return { status: 'ok', ...banco, tabelas };
}

const ROTAS = [
  ['GET', '/saude', saude],

  ['GET', '/locais', locais.listar],
  ['POST', '/locais', locais.criar],
  ['GET', '/locais/:id', locais.obter],
  ['PUT', '/locais/:id', locais.atualizar],
  ['DELETE', '/locais/:id', locais.remover],
  ['GET', '/locais/:id/bloqueios', locais.listarBloqueios],
  ['POST', '/locais/:id/bloqueios', locais.criarBloqueio],
  ['DELETE', '/locais/:id/bloqueios/:bloqueioId', locais.removerBloqueio],

  ['GET', '/eventos', eventos.listar],
  ['POST', '/eventos', eventos.criar],
  ['GET', '/eventos/:id', eventos.obter],
  ['PUT', '/eventos/:id', eventos.atualizar],
  ['DELETE', '/eventos/:id', eventos.remover],
  ['PATCH', '/eventos/:id/situacao', eventos.alterarSituacao],
  ['POST', '/eventos/:id/cancelamento', eventos.cancelar],
  ['GET', '/eventos/:id/inscricoes', participantes.inscricoesDoEvento],
  ['POST', '/eventos/:id/inscricoes', participantes.inscrever],

  ['GET', '/participantes', participantes.listar],
  ['POST', '/participantes', participantes.criar],
  ['GET', '/participantes/:id', participantes.obter],
  ['PUT', '/participantes/:id', participantes.atualizar],
  ['GET', '/participantes/:id/inscricoes', participantes.inscricoesDoParticipante],
  ['DELETE', '/inscricoes/:id', participantes.cancelarInscricao],
].map(([metodo, padrao, fn]) => ({
  metodo,
  fn,
  nomes: [...padrao.matchAll(/:(\w+)/g)].map((m) => m[1]),
  regex: new RegExp('^' + padrao.replace(/:\w+/g, '([^/]+)') + '$'),
}));

function encontrarRota(metodo, caminho) {
  let caminhoExiste = false;
  for (const rota of ROTAS) {
    const m = caminho.match(rota.regex);
    if (!m) continue;
    caminhoExiste = true;
    if (rota.metodo === metodo) {
      const params = Object.fromEntries(rota.nomes.map((nome, i) => [nome, decodeURIComponent(m[i + 1])]));
      return { rota, params };
    }
  }
  throw new ErroHttp(caminhoExiste ? 405 : 404, caminhoExiste ? 'Método não permitido.' : 'Rota não encontrada.');
}

export async function handler(evento) {
  try {
    const req = lerRequisicao(evento);
    if (req.metodo === 'OPTIONS') return resposta(204);
    const { rota, params } = encontrarRota(req.metodo, req.caminho);
    const resultado = await rota.fn({ ...req, params });
    // Funções devolvem o corpo direto (200) ou { status, corpo } quando o status é outro
    if (resultado && typeof resultado.status === 'number' && !('id' in resultado)) {
      return resposta(resultado.status, resultado.status === 204 ? undefined : resultado.corpo);
    }
    return resposta(200, resultado);
  } catch (e) {
    const erro = e instanceof ErroHttp ? e : traduzirErroBanco(e);
    if (erro) return resposta(erro.status, { erro: erro.message });
    console.error('Erro não tratado', e);
    return resposta(500, { erro: 'Erro interno. Consulte o log no CloudWatch.' });
  }
}

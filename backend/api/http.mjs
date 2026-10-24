// Utilitários HTTP: leitura do evento do API Gateway, respostas JSON e validação.

export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

export const falha = (status, mensagem) => new ErroHttp(status, mensagem);

// O CORS também é configurado no API Gateway; os cabeçalhos aqui cobrem o teste direto na Lambda
const CABECALHOS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': 'content-type',
};

export function resposta(status, corpo) {
  return {
    statusCode: status,
    headers: CABECALHOS,
    body: corpo === undefined ? '' : JSON.stringify(corpo),
  };
}

// Aceita o formato 2.0 (HTTP API) e o 1.0 (REST API) do API Gateway
export function lerRequisicao(evento) {
  const ctx = evento.requestContext || {};
  const metodo = (ctx.http?.method || evento.httpMethod || 'GET').toUpperCase();
  let caminho = evento.rawPath || evento.path || '/';
  // Em HTTP API com estágio nomeado, o rawPath vem com o prefixo do estágio
  if (evento.rawPath && ctx.stage && ctx.stage !== '$default' && caminho.startsWith(`/${ctx.stage}/`)) {
    caminho = caminho.slice(ctx.stage.length + 1);
  }
  caminho = caminho.replace(/\/+$/, '') || '/';

  let corpo = {};
  if (evento.body) {
    const texto = evento.isBase64Encoded ? Buffer.from(evento.body, 'base64').toString('utf8') : evento.body;
    try {
      corpo = JSON.parse(texto);
    } catch {
      throw falha(400, 'O corpo da requisição não é um JSON válido.');
    }
  }
  return { metodo, caminho, query: evento.queryStringParameters || {}, corpo };
}

// Converte erros do PostgreSQL em respostas que o front consegue mostrar
export function traduzirErroBanco(e) {
  switch (e.code) {
    case '23505': return falha(409, 'Já existe um registro com esses dados (' + (e.constraint || 'valor único') + ').');
    case '23503': return falha(409, 'O registro está ligado a outro que não existe ou ainda está em uso.');
    case '23514': return falha(400, 'Dados inválidos: regra ' + (e.constraint || 'de validação') + ' não atendida.');
    case '23502': return falha(400, 'Campo obrigatório ausente: ' + (e.column || '?') + '.');
    case '22P02':
    case '22007':
    case '22008': return falha(400, 'Valor em formato inválido.');
    default: return null;
  }
}

// ---- validação ----

export function texto(valor, campo, { obrigatorio = false } = {}) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    if (obrigatorio) throw falha(400, `O campo "${campo}" é obrigatório.`);
    return null;
  }
  return String(valor).trim();
}

export function inteiroPositivo(valor, campo, { obrigatorio = false } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    if (obrigatorio) throw falha(400, `O campo "${campo}" é obrigatório.`);
    return null;
  }
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw falha(400, `O campo "${campo}" deve ser um inteiro positivo.`);
  return n;
}

export function dataHora(valor, campo, { obrigatorio = false } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    if (obrigatorio) throw falha(400, `O campo "${campo}" é obrigatório.`);
    return null;
  }
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) throw falha(400, `O campo "${campo}" deve ser uma data/hora ISO 8601.`);
  return d.toISOString();
}

export function umDe(valor, campo, opcoes, { obrigatorio = false } = {}) {
  const v = texto(valor, campo, { obrigatorio });
  if (v !== null && !opcoes.includes(v)) {
    throw falha(400, `O campo "${campo}" deve ser um destes: ${opcoes.join(', ')}.`);
  }
  return v;
}

export function idDaRota(valor) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw falha(404, 'Registro não encontrado.');
  return n;
}

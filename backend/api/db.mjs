// Conexão com o RDS. Configuração só por variáveis de ambiente da Lambda (RNF-02, RNF-03).
import pg from 'pg';

// bigint (ids e count) chega como string por padrão; os valores do projeto cabem em Number
pg.types.setTypeParser(20, Number);

// Criado fora do handler para ser reaproveitado entre invocações da mesma instância (ADR-001)
let pool;

function obterPool() {
  if (!pool) {
    pool = new pg.Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'eventos',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 1,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 5000,
      // O RDS exige TLS por padrão. A conexão é cifrada; o certificado não é verificado
      // porque o tráfego não sai da VPC. DB_SSL=false serve só para teste local.
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    });
    // Sem este listener, uma conexão ociosa derrubada (ex.: RDS reiniciado) encerraria a Lambda
    pool.on('error', (e) => console.warn('Conexão ociosa com o banco encerrada:', e.message));
  }
  return pool;
}

const ERROS_DE_CONEXAO = ['ECONNRESET', 'EPIPE', 'ETIMEDOUT', '57P01'];
const conexaoCaiu = (e) => ERROS_DE_CONEXAO.includes(e.code) || /Connection terminated/i.test(e.message);

// Uma nova tentativa quando a conexão reaproveitada já tinha caído
export async function consultar(sql, parametros = []) {
  try {
    return (await obterPool().query(sql, parametros)).rows;
  } catch (e) {
    if (!conexaoCaiu(e)) throw e;
    return (await obterPool().query(sql, parametros)).rows;
  }
}

// Executa fn(cliente) dentro de uma transação; cliente.consultar tem a mesma assinatura de consultar
export async function transacao(fn) {
  const conexao = await obterPool().connect();
  const cliente = {
    consultar: async (sql, parametros = []) => (await conexao.query(sql, parametros)).rows,
  };
  try {
    await conexao.query('begin');
    const resultado = await fn(cliente);
    await conexao.query('commit');
    return resultado;
  } catch (e) {
    await conexao.query('rollback');
    throw e;
  } finally {
    conexao.release();
  }
}

# projeto2-cloud — Sistema de Gestão de Eventos e Auditórios FCI

Aplicação de gestão de eventos da FCI publicada na AWS: API em Lambda atrás do API Gateway,
banco PostgreSQL no Amazon RDS em subnet privada.

| Artefato | Onde está |
| --- | --- |
| Especificação | [specs/spec.md](specs/spec.md) |
| Arquitetura, ER, rotas, Security Groups, ADRs | [specs/design.md](specs/design.md) |
| Log de uso de IA | [specs/ia-log.md](specs/ia-log.md) |
| Scripts SQL | [sql/](sql/) |
| Lambda da API (CRUD) | [backend/api/](backend/api/) |

## Estrutura

```
sql/01_schema.sql        cria as 6 tabelas (apaga e recria)
sql/02_seed.sql          dados de demonstração
backend/api/             Lambda da API em Node.js (driver pg)
  index.mjs              handler e tabela de rotas
  locais.mjs             /locais e /locais/:id/bloqueios
  eventos.mjs            /eventos (atividade = evento com evento_pai_id)
  participantes.mjs      /participantes e inscrições
  db.mjs                 conexão com o RDS (variáveis de ambiente)
  http.mjs               leitura do evento do API Gateway, respostas e validação
```

Nenhuma senha, endpoint ou IP fica no código: a Lambda lê tudo de variáveis de ambiente
(RNF-02, RNF-03).

---

## Infraestrutura (criada pelo console, sem IaC — RNF-05)

Região: **us-east-1**. Antes de começar, crie um **AWS Budget** com alerta (ex.: US$ 5).

### 1. VPC

VPC → **Create VPC** → **VPC and more**:

| Campo | Valor |
| --- | --- |
| Name tag auto-generation | `eventos-fci` |
| IPv4 CIDR | `10.0.0.0/16` |
| Number of AZs | 2 |
| Public subnets / Private subnets | 2 / 2 |
| NAT gateways | **None** (custo; nada na subnet privada precisa de internet) |
| VPC endpoints | **S3 Gateway** (gratuito; usado pelas Lambdas no RF-02/RF-03) |
| DNS hostnames / DNS resolution | habilitados |

Resultado: `eventos-fci-vpc` com 2 subnets públicas (rota para o Internet Gateway) e 2 privadas
(sem rota para a internet; só o endpoint do S3), em `us-east-1a` e `us-east-1b`.

### 2. Security Groups

VPC → Security groups → Create, sempre na `eventos-fci-vpc`:

| SG | Entrada | Saída | Anexado a |
| --- | --- | --- | --- |
| `eventos-lambda-sg` | nenhuma | TCP 5432 → `eventos-rds-sg`; TCP 443 → prefix list `com.amazonaws.us-east-1.s3` | Lambdas |
| `eventos-bastion-sg` | TCP 22 ← prefix list `com.amazonaws.us-east-1.ec2-instance-connect` | tudo | EC2 bastion |
| `eventos-rds-sg` | TCP 5432 ← `eventos-lambda-sg`; TCP 5432 ← `eventos-bastion-sg` | nenhuma | RDS |

As regras referenciam SGs, não IPs: qualquer Lambda ou bastion recriado com o mesmo SG continua
alcançando o banco, e nada de fora da VPC chega ao RDS.

### 3. RDS PostgreSQL

1. Aurora and RDS → **Subnet groups** → Create: `eventos-fci-db-subnets`, VPC `eventos-fci-vpc`,
   só as **duas subnets privadas**.
2. Databases → **Create database** → Full configuration:

| Campo | Valor |
| --- | --- |
| Engine | PostgreSQL |
| Template | Free tier (ou Sandbox) · Single-AZ |
| DB instance identifier | `eventos-fci-db` |
| Master username | `eventos_admin` |
| Credentials management | Self managed (senha forte, guardada fora do repositório) |
| Instance class | `db.t3.micro` · gp3 20 GB · sem storage autoscaling |
| Compute resource | Don't connect to an EC2 compute resource |
| VPC / subnet group | `eventos-fci-vpc` / `eventos-fci-db-subnets` |
| Public access | **No** |
| VPC security group | só `eventos-rds-sg` |
| Initial database name | `eventos` |

Anote o **Endpoint** (aba *Connectivity & security*); ele vai na configuração da Lambda.

### 4. Bastion e criação do schema

EC2 → Launch instance: `eventos-fci-bastion`, Amazon Linux 2023, `t3.micro`, **sem key pair**,
subnet `eventos-fci-subnet-public1-us-east-1a`, Auto-assign public IP **Enable**,
SG `eventos-bastion-sg`.

Conecte pelo console (**Connect → EC2 Instance Connect**) e rode:

```bash
sudo dnf install -y postgresql17 git     # se não existir: dnf search postgresql
git clone https://github.com/LucasYaan/projeto2-cloud.git
cd projeto2-cloud/sql
psql "host=<ENDPOINT-DO-RDS> dbname=eventos user=eventos_admin sslmode=require"
```

Dentro do `psql` (a senha é pedida de forma interativa, nunca vai para arquivo):

```sql
\i 01_schema.sql
\i 02_seed.sql
\dt
select * from local;
```

O bastion só serve para administrar o banco: pode ficar **parado** quando não estiver em uso.

### 5. Lambda da API

Empacote no Windows (gera `dist/eventos-api.zip`, que não vai para o Git):

```powershell
cd backend/api
npm ci --omit=dev
tar.exe -a -c -f ../../dist/eventos-api.zip index.mjs db.mjs http.mjs locais.mjs eventos.mjs participantes.mjs package.json node_modules
```

Lambda → **Create function**:

| Campo | Valor |
| --- | --- |
| Name | `eventos-api` |
| Runtime | Node.js 22.x |
| Execution role | Create a new role with basic Lambda permissions |
| Advanced settings → **Enable VPC** | `eventos-fci-vpc`, as **duas subnets privadas**, SG `eventos-lambda-sg` |

Depois de criada:

1. **Code → Upload from → .zip file** → `dist/eventos-api.zip`. Handler: `index.handler`.
2. **Configuration → General configuration**: Timeout **15 s**, Memory 256 MB.
3. **Configuration → Environment variables**:

   | Chave | Valor |
   | --- | --- |
   | `DB_HOST` | endpoint do RDS |
   | `DB_NAME` | `eventos` |
   | `DB_USER` | `eventos_admin` |
   | `DB_PASSWORD` | senha do banco (fica só na Lambda, cifrada com KMS) |

4. **Test** com o evento abaixo. A resposta deve trazer `"status":"ok"` e a contagem das tabelas.

   ```json
   { "rawPath": "/saude", "requestContext": { "http": { "method": "GET" }, "stage": "$default" } }
   ```

Se a criação reclamar de `ec2:CreateNetworkInterface`, anexe a policy gerenciada
`AWSLambdaVPCAccessExecutionRole` à role da função (IAM → Roles).

Por que a senha está em variável de ambiente e não no Secrets Manager: a Lambda roda na
subnet privada, sem NAT, e o Secrets Manager só seria alcançável com um VPC Interface Endpoint
(cobrado por hora em cada AZ).

### 6. API Gateway

API Gateway → **Create API** → **HTTP API** → Build:

1. Integration: **Lambda** → `eventos-api`. API name: `eventos-fci-api`.
2. Routes: método **ANY**, caminho **`/{proxy+}`** → integração `eventos-api`.
3. Stage: `$default`, auto-deploy ligado.
4. Depois de criar, **CORS**: Allow-Origin `*`, Allow-Methods `GET, POST, PUT, PATCH, DELETE, OPTIONS`,
   Allow-Headers `content-type`.

A **Invoke URL** (`https://<id>.execute-api.us-east-1.amazonaws.com`) é a base da API.
Ela não muda entre sessões; o front-end a recebe por `config.js`.

### 7. Testar a API

No navegador: `<INVOKE-URL>/saude` e `<INVOKE-URL>/locais`.

No PowerShell:

```powershell
$api = "https://<id>.execute-api.us-east-1.amazonaws.com"
$json = @{ 'Content-Type' = 'application/json' }

# Local: criar, consultar, alterar, excluir
$sala = Invoke-RestMethod "$api/locais" -Method Post -Headers $json -Body '{"nome":"Sala 410","tipo":"fisico","capacidade":45,"localizacao":"Prédio 31"}'
Invoke-RestMethod "$api/locais/$($sala.id)"
Invoke-RestMethod "$api/locais/$($sala.id)" -Method Put -Headers $json -Body '{"capacidade":50}'

# Evento ligado ao local (1:N)
$ev = Invoke-RestMethod "$api/eventos" -Method Post -Headers $json -Body (@{
  titulo = 'Workshop de Docker'; modalidade = 'presencial'; local_id = $sala.id; vagas = 30
  inicio = '2026-11-24T19:00:00-03:00'; fim = '2026-11-24T21:00:00-03:00' } | ConvertTo-Json)
Invoke-RestMethod "$api/eventos/$($ev.id)" -Method Put -Headers $json -Body '{"vagas":40}'
Invoke-RestMethod "$api/eventos?local_id=$($sala.id)"

# Exclusão
Invoke-RestMethod "$api/eventos/$($ev.id)" -Method Delete
Invoke-RestMethod "$api/locais/$($sala.id)" -Method Delete
```

No bastion, `select * from local order by id;` mostra que os dados estão no RDS.

### 8. Encerrar e retomar

- **Parar** (não apagar) o RDS e o bastion quando não estiverem em uso. O RDS parado volta
  sozinho depois de 7 dias.
- Para retomar: iniciar o RDS (o endpoint é o mesmo) e, se for preciso administrar o banco,
  iniciar o bastion. O IP público do bastion muda, mas nada depende dele.
- Lambda e API Gateway não precisam de nenhuma ação.

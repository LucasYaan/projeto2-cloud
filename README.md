# Sistema de Gestão de Eventos e Auditórios — FCI

Projeto 2 da disciplina de Serviços em Nuvem (Mackenzie). Aplicação web na AWS para cadastrar locais e eventos da FCI, controlar inscrições e guardar as fotos de cada evento, com um relatório de ocupação dos espaços.

**Integrantes:** Daniel Pauleti, Isadora Piloto e Lucas Yan

## 1. Onde está cada artefato

| Artefato | Caminho |
| --- | --- |
| Especificação (problema, personas, histórias, aplicação dos RF) | [`specs/spec.md`](specs/spec.md) |
| Design (arquitetura, ER, rotas, Security Groups, ADRs) | [`specs/design.md`](specs/design.md) |
| Tarefas (ID, requisito, responsável, status) | [`specs/tasks.md`](specs/tasks.md) |
| Registro de uso de IA | [`specs/ia-log.md`](specs/ia-log.md) |
| Modelo ER (imagem) | [`mer_eventos_fci.png`](mer_eventos_fci.png) |
| Schema do banco (scripts SQL versionados) | `sql/` |
| Código das Lambdas | `backend/api/` e `backend/processador/` |
| Front-end estático | `frontend/` |

O `design.md` descreve o **porquê** de cada decisão (incluindo as ADRs). Este README descreve o **como** recriar tudo.

## 2. Arquitetura em resumo

```
Navegador ──> S3 (site estático)                                   RF-05
Navegador ──> API Gateway (HTTP API) ──> Lambda da API ──> RDS     RF-01, RF-02, RF-04
Navegador ──> S3 (arquivos), por URL pré-assinada                  RF-02
S3 (uploads/) ──> Lambda processadora ──> RDS                      RF-03
Desenvolvedor ──> Bastion EC2 (subnet pública) ──> RDS             aplicar o schema
```

- Conta AWS pessoal, região **`us-east-1`**, com autorização do professor.
- VPC `eventos-fci-vpc` (`10.0.0.0/16`), 2 zonas, 2 subnets públicas e 2 privadas, **sem NAT**.
- RDS PostgreSQL e as duas Lambdas ficam nas subnets privadas. As Lambdas chegam ao S3 por um VPC Endpoint do tipo Gateway.
- A senha do banco fica em variável de ambiente da Lambda (ver [ADR-003](specs/design.md)).
- Nada é criado com IaC: todos os recursos são criados pelo console ou pela CLI, como descrito abaixo (RNF-05).

O diagrama completo está na seção 2 do [`design.md`](specs/design.md).

## 3. Pré-requisitos

- Conta AWS com permissão para criar VPC, EC2, RDS, Lambda, API Gateway, S3 e IAM.
- Região `us-east-1` selecionada no console.
- Node.js e npm na máquina de quem empacota as Lambdas.
- AWS CLI configurada (`aws configure`) para publicar o front-end. Opcional: o upload também pode ser feito pelo console.

Anote os valores a seguir conforme criar os recursos. Eles são usados nos passos seguintes:

| Valor | Onde aparece |
| --- | --- |
| `<BUCKET-SITE>` | Nome do bucket do site (único no mundo) |
| `<BUCKET-ARQUIVOS>` | Nome do bucket das fotos (único no mundo) |
| `<RDS-ENDPOINT>` | Endpoint do banco, no console do RDS |
| `<DB-NOME>`, `<DB-USUARIO>`, `<DB-SENHA>` | Definidos na criação do RDS |
| `<INVOKE-URL>` | URL do HTTP API, no console do API Gateway |

## 4. Criando a infraestrutura, passo a passo

Siga a ordem: cada etapa depende da anterior.

### 4.1 VPC

No console, abra **VPC → Create VPC → VPC and more** e configure:

| Campo | Valor |
| --- | --- |
| Name tag auto-generation | `eventos-fci` (a VPC fica como `eventos-fci-vpc`) |
| IPv4 CIDR | `10.0.0.0/16` |
| Number of Availability Zones | 2 |
| Public subnets | 2 |
| Private subnets | 2 |
| NAT gateways | **None** |
| VPC endpoints | **S3 Gateway** |
| DNS hostnames e DNS resolution | Habilitados |

Isso cria a VPC, as quatro subnets, o Internet Gateway (só as route tables públicas apontam para ele) e o VPC Endpoint do S3 associado às route tables das subnets privadas.

> Não crie NAT Gateway: ele é cobrado por hora e não é necessário. As Lambdas só falam com o RDS e com o S3.

### 4.2 Security Groups

Em **EC2 → Security Groups**, crie os três grupos na VPC `eventos-fci-vpc` (a AWS não aceita nomes iniciados por `sg-`). Crie os três **vazios** primeiro e depois adicione as regras, porque eles se referenciam.

**`eventos-rds-sg`**

| Direção | Tipo / porta | Origem |
| --- | --- | --- |
| Entrada | PostgreSQL, TCP 5432 | `eventos-lambda-sg` |
| Entrada | PostgreSQL, TCP 5432 | `eventos-bastion-sg` |

Não adicione nenhuma regra com `0.0.0.0/0`. Remova a regra de saída padrão (o banco não inicia conexões).

**`eventos-lambda-sg`**

| Direção | Tipo / porta | Destino |
| --- | --- | --- |
| Saída | PostgreSQL, TCP 5432 | `eventos-rds-sg` |
| Saída | HTTPS, TCP 443 | Prefix list do S3 (`com.amazonaws.us-east-1.s3`) |

Sem regras de entrada. Remova a regra de saída padrão (todo o tráfego).

**`eventos-bastion-sg`**

| Direção | Tipo / porta | Origem / destino |
| --- | --- | --- |
| Entrada | SSH, TCP 22 | Prefix list gerenciada do **EC2 Instance Connect** (`us-east-1`) |
| Saída | Padrão (todo o tráfego) | Necessária para instalar o `psql` |

### 4.3 Banco de dados (RDS)

Em **RDS → Create database → Standard create**:

| Campo | Valor |
| --- | --- |
| Engine | PostgreSQL |
| Template | Dev/Test (ou Free tier) |
| Disponibilidade | Single-AZ |
| Instance class | `db.t3.micro` |
| Credentials | **Self managed** (não use o Secrets Manager, ver ADR-003) |
| Master username / password | `<DB-USUARIO>` / `<DB-SENHA>` |
| VPC | `eventos-fci-vpc` |
| DB subnet group | Criar novo, com as **duas subnets privadas** |
| Public access | **No** |
| VPC security group | `eventos-rds-sg` (remova o `default`) |
| Initial database name | `<DB-NOME>` |

Quando o status ficar **Available**, copie o endpoint para `<RDS-ENDPOINT>`.

### 4.4 Bastion e schema do banco

O RDS é privado, então o schema é aplicado a partir de uma instância na subnet pública.

1. **EC2 → Launch instance**: Amazon Linux 2023, `t3.micro`, **sem key pair**, VPC `eventos-fci-vpc`, uma subnet **pública**, *Auto-assign public IP* habilitado, Security Group `eventos-bastion-sg`.
2. Selecione a instância e clique em **Connect → EC2 Instance Connect**.
3. No terminal da instância, instale as ferramentas e baixe o repositório:

   ```bash
   sudo dnf install -y git postgresql16
   git clone <URL-DO-REPOSITORIO>
   cd <pasta-do-repositorio>
   ```

   Se o repositório for privado, crie o arquivo com `nano sql/01_schema.sql` e cole o conteúdo.

4. Aplique o schema (o `psql` pedirá a senha):

   ```bash
   psql "host=<RDS-ENDPOINT> port=5432 dbname=<DB-NOME> user=<DB-USUARIO> sslmode=require" -f sql/01_schema.sql
   ```

5. Confira as tabelas e depois encerre a sessão:

   ```sql
   \dt
   ```

   Devem aparecer `local`, `bloqueio_local`, `evento`, `participante`, `inscricao` e `arquivo`.

Os scripts em `sql/` são versionados e aplicados em ordem numérica. Uma mudança no banco vira um novo arquivo, e nunca uma edição manual no console.

### 4.5 Buckets S3

Crie dois buckets em `us-east-1`.

**`<BUCKET-SITE>`: site estático**

1. Em **Permissions → Block public access**, desmarque o bloqueio.
2. Adicione a bucket policy de leitura pública:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Principal": "*",
       "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::<BUCKET-SITE>/*"
     }]
   }
   ```

3. Em **Properties → Static website hosting**, habilite e informe `index.html` como documento de índice.
4. Anote a URL do site: `http://<BUCKET-SITE>.s3-website-us-east-1.amazonaws.com`.

**`<BUCKET-ARQUIVOS>`: fotos dos eventos**

1. Mantenha o **Block public access ligado**: o bucket é privado.
2. Em **Permissions → CORS**, libere o envio a partir do site:

   ```json
   [{
     "AllowedOrigins": ["http://<BUCKET-SITE>.s3-website-us-east-1.amazonaws.com"],
     "AllowedMethods": ["PUT", "GET"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag"],
     "MaxAgeSeconds": 3000
   }]
   ```

O gatilho de eventos deste bucket é criado no passo 4.8.

### 4.6 Role das Lambdas (IAM)

Em **IAM → Roles → Create role**:

- Entidade confiável: **Lambda**.
- Política gerenciada: `AWSLambdaVPCAccessExecutionRole` (logs no CloudWatch e interfaces de rede na VPC).
- Política em linha para o bucket de arquivos:

  ```json
  {
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::<BUCKET-ARQUIVOS>/*"
    }]
  }
  ```

- Nome: `eventos-lambda-role`.

### 4.7 Lambda da API

1. Empacote o código:

   ```bash
   cd backend/api
   npm ci --omit=dev
   zip -r ../api.zip .
   ```

2. **Lambda → Create function**: nome `eventos-api`, runtime Node.js, role `eventos-lambda-role`.
3. Envie `api.zip` em **Code → Upload from → .zip file** e confirme o *Handler* do código.
4. Em **Configuration → VPC**: VPC `eventos-fci-vpc`, **as duas subnets privadas**, Security Group `eventos-lambda-sg`.
5. Em **Configuration → General configuration**: memória 256 MB e timeout 15 s.
6. Em **Configuration → Environment variables**:

   | Variável | Valor |
   | --- | --- |
   | `DB_HOST` | `<RDS-ENDPOINT>` |
   | `DB_PORT` | `5432` |
   | `DB_NAME` | `<DB-NOME>` |
   | `DB_USER` | `<DB-USUARIO>` |
   | `DB_PASSWORD` | `<DB-SENHA>` |
   | `BUCKET_ARQUIVOS` | `<BUCKET-ARQUIVOS>` |

   Os nomes das variáveis devem ser os mesmos que o código lê (`process.env`). Se forem outros, siga o código e atualize esta tabela.

### 4.8 Lambda processadora e gatilho do S3

1. Empacote como no passo anterior, a partir de `backend/processador/`, gerando `processador.zip`. Se a biblioteca de imagem tiver binários nativos, instale as dependências para Linux x64 (por exemplo, empacotando em uma instância Amazon Linux).
2. **Lambda → Create function**: nome `eventos-processador`, mesma role, VPC, subnets e `eventos-lambda-sg` da Lambda da API.
3. Memória 512 MB, timeout 30 s e as variáveis `DB_*` (as mesmas da API).
4. Em **Add trigger → S3**: bucket `<BUCKET-ARQUIVOS>`, evento **All object create events**, prefixo **`uploads/`**.

> O prefixo `uploads/` é obrigatório. A miniatura é gravada em `thumbs/`; sem o filtro, cada miniatura dispararia a Lambda de novo, em laço infinito.

### 4.9 API Gateway (HTTP API)

1. **API Gateway → Create API → HTTP API → Build**.
2. **Integration**: Lambda, função `eventos-api`, versão de payload 2.0.
3. **Routes**: crie uma única rota, **`ANY /{proxy+}`**, apontando para essa integração. O roteamento das rotas da API é feito dentro da Lambda.
4. **Stages**: mantenha o estágio **`$default`** com *auto-deploy*.
5. Em **CORS**:

   | Campo | Valor |
   | --- | --- |
   | Access-Control-Allow-Origin | `http://<BUCKET-SITE>.s3-website-us-east-1.amazonaws.com` |
   | Access-Control-Allow-Methods | `GET, POST, PUT, PATCH, DELETE, OPTIONS` |
   | Access-Control-Allow-Headers | `content-type` |

6. Copie a **Invoke URL** para `<INVOKE-URL>`. Ela não muda enquanto a API existir, e por isso nenhum IP fica fixo no código (RNF-03).

## 5. Publicando o sistema

1. Em `frontend/config.js`, informe a `<INVOKE-URL>` como base da API (sem barra no final). O arquivo guarda somente essa URL, nunca segredos.
2. Envie o front-end ao bucket do site:

   ```bash
   aws s3 sync frontend/ s3://<BUCKET-SITE>/ --delete
   ```

   Pelo console, o equivalente é **Upload** dos arquivos de `frontend/`.
3. Abra `http://<BUCKET-SITE>.s3-website-us-east-1.amazonaws.com`.

Para publicar uma nova versão do código das Lambdas, gere o `.zip` de novo e envie por **Code → Upload from → .zip file**.

## 6. Verificando que tudo funciona

Use a `<INVOKE-URL>` nos comandos abaixo.

**Saúde da API**

```bash
curl <INVOKE-URL>/saude
```

Esperado: `200`.

**RF-01: CRUD de locais, eventos e inscrições**

```bash
curl -X POST <INVOKE-URL>/locais -H "Content-Type: application/json" \
  -d '{"nome":"Auditório Principal","localizacao":"Prédio 1","tipo":"fisico","capacidade":200}'

curl -X POST <INVOKE-URL>/eventos -H "Content-Type: application/json" \
  -d '{"titulo":"Palestra de Nuvem","tipo":"palestra","modalidade":"presencial","inicio":"2026-11-10T19:00:00","fim":"2026-11-10T21:00:00","local_id":1,"vagas":100}'

curl -X POST <INVOKE-URL>/participantes -H "Content-Type: application/json" \
  -d '{"nome":"Aluno Teste","email":"aluno@teste.com"}'

curl -X POST <INVOKE-URL>/eventos/1/inscricoes -H "Content-Type: application/json" \
  -d '{"participante_id":1}'
```

Para ver as regras de negócio: repetir o mesmo `POST` de inscrição deve devolver `409` (duplicada), e criar outro evento no mesmo local e horário também deve devolver `409` (conflito).

**RF-02: upload por URL pré-assinada**

```bash
# 1. pedir a URL
curl -X POST <INVOKE-URL>/eventos/1/arquivos/upload-url -H "Content-Type: application/json" \
  -d '{"nome":"foto.jpg","tipo_mime":"image/jpeg"}'
# resposta: { "url": "...", "chave_s3": "uploads/..." }

# 2. enviar a foto direto ao S3, usando a url recebida
curl -X PUT "<url-recebida>" -H "Content-Type: image/jpeg" --data-binary @foto.jpg

# 3. registrar o arquivo no banco
curl -X POST <INVOKE-URL>/eventos/1/arquivos -H "Content-Type: application/json" \
  -d '{"chave_s3":"<chave_s3-recebida>","nome_original":"foto.jpg","legenda":"Abertura"}'
```

**RF-03: processamento automático**

1. No console, abra **CloudWatch → Log groups → `/aws/lambda/eventos-processador`** e veja a execução disparada pelo envio.
2. Consulte o arquivo: `GET <INVOKE-URL>/eventos/1/arquivos`. O `status` deve passar de `pendente` para `processado`, com tipo, tamanho, dimensões e a miniatura preenchidos.

**RF-04: relatório**

```bash
curl "<INVOKE-URL>/relatorios/ocupacao"
```

Esperado: uma linha por evento, com vagas, inscritos e taxa de ocupação (eventos sem inscritos aparecem com zero).

**RF-05: front-end**

Abra a URL do site e repita pela interface o cadastro de um local, de um evento e de uma inscrição.

**RNF-01: banco privado**

No console do RDS, confira `Publicly accessible = No`. A partir do seu computador, a conexão ao `<RDS-ENDPOINT>` na porta 5432 deve falhar, e a partir do bastion deve funcionar.

## 7. Executando no Learner Lab

O projeto foi construído em conta pessoal, mas os passos valem para o Learner Lab com estas diferenças:

- **IAM:** não é possível criar roles. Pule o passo 4.6 e use a **`LabRole`** nas duas Lambdas e o **`LabInstanceProfile`** no bastion.
- **Sessão:** a sessão expira e o IP público do bastion muda ao reiniciar. Isso não afeta o sistema, porque nada usa esse IP: o front-end usa a Invoke URL, e o bastion só serve para aplicar o schema.
- **Recriar o ambiente:** se os recursos forem removidos, refaça a seção 4 na ordem. O schema volta com `sql/01_schema.sql`, e o front-end com `aws s3 sync`. A `<INVOKE-URL>` muda se a API for recriada, e então é preciso atualizar o `config.js`, o CORS do bucket de arquivos e republicar o site.
- **Orçamento:** não crie NAT Gateway, use instâncias pequenas e siga a seção 10 ao terminar.

## 8. Segredos e segurança

- **Nenhuma senha ou chave vai para o repositório** (RNF-02). A senha do banco existe somente na variável `DB_PASSWORD` das Lambdas.
- O `.gitignore` deve cobrir `.env`, `node_modules/`, `*.zip` e `*.pem`.
- O RDS não tem acesso público e só aceita conexões vindas de `eventos-lambda-sg` e `eventos-bastion-sg`.
- O SSH do bastion só é liberado para o EC2 Instance Connect, e a porta 22 não fica aberta para a internet.
- O bucket de arquivos é privado: as fotos entram por URL pré-assinada, de curta duração.
- Quem tem acesso à configuração da Lambda enxerga a variável `DB_PASSWORD`. Essa limitação está registrada na ADR-003.

## 9. Problemas comuns

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| A Lambda expira (timeout) ao consultar o banco | `eventos-lambda-sg` ou `eventos-rds-sg` sem a regra 5432, ou Lambda fora das subnets privadas | Revise as regras da seção 4.2 e a configuração de VPC da Lambda |
| A Lambda processadora expira ao ler ou gravar no S3 | VPC Endpoint do S3 ausente ou fora das route tables privadas | Confirme o endpoint e a regra de saída 443 para a prefix list do S3 |
| Erro de CORS no navegador | Origem do site diferente da cadastrada | Confira a URL exata do site no CORS do HTTP API e do bucket de arquivos |
| O envio da foto devolve `403` | URL pré-assinada expirada ou `Content-Type` diferente do informado ao gerá-la | Gere outra URL e use o mesmo tipo |
| A Lambda processadora dispara em loop | Gatilho sem o prefixo `uploads/` | Corrija o prefixo do gatilho no bucket de arquivos |
| `psql` não conecta pelo bastion | `eventos-bastion-sg` ausente na entrada do `eventos-rds-sg` | Adicione a regra 5432 com origem no SG do bastion |
| `502` ou `500` na API | Erro no código da Lambda | Veja o log em `/aws/lambda/eventos-api` no CloudWatch |

## 10. Desligando para não gastar

Quando não estiver em uso:

- **Bastion:** encerre (*Terminate*) a instância. Ela só é necessária para aplicar o schema.
- **RDS:** use **Actions → Stop temporarily**. A AWS religa o banco automaticamente após 7 dias.
- **NAT Gateway:** não existe neste projeto. Se criar algum por engano, apague-o.
- Para remover tudo de vez, apague nesta ordem: API Gateway, Lambdas, buckets (esvazie antes), RDS, bastion, VPC (isso remove subnets, route tables, Internet Gateway e VPC Endpoint) e, por fim, os Security Groups.
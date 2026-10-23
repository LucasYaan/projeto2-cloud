# Diagrama de arquitetura

```mermaid
flowchart TB
    user(["Usuário<br/>(navegador)"])

    subgraph aws["AWS Learner Lab"]
        direction TB
        s3site["S3 - front-end<br/>site estático<br/>(RF-05)"]
        apigw["API Gateway<br/>REST<br/>(RF-04)"]
        s3files["S3 - arquivos<br/>fotos dos eventos<br/>(RF-02)"]

        subgraph vpc["VPC - subnets privadas"]
            direction TB
            lapi["Lambda da API<br/>CRUD, relatório e URL pré-assinada<br/>(RF-01, RF-02, RF-04)"]
            rds[("Amazon RDS<br/>PostgreSQL, sem acesso público<br/>(RF-01, RNF-01)")]
            lproc["Lambda processadora<br/>metadados + miniatura<br/>(RF-03)"]
        end
    end

    user -->|"1. baixa o site"| s3site
    user -->|"2. chama a API<br/>(inclui pedir a URL)"| apigw
    user -->|"3. envia a foto<br/>(URL pré-assinada)"| s3files

    apigw --> lapi
    lapi -->|"SQL (5432)"| rds
    s3files -->|"4. evento ObjectCreated"| lproc
    lproc -->|"5. grava metadados e miniatura"| rds

    classDef compute fill:#EEEDFE,stroke:#534AB7,color:#26215C
    classDef storage fill:#E1F5EE,stroke:#0F6E56,color:#04342C
    class apigw,lapi,lproc compute
    class s3site,s3files,rds storage
```

**Legenda:** roxo = computação e API; verde = armazenamento e dados.

## Fluxos

| # | Fluxo | RF |
| --- | --- | --- |
| 1 | O navegador baixa o site estático do S3 | RF-05 |
| 2 | O navegador chama a API Gateway, que aciona a Lambda da API. Ela consulta o RDS e, quando necessário, gera a URL pré-assinada | RF-01, RF-02, RF-04 |
| 3 | O navegador envia a foto direto ao S3 com a URL pré-assinada | RF-02 |
| 4 | O S3 dispara a Lambda processadora a cada arquivo novo | RF-03 |
| 5 | A Lambda processadora grava metadados e miniatura no RDS | RF-03 |

A Lambda processadora lê a foto e grava a miniatura no S3 por um VPC Endpoint do tipo Gateway.


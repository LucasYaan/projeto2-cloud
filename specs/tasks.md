# Planejamento de tarefas — Projeto 2

## 1. Especificação e planejamento

| ID | Tarefa | Requisito relacionado | Responsável | Status |
|---|---|---|---|---|
| DOC-01 | Definir o domínio do sistema, o problema atendido e o público-alvo (Sistema de Gestão de Eventos e Auditórios da FCI). | — | Lucas Yan e Isadora | Concluído |
| DOC-02 | Documentar as personas e suas necessidades, incluindo Administrador/Gestor, Organizador/Equipe de apoio e Participante. | — | Lucas Yan e Isadora | Concluído |
| DOC-03 | Especificar as histórias de usuário e seus critérios de aceitação para o gerenciamento de locais, eventos, atividades, participantes, inscrições e arquivos. | RF-01, RF-02 | Lucas Yan | Concluído |
| DOC-04 | Relacionar os requisitos funcionais e não funcionais do projeto às funcionalidades e decisões do sistema. | RF-01 a RF-05; RNF-01 a RNF-05 | Lucas Yan | Concluído |
| DOC-05 | Revisar a documentação da especificação para manter consistência entre histórias, regras de negócio e critérios de aceitação. | RF-01 a RF-05 | Todos | Concluído |
| DOC-06 | Manter o registro de uso da IA, incluindo prompts relevantes, resultados gerados e decisões de aceitar, rejeitar ou corrigir sugestões. | Documentação obrigatória | Todos | Pendente |

## 2. Arquitetura e documentação técnica

| ID | Tarefa | Requisito relacionado | Responsável | Status |
|---|---|---|---|---|
| ARQ-01 | Elaborar o diagrama da arquitetura AWS, representando front-end, API Gateway, Lambdas, S3, RDS, VPC e bastion EC2. | RF-01 a RF-05; RNF-01 | Daniel e Lucas Yan | Concluído |
| ARQ-02 | Modelar o banco de dados e documentar as entidades, relacionamentos, atributos e regras de integridade. | RF-01, RF-02, RF-03, RF-04 | Lucas Yan | Concluído |
| ARQ-03 | Documentar os métodos HTTP, rotas, parâmetros, corpos das requisições e respostas da API. | RF-01, RF-02, RF-04 | Daniel e Lucas Yan | Concluído |
| ARQ-04 | Documentar os Security Groups, portas, origens, destinos e regras de comunicação entre os recursos. | RNF-01 | Daniel e Lucas Yan | Concluído |
| ARQ-05 | Registrar a ADR que justifica a execução do CRUD em AWS Lambda, em vez de container em EC2/ECS. | RNF-04 | Daniel e Lucas Yan | Concluído |
| ARQ-06 | Documentar as demais decisões arquiteturais relevantes, incluindo API Gateway, armazenamento de credenciais e restrições do Learner Lab. | RNF-02, RNF-03, RNF-05 | Daniel e Lucas Yan | Concluído |
| ARQ-07 | Revisar o `design.md` para garantir que diagramas, modelo ER, rotas e decisões correspondam à implementação efetivamente implantada. | RF-01 a RF-05; RNF-01 a RNF-05 | Lucas Yan e Daniel | Concluído |

## 3. Banco de dados e funcionalidades da aplicação

| ID | Tarefa | Requisito relacionado | Responsável | Status |
|---|---|---|---|---|
| DEV-01 | Preparar e versionar o script SQL de criação do schema PostgreSQL, incluindo locais, bloqueios, eventos, participantes, inscrições e arquivos. | RF-01, RF-02, RF-03 | Todos | Concluído |
| DEV-02 | Implementar as operações CRUD de locais, incluindo validações de capacidade, situação e bloqueios de disponibilidade. | RF-01 | Todos | Concluído |
| DEV-03 | Implementar as operações CRUD de eventos e atividades, incluindo associação com locais e validação de conflitos de horário e capacidade. | RF-01 | Todos | Concluído |
| DEV-04 | Implementar o cadastro e a consulta de participantes e o gerenciamento de inscrições, incluindo prevenção de duplicidade e controle de vagas. | RF-01 | Lucas Yan | Concluído |
| DEV-05 | Implementar a geração de URLs pré-assinadas para envio de arquivos ao bucket S3 e o registro dos arquivos associados aos eventos. | RF-02 | Todos | Pendente |
| DEV-06 | Implementar a Lambda processadora acionada por novos objetos no S3, para extrair metadados e gerar miniaturas, registrando os resultados no RDS. | RF-03 | Todos | Pendente |
| DEV-07 | Implementar e configurar o front-end web para consumir as rotas da API e permitir a utilização das funcionalidades do sistema. | RF-05 | Todos | Pendente |
| DEV-08 | Testar as regras de negócio, os fluxos principais, os cenários de erro e a integração entre front-end, API, banco e armazenamento. | RF-01 a RF-05 | Todos | Pendente |

## 4. Infraestrutura e implantação na AWS

| ID | Tarefa | Requisito relacionado | Responsável | Status |
|---|---|---|---|---|
| AWS-01 | Criar a VPC `eventos-fci-vpc`, com duas subnets públicas, duas privadas, Internet Gateway e configuração de DNS. | RNF-01, RNF-03, RNF-05 | Daniel | Concluído |
| AWS-02 | Configurar as tabelas de rotas e o VPC Gateway Endpoint para acesso ao S3 pelas subnets privadas, sem utilizar NAT Gateway. | RF-03; RNF-01 | Daniel | Concluído |
| AWS-03 | Criar e configurar os Security Groups | RNF-01 | Daniel | Concluído |
| AWS-04 | Criar a instância PostgreSQL no Amazon RDS, associada às subnets privadas, com acesso público desabilitado e Security Group apropriado. | RF-01; RNF-01 | Daniel | Concluído |
| AWS-05 | Criar a instância bastion EC2 na subnet pública para permitir acesso administrativo ao RDS e aplicação dos scripts SQL. | RNF-01, RNF-03 | Daniel | Concluído |
| AWS-06 | Aplicar o schema PostgreSQL no RDS e verificar a criação das tabelas e relacionamentos. | RF-01 | Daniel | Concluído |
| AWS-07 | Criar o bucket S3 privado para armazenamento das fotos e configurar CORS para permitir os uploads autorizados pelo front-end. | RF-02 | Daniel | Concluído |
| AWS-08 | Criar o bucket S3 destinado à hospedagem estática do front-end e configurar o acesso necessário ao site. | RF-05 | Todos | Pendente |
| AWS-09 | Publicar a Lambda da API na VPC, configurar as variáveis de ambiente do banco e do bucket e validar a conexão com o RDS para as operações demonstradas de locais. | RF-01; RNF-02 | Daniel | Concluído |
| AWS-10 | Publicar a Lambda processadora na VPC e configurar o gatilho do S3 para objetos criados no prefixo `uploads/`. | RF-03 | Todos | Pendente |
| AWS-11 | Criar o HTTP API no API Gateway, integrar com a Lambda da API e configurar a rota proxy; habilitar e validar CORS. | RF-01, RF-02, RF-04 | Daniel | Concluído |
| AWS-12 | Publicar os arquivos do front-end no bucket S3 e configurar a URL de acesso à API no arquivo de configuração do cliente. | RF-05 | Todos | Pendente |
| AWS-13 | Validar o fluxo completo de upload, acionamento da Lambda pelo S3, processamento do arquivo e persistência dos metadados no RDS. | RF-02, RF-03 | Todos | Pendente |
| AWS-14 | Validar a execução do relatório pela API Gateway e Lambda, conferindo os resultados da consulta agregada no RDS. | RF-04 | Todos | Pendente |
| AWS-15 | Verificar os logs de execução das Lambdas no CloudWatch e corrigir eventuais falhas de integração. | RF-03, RF-04 | Todos | Pendente |

## 5. Documentação de implantação e entrega

| ID | Tarefa | Requisito relacionado | Responsável | Status |
|---|---|---|---|---|
| DOC-07 | Documentar no `README.md` os pré-requisitos, a criação manual dos recursos AWS pelo console/CLI e a ordem de implantação. | RNF-05 | Lucas Yan | Concluído |
| DOC-08 | Atualizar o `README.md` com os endpoints, procedimentos de publicação, comandos de teste e evidências de funcionamento da aplicação implantada. | RF-01 a RF-05 | Todos | Pendente |
| DOC-09 | Conferir se todos os artefatos obrigatórios estão versionados e corretamente referenciados no repositório. | Documentação obrigatória | Todos | Pendente |
| DOC-10 | Preparar as evidências da implantação e a demonstração dos fluxos exigidos para a entrega e apresentação do projeto. | RF-01 a RF-05; RNF-01 a RNF-05 | Todos | Pendente |

## 6. Critérios de conclusão

Uma tarefa deve ser marcada como **Concluída** somente após a execução e a verificação do resultado correspondente.

- **RF-01:** CRUD de pelo menos duas entidades relacionadas funcionando com persistência no Amazon RDS.
- **RF-02:** upload de arquivo associado a uma entidade, realizado no S3 por URL pré-assinada gerada pelo backend.
- **RF-03:** evento de criação no S3 acionando a Lambda, com processamento útil e gravação do resultado no RDS.
- **RF-04:** relatório acessível pelo API Gateway, implementado em Lambda e com consulta SQL que utilize JOIN e GROUP BY.
- **RF-05:** front-end publicado e consumindo a API implantada.
- **RNF-01 a RNF-05:** rede privada e Security Groups documentados, credenciais fora do repositório, recuperação em nova sessão, ADR do modelo de execução e criação manual dos recursos AWS documentada.
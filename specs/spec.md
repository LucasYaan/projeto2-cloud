# Especificações do Projeto 2 - Sistema de Gestão de Eventos e Auditórios FCI

## Contexto e Problema
A Faculdade de Computação e Informática (FCI) realiza, ao longo do semestre, uma grande quantidade de eventos acadêmicos e extensionistas, incluindo palestras, seminários, workshops, oficinas, hackathons, cursos e convidados nacionais e internacionais. Entre os principais eventos estão o WTT, realizado em abril, e a Semana de Tecnologia e Inovação (STI), realizada em outubro, que podem envolver cerca de 3.500 alunos da FCI, além de participantes de outras unidades da universidade.  
<br/>Atualmente, parte relevante da organização desses eventos depende de processos operacionais, manuais ou distribuídos em diferentes canais. Informações podem ser divulgadas por canais como WhatsApp e Moodle, enquanto inscrições, controle de presença, certificados, atividades complementares e evidências podem exigir procedimentos separados. Esse cenário aumenta o esforço operacional das equipes responsáveis e dificulta que os alunos tenham uma visão única do que está acontecendo e do que está disponível para participação.  
<br/>Também existem desafios específicos de capacidade e utilização dos espaços. Uma atividade presencial precisa respeitar a capacidade da sala, enquanto atividades digitais podem não possuir limite físico de vagas. Há ainda o risco de duas atividades serem agendadas para o mesmo local e horário.  
<br/>O projeto surge, portanto, como uma oportunidade de automatizar e integrar o ciclo de gestão de eventos da FCI, reduzindo o trabalho operacional e preservando um registro organizado do que ocorreu em cada atividade.

## Público-alvo
Para gestores, organizadores, participantes e equipes de apoio da FCI que precisam planejar, divulgar, organizar e registrar eventos acadêmicos, o Sistema de Gestão de Eventos e Auditórios é uma plataforma de apoio à gestão que centraliza o ciclo dos eventos, desde o cadastro e planejamento de espaços até inscrição, presença, certificação, registro de atividades complementares e armazenamento de evidências.  
<br/>Diferentemente de processos manuais ou ferramentas desconectadas, a solução deverá manter as informações relacionadas em um fluxo integrado, oferecendo aos organizadores uma visão operacional e gerencial dos eventos e aos participantes uma visão clara das atividades disponíveis, suas inscrições, presença e certificados.

## User Stories

### US01 — Reservar e gerenciar local (salas/auditórios)

**Papel ou tipo de usuário:** Administrador/Gestor

**Objetivo:** Como Administrador/Gestor, quero cadastrar, consultar, alterar e desativar locais (salas, auditórios e outros espaços), registrando identificação, capacidade, localização, tipo (físico/digital) e eventuais períodos de indisponibilidade ou bloqueio (ex.: manutenção, reserva externa), para que os eventos possam ser corretamente planejados e associados a espaços realmente disponíveis.

**Benefício ou razão da necessidade:** Para manter uma base confiável de locais e de sua real disponibilidade, evitando informações desatualizadas, incompatíveis ou agendamentos em espaços que, na prática, não estarão disponíveis.

**Critérios de aceitação:**
- **Fluxo principal:** Administrador informa identificação, capacidade, localização e tipo (físico/digital) do local; o sistema salva o cadastro e o disponibiliza para uso no planejamento de eventos. Adicionalmente, o Administrador pode registrar períodos de indisponibilidade ou bloqueio para esse local, informando o período e, opcionalmente, o motivo; o sistema passa a excluir esse período das consultas de disponibilidade.
- **Situações alternativas:** Administrador pode alterar dados de um local já cadastrado (ex.: capacidade, localização), desativá-lo quando não estiver mais disponível para uso, ou remover/editar um bloqueio já registrado caso a indisponibilidade deixe de existir.
- **Erros e impedimentos:**
   - O sistema deve impedir a desativação de um local que possua eventos futuros já agendados sem antes alertar o administrador sobre o conflito.
   - O sistema deve alertar o administrador se já houver um evento agendado no local durante o período que se deseja bloquear, permitindo decidir como proceder antes de confirmar o bloqueio.
- **Ausência de dados:**
   - Se o tipo do local (físico/digital) não for informado, o sistema não deve permitir a conclusão do cadastro, pois essa informação é obrigatória para o controle de vagas e de conflitos de agenda.
   - Motivo do bloqueio é opcional; o sistema deve permitir o registro apenas com local e período.
- **Regras de negócio:**
   - A capacidade do local deve ser obrigatoriamente registrada para locais físicos, pois será usada no controle de vagas.
   - Locais desativados não podem ser selecionados em novos agendamentos.
   - Um bloqueio ativo torna o local indisponível para novos agendamentos no período correspondente.
   - Bloqueios não removem automaticamente eventos já agendados; a resolução do conflito depende de ação administrativa.
- **Diferenças de permissão:** Somente o perfil Administrador/Gestor pode cadastrar, alterar, desativar ou bloquear locais.

---

### US02 — Cadastrar evento e atividades vinculadas

**Papel ou tipo de usuário:** Administrador/Gestor

**Objetivo:** Como Administrador/Gestor, quero criar e registrar a realização de eventos, definindo informações como título, descrição, data, horários, modalidade (presencial, digital ou híbrida), local ou link e a quantidade de vagas. Também quero organizar um evento principal que possa conter várias atividades ou sessões vinculadas, classificando-as (ex.: palestra, workshop, oficina).

**Benefício ou razão da necessidade:** Para centralizar o registro dos eventos promovidos pela FCI, reduzir o trabalho operacional e oferecer aos organizadores uma visão gerencial e integrada do ciclo de eventos.

**Critérios de aceitação:**
- **Fluxo principal:** O Administrador/Gestor seleciona o local físico ou digital, consulta a disponibilidade, e cria o evento ou atividade informando os dados obrigatórios, garantindo que não haja conflitos.
- **Situações alternativas:** O sistema deve permitir registrar convidados e informações relevantes específicas de cada atividade.
- **Modalidade híbrida:** Para eventos híbridos, o sistema deve exigir tanto o local físico quanto o link/plataforma de acesso.
- **Estado inicial:** Ao ser criado com sucesso, o evento/atividade deve iniciar no estado "aberto".
- **Erros e impedimentos:**
   - O sistema deve informar claramente quando não houver local compatível disponível para a data e capacidade exigidas.
   - O sistema deve impedir a criação/gravação do evento e exibir mensagem de erro quando houver sobreposição de horário no mesmo local.
- **Ausência de dados:** Se a atividade for digital e não houver limitação de plataforma ou da própria atividade, o sistema deve permitir configuração sem limite físico de vagas.
- **Regras de negócio:**
   - Um local físico não pode receber dois eventos/atividades com horários sobrepostos.
   - A capacidade do local físico deve ser obrigatoriamente considerada no planejamento e no controle de vagas de eventos presenciais.
   - Atividades vinculadas a um evento principal devem manter sua própria data, horário, capacidade e situação quando essas informações forem específicas daquela sessão.
   - Qualquer alteração administrativa que afete vagas, local ou horário deve ser validada novamente contra as regras de conflito de agenda e capacidade do local.
- **Diferenças de permissão entre usuários:** As operações administrativas de criar e alterar eventos devem ser estritamente restritas a usuários autorizados.

---

### US03 — Gerenciar evento ou atividade

**Papel ou tipo de usuário:** Administrador/Gestor ou Organizador/Equipe de apoio

**Objetivo:** Como Administrador/Gestor ou Organizador/Equipe de apoio, quero consultar, alterar e encerrar eventos ou atividades já cadastrados, para manter as informações atualizadas ao longo do ciclo de vida do evento.

**Benefício ou razão da necessidade:** Para refletir mudanças reais (data, horário, local, vagas, situação) sem precisar recriar o evento, mantendo a integridade do planejamento.

**Critérios de aceitação:**
- **Fluxo principal:** Administrador ou Organizador seleciona um evento/atividade existente, altera os campos necessários (ex.: data, horário, vagas, local) e salva; o sistema revalida as regras de conflito e capacidade antes de confirmar a alteração.
- **Situações alternativas:** Administrador ou Organizador pode alterar apenas a situação do evento (ex.: de "aberto" para "encerrado" ou "realizado"), sem alterar demais dados.
- **Erros e impedimentos:** O sistema deve impedir e sinalizar alterações que gerem sobreposição de horário no local ou excedam a capacidade já com inscrições confirmadas.
- **Ausência de dados:** Se o usuário tentar remover um dado obrigatório (ex.: apagar a data sem substituí-la), o sistema deve impedir a gravação até que o campo seja preenchido novamente.
- **Regras de negócio:**
   - Qualquer alteração que afete vagas, local ou horário deve ser revalidada contra as regras de conflito de agenda e capacidade do local.
   - O evento deve refletir os estados previstos: aberto, lotado, encerrado, realizado ou cancelado.
- **Diferenças de permissão:** Administrador/Gestor e Organizador/Equipe de apoio podem alterar dados de eventos/atividades já cadastrados, conforme as permissões atribuídas ao Organizador para cada evento — recomenda-se avaliar, ao detalhar as telas, se o Organizador terá acesso irrestrito ou limitado a determinados campos.

---

### US04 — Cancelar evento/atividade

**Papel ou tipo de usuário:** Administrador/Gestor ou Organizador/Equipe de apoio

**Objetivo:** Como Administrador/Gestor ou Organizador/Equipe de apoio, quero cancelar um evento ou atividade já cadastrada, para comunicar aos participantes e liberar o local associado quando o evento não for mais realizado.

**Benefício ou razão da necessidade:** Para manter o sistema confiável e evitar que participantes contem com um evento que não vai ocorrer, além de liberar o espaço para outros usos.

**Critérios de aceitação:**
- **Fluxo principal:** Administrador ou Organizador seleciona o evento/atividade e confirma o cancelamento; o sistema altera a situação para "cancelado", libera o local no período correspondente e atualiza a situação das inscrições vinculadas.
- **Situações alternativas:** Cancelamento pode ser aplicado a uma atividade específica vinculada a um evento principal, sem cancelar o evento inteiro.
- **Erros e impedimentos:** O sistema deve impedir o cancelamento de um evento já marcado como "realizado".
- **Ausência de dados:** Não há informação obrigatória adicional além da confirmação; motivo pode ser opcional.
- **Regras de negócio:**
   - Um evento cancelado deve liberar o local associado no período correspondente.
   - Participantes inscritos devem ter sua situação de inscrição atualizada (ex.: para "cancelado") quando o evento/atividade for cancelado.
- **Diferenças de permissão:** Administrador/Gestor e Organizador/Equipe de apoio podem cancelar eventos ou atividades, conforme as permissões atribuídas ao Organizador para cada evento — mesma ressalva de escopo da US05.

---

### US05 — Consultar catálogo de eventos/atividades disponíveis

**Papel ou tipo de usuário:** Participante

**Objetivo:** Como Participante, quero consultar o catálogo de eventos e atividades disponíveis, com data, horário, modalidade, local e situação das vagas, para decidir em quais participar.

**Benefício ou razão da necessidade:** Para ter uma visão única e centralizada do que está disponível, sem depender de canais dispersos como WhatsApp ou Moodle.

**Critérios de aceitação:**
- **Fluxo principal:** Participante acessa o catálogo; o sistema exibe os eventos/atividades disponíveis com data, horário, modalidade, local e situação das vagas.
- **Situações alternativas:** Participante pode visualizar eventos futuros e suas respectivas sessões/atividades vinculadas diretamente na listagem.
- **Erros e impedimentos:** O sistema deve informar claramente quando não houver eventos/atividades disponíveis no momento da consulta.
- **Ausência de dados:** Quando informações de localização não se aplicarem (ex.: atividade digital), o sistema deve omitir esse campo ou exibir o link/plataforma no lugar.
- **Regras de negócio:**
   - Eventos cancelados ou encerrados não devem aparecer como "disponíveis" no catálogo (podem aparecer no histórico, US27).
- **Diferenças de permissão:** Catálogo visível a todos os perfis autenticados; participantes têm acesso de consulta, sem opções administrativas.

---

### US06 — Visualizar detalhes de um evento e suas atividades

**Papel ou tipo de usuário:** Participante

**Objetivo:** Como Participante, quero visualizar os detalhes de um evento e das atividades vinculadas a ele, para entender o que será oferecido antes de me inscrever.

**Benefício ou razão da necessidade:** Para tomar uma decisão informada sobre participação, evitando inscrições em atividades que não atendam à minha expectativa.

**Critérios de aceitação:**
- **Fluxo principal:** Participante seleciona um evento no catálogo; o sistema exibe detalhes (descrição, data, horário, modalidade, local/link, vagas, classificação) e a lista de atividades/sessões vinculadas.
- **Situações alternativas:** Quando aplicável, o sistema exibe informações de localização (prédio, sala, mapa) junto aos detalhes.
- **Erros e impedimentos:** O sistema deve informar claramente caso o evento consultado tenha sido cancelado ou encerrado, evitando que o participante tente se inscrever em algo indisponível.
- **Ausência de dados:** Se um campo opcional (ex.: descrição detalhada) não estiver preenchido, o sistema deve exibir os detalhes disponíveis sem gerar erro.
- **Regras de negócio:**
   - Atividades vinculadas devem exibir sua própria data, horário, capacidade e situação quando forem específicas da sessão.
- **Diferenças de permissão:** Disponível a todos os perfis com acesso ao catálogo.

---

### US07 — Inscrever-se em atividade/evento

**Papel ou tipo de usuário:** Participante

**Objetivo:** Como Participante, quero me inscrever em uma atividade ou evento aberto, para garantir minha participação e acompanhar minha inscrição na área pessoal.

**Benefício ou razão da necessidade:** Para assegurar minha vaga e ter uma confirmação clara da minha participação.

**Critérios de aceitação:**
- **Fluxo principal:** Participante seleciona uma atividade aberta e confirma a inscrição; o sistema valida a disponibilidade de vaga e confirma a inscrição, atualizando a área pessoal do participante.
- **Situações alternativas:** Para atividades digitais sem limite físico de vagas, o sistema permite a inscrição conforme a regra definida para aquela atividade.
- **Erros e impedimentos:**
   - O sistema deve impedir inscrições duplicadas do mesmo participante na mesma atividade.
   - O sistema deve impedir novas inscrições quando a atividade estiver encerrada, fechada ou realizada.
- **Ausência de dados:** Quando não houver vaga disponível, o sistema não deve confirmar a inscrição diretamente, direcionando o participante para a fila de espera (US11), se habilitada.
- **Regras de negócio:**
   - O número de inscrições confirmadas não deve ultrapassar a quantidade de vagas definida.
   - Um participante não pode possuir mais de uma inscrição ativa na mesma atividade.
- **Diferenças de permissão:** Disponível ao perfil Participante.

---

### US08 — Consultar inscrição/participação em atividades/eventos

**Papel ou tipo de usuário:** Participante

**Objetivo:** Como Participante, quero consultar minhas inscrições e reservas em uma área pessoal, para acompanhar minha situação (confirmado, em espera, cancelado, concluído) em cada atividade.

**Benefício ou razão da necessidade:** Para ter uma visão organizada da minha participação, sem precisar recorrer a canais externos.

**Critérios de aceitação:**
- **Fluxo principal:** Participante acessa sua área pessoal; o sistema exibe a lista de inscrições/reservas com a situação atual de cada uma (confirmado, em espera, cancelado, concluído).
- **Situações alternativas:** Participante pode consultar informações necessárias para participação (ex.: link de acesso, local) diretamente a partir da inscrição confirmada.
- **Erros e impedimentos:** O sistema deve informar claramente quando o participante não possuir nenhuma inscrição registrada.
- **Ausência de dados:** Não aplicável.
- **Regras de negócio:**
   - A área pessoal deve refletir os estados definidos em F08 (confirmado, em espera, cancelado, concluído).
- **Diferenças de permissão:** Cada participante só pode consultar suas próprias inscrições.

---

### US09 — Cancelar inscrição em evento

**Papel ou tipo de usuário:** Participante

**Objetivo:** Como Participante, quero cancelar minha inscrição em uma atividade quando isso for permitido, para liberar minha vaga caso eu não possa mais participar.

**Benefício ou razão da necessidade:** Para permitir que outra pessoa da fila de espera ocupe a vaga liberada e manter minha área pessoal atualizada.

**Critérios de aceitação:**
- **Fluxo principal:** Participante seleciona uma inscrição confirmada e solicita o cancelamento; o sistema atualiza a situação da inscrição para "cancelado" e libera a vaga.
- **Situações alternativas:** Quando houver fila de espera, a vaga liberada deve ser oferecida automaticamente ao próximo participante elegível.
- **Erros e impedimentos:** O sistema deve impedir o cancelamento quando essa opção não estiver habilitada pelo organizador para a atividade em questão.
- **Ausência de dados:** Motivo do cancelamento pode ser opcional.
- **Regras de negócio:**
   - Cancelamento só é permitido quando definido pelo organizador para a atividade (F06).
- **Diferenças de permissão:** Participante só pode cancelar a própria inscrição.

---

### US10 — Registrar fotos do evento

**Papel ou tipo de usuário:** Organizador/Equipe de apoio

**Objetivo:** Como Organizador/Equipe de apoio, quero anexar e armazenar fotografias do evento (palestras, palestrantes e/ou participantes), associando-as ao evento ou atividade correspondente, para apoiar relatórios institucionais e de gestão.

**Benefício ou razão da necessidade:** Para preservar um registro visual organizado dos eventos, facilitando sua recuperação posterior.

**Critérios de aceitação:**
- **Fluxo principal:** Organizador seleciona o evento/atividade e anexa uma ou mais fotografias; o sistema armazena as evidências associadas a esse evento/atividade.
- **Situações alternativas:** Fotografias podem ser adicionadas em momentos diferentes (durante ou após o evento), desde que associadas corretamente.
- **Erros e impedimentos:** O sistema deve impedir o upload de arquivos fora dos formatos suportados ou que não correspondam a uma imagem válida.
- **Ausência de dados:** Não aplicável — a associação ao evento é obrigatória, mas descrição/legenda da foto pode ser opcional.
- **Regras de negócio:**
   - Evidências devem permanecer associadas ao evento/atividade correspondente.
   - O registro de fotografias deve respeitar as regras institucionais aplicáveis (ex.: uso de imagem).
- **Diferenças de permissão:** Restrito a Administrador/Gestor e Organizador/Equipe de apoio.

--- 

## Aplicação dos Requisitos Funcionais

### RF-01 — CRUD completo de pelo menos 2 entidades relacionadas no Amazon RDS

**User Stories**: US01, US02, US03, US04, US05, US06, US07, US08, US09

O domínio tem duas relações:
- **Local → Evento (1:N)**: um local recebe vários eventos ao longo do tempo, e cada evento acontece em um local.
- **Evento ↔ Participante (N:N), pela entidade Inscrição:** um participante se inscreve em vários eventos e um evento tem vários inscritos.

Operações de cada entidade:
| Entidade | Criar | Consultar | Alterar | Remover |
| --- | --- | --- | --- | --- |
| Local | US01 | US01 | US01 | US01 |
| Evento/Atividade | US02 | US03, US05, US06 | US03 | US04 |
| Inscrição | US07 | US08 | — | US09 |

Os dados ficam em um banco relacional Supabase (PostgreSQL) no Amazon RDS.

### RF-02 — Upload de arquivo ligado a uma entidade, armazenado no S3 via URL pré-assinada

**User Stories**: US10

O Organizador anexa fotos a um evento/atividade. O front-end pede ao backend uma URL pré-assinada para aquele evento; o backend a gera e o navegador envia a imagem direto ao S3, sem passar pelo servidor. Em seguida, o backend registra o arquivo (chave no S3, legenda opcional, evento relacionado) no RDS, mantendo a evidência ligada ao evento (RN14). O backend rejeita formatos que não sejam imagem válida (ex.: JPEG e PNG).

### RF-03 — Arquivo novo no S3 dispara uma Lambda que grava o resultado no RDS

**User Stories**: US10

Quando uma foto chega ao bucket, o evento de criação de objeto do S3 dispara uma função Lambda que extrai os metadados da imagem (tipo, tamanho, dimensões), gera uma miniatura e grava o resultado no RDS, vinculado ao registro do arquivo. A miniatura agiliza a exibição das evidências na tela "Evidências dos eventos". Se o processamento falhar, a imagem original continua disponível e o erro é registrado em log. Como o RDS fica em subnet privada, a Lambda é configurada dentro da VPC.

### RF-04 — Relatório exposto pelo API Gateway e implementado em Lambda, com JOIN/GROUP BY

**User Stories**: nenhuma história de usuário própria nesta entrega (requisito técnico descrito aqui)

O painel gerencial consome GET /relatorios/ocupacao, exposto no API Gateway e implementado em Lambda. A consulta usa JOIN entre local, evento e inscrição e GROUP BY por local e evento, retornando vagas, inscritos confirmados e taxa de ocupação, com filtro opcional por período. Eventos sem inscrições aparecem com total zero, nunca omitidos.

### RF-05 — Front-end web publicado consumindo a API

**User Stories**: US01 a US10

O protótipo em HTML/CSS/JS do sistema (telas de catálogo, evento/atividade, "Minha área", administração de locais e eventos, evidências e painel gerencial) é publicado como site estático no S3 (static website hosting). O front-end consome a API por um endereço configurável (config.js), sem URL fixa no código.

### RF-05 — Front-end web publicado consumindo a API

**User Stories:** US01 a US10

O protótipo em HTML/CSS/JS do sistema (telas de catálogo, evento/atividade, "Minha área", administração de locais e eventos, evidências e painel gerencial) é publicado como site estático no S3 (static website hosting). O front-end consome a API por um endereço configurável (config.js), sem URL fixa no código.
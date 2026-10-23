## Entrega 2
- "adapte a imagem da arquitetura em um diagrama para adicionar à um arquivo md"

"Vou fazer em Mermaid, que o GitHub renderiza direto dentro do .md, e validar a sintaxe antes de enviar.

Lucas, adaptei o diagrama para um bloco Mermaid dentro de arquitetura.md, sem imagem. É só colar o bloco no design.md, ou usar o arquivo como está.

Onde renderiza. GitHub, GitLab, VS Code (com a extensão Markdown Preview Mermaid Support) e Obsidian mostram o desenho direto. Em visualizadores que não suportam Mermaid, aparece só o código. Se o professor for abrir o repositório no GitHub, não há problema.
O que mudou em relação à imagem. O conteúdo é o mesmo: os três fluxos numerados, os RF em cada componente, a VPC com o RDS e as duas Lambdas, e as cores por categoria. Como o Mermaid não tem legenda, ela virou uma linha de texto abaixo do bloco, junto com a tabela dos fluxos.
Vantagem. Mudou a arquitetura (por exemplo, trocar Lambda por EC2 na ADR)? Você edita o texto, sem regerar imagem."

- Organize um MER com as seis entidades: local, bloqueio_local, evento, participante, inscricao e arquivo. Para cada entidade, registre seus atributos, tipos de dados, chaves primárias (PK), chaves estrangeiras (FK), campos obrigatórios, valores permitidos, valores padrão, restrições de unicidade e observações relevantes, quando aplicáveis. Na coluna de relacionamentos, informe as entidades relacionadas, a cardinalidade e o significado da relação. Me dê o modelo em um código PlantUML.

- Organize as rotas da API em uma tabela com as seguintes colunas: Recurso, Método HTTP, Rota, Corpo ou parâmetros, Resposta de sucesso e Erros possíveis. Inclua todas as rotas dos seguintes grupos: - Locais e bloqueios; - Eventos e atividades; - Participantes e inscrições; - Arquivos; - Relatórios. Para cada rota, registre o método HTTP, o caminho completo, os campos do corpo da requisição ou parâmetros de consulta, o código HTTP de sucesso e os erros possíveis com suas respectivas condições, quando especificadas. Preserve os nomes dos campos, caminhos, códigos HTTP e regras de negócio exatamente como definidos na especificação.





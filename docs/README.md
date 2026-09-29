# Documentação do Control Finance

Documentação revisada em 28/09/2026 para a versão declarada `1.0.1`. Versões de dependências e comandos são definidos nos manifestos e lockfiles de cada projeto.

| Documento | Conteúdo |
| --- | --- |
| [Apresentação e instalação](../README.md) | Recursos, imagens, instalação local e scripts |
| [Documentação técnica](../README_TECNICO.md) | Arquitetura, dados, autenticação e organização do código |
| [Backend](../backend/README.md) | Configuração da API e variáveis de ambiente |
| [Frontend](../frontend/README.md) | Configuração da interface, build e PWA |
| [Escopo funcional](ESCOPO_PROFISSIONAL.md) | Recursos implementados e limites da validação |
| [API REST](API.md) | Rotas, formatos, filtros, uploads e erros conhecidos |
| [Operação](OPERACAO.md) | Docker, administrador inicial, health checks, backup, restauração e CI |
| [Testes](TESTES.md) | Preparação do ambiente e reprodução das verificações |
| [QA de 28/09/2026](QA_2026-09-28.md) | Cobertura executada, quatro defeitos e pendências |
| [Resultados estruturados](QA_API_RESULTS.json) | Evidência da última rodada adicional de API |

## Situação da qualidade

Os 73 testes existentes passaram. O QA adicional apresentou 19 cenários aprovados e quatro falhas em 23 cenários. Builds e verificações estáticas de PWA/acessibilidade passaram. QA visual, mobile e interativo permanece pendente; detalhes no relatório. Esses resultados descrevem uma execução local, não a execução atual do GitHub Actions.

Ao alterar um recurso, atualize seu contrato em `API.md`, seu escopo e os comandos afetados. Relatórios datados preservam o histórico: publique uma nova rodada para comprovar correções, sem apagar as evidências anteriores.

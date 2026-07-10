# [ADR-0006]: Adoção do PostgreSQL como Banco de Dados Relacional

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-05-30
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O MissionApp Backend opera sobre um modelo de dados com alto grau de relacionamento e requisitos de integridade críticos. As entidades centrais — usuários (missionários, apoiadores, administradores), posts, projetos de impacto, campanhas, doações, auditorias, seguidores, likes e comentários aninhados — formam uma rede de relacionamentos que inclui vínculos polimórficos e tabelas de junção N:M.

Além da complexidade relacional, o domínio financeiro impõe restrições severas:

- **Integridade transacional:** Operações de doação envolvem múltiplas escritas coordenadas — registro da doação, atualização do saldo da campanha, geração de auditoria. Qualquer falha parcial deve ser completamente revertida. Inconsistência financeira não é tolerável.

- **Conformidade com LGPD:** O sistema armazena dados classificados como sensíveis pela Lei Geral de Proteção de Dados — afiliação religiosa e dados bancários de missionários. Esses campos precisam de suporte a criptografia em nível de banco e controles de acesso robustos.

- **Auditoria de ações sensíveis:** O requisito NF.2 exige registro estruturado de ações em tabelas dedicadas (`authentication_audits`, `user_action_audits`). A integridade desses registros depende das mesmas garantias transacionais do restante do sistema.

A questão central é: **qual banco de dados oferece o modelo relacional, as garantias ACID e a maturidade de ecossistema necessários para sustentar o modelo de dados e os requisitos de conformidade do MissionApp?**

## Decisão

Adotaremos o **PostgreSQL** (versão 18.x, imagem Alpine) como único banco de dados relacional do MissionApp Backend.

O PostgreSQL é um sistema de gerenciamento de banco de dados objeto-relacional de código aberto, desenvolvido e mantido pelo PostgreSQL Global Development Group desde 1996. Reconhecido como o banco de dados relacional open-source mais avançado disponível, combina décadas de desenvolvimento focado em confiabilidade e correção com conformidade completa com o padrão SQL, suporte robusto a transações ACID via MVCC, tipos nativos avançados (`JSONB`, `UUID`, arrays, ranges), extensibilidade via extensões e índices avançados (B-tree, GIN, GiST, BRIN).

Toda a persistência de dados passará pelo PostgreSQL via Lucid ORM, conforme definido no [ADR-0001](./0001-adocao-do-adonisjs-como-framework-backend.md). O banco será provisionado via Docker Compose em ambiente de desenvolvimento e gerenciado por migrations versionadas em `database/migrations/`.

As seguintes capacidades nativas do PostgreSQL serão utilizadas:

- **Transações ACID** para operações financeiras e auditorias
- **Foreign keys com CASCADE** para garantir integridade referencial entre entidades
- **`CHECK constraints`** para validação de invariantes de domínio diretamente no banco

## Justificativa

O PostgreSQL foi escolhido por ser o banco relacional que melhor atende ao conjunto de requisitos técnicos e operacionais do MissionApp:

- **ACID com isolamento de transação confiável:** O PostgreSQL implementa MVCC (Multi-Version Concurrency Control), permitindo transações concorrentes sem bloqueio excessivo. Para fluxos financeiros — onde uma doação envolve escritas em múltiplas tabelas — a garantia de atomicidade não é opcional. O PostgreSQL oferece o nível de isolamento `READ COMMITTED` por padrão, com suporte a `SERIALIZABLE` quando necessário.

- **Modelo relacional completo com integridade referencial nativa:** O modelo de dados do MissionApp é intrinsecamente relacional: doações referenciam campanhas, campanhas referenciam projetos, projetos referenciam missionários. O PostgreSQL oferece chaves estrangeiras com `ON DELETE CASCADE/RESTRICT`, `CHECK constraints` aplicadas de forma confiável e suporte a junções complexas — garantindo que as invariantes do domínio sejam aplicadas no banco, não apenas na aplicação.

- **Suporte a JSONB para configurações flexíveis:** Campos como configurações de pagamento por missionário (`financial_config`) variam estruturalmente entre tipos de gateway. O PostgreSQL JSONB armazena, indexa e consulta dados semi-estruturados eficientemente, sem necessidade de tabelas EAV ou schemas paralelos.

- **Integração primeiro nível com Lucid ORM:** O Lucid ORM do AdonisJS tem suporte nativo e testado para PostgreSQL, incluindo tipos `DateTime` com timezone, transações com `trx`, relacionamentos N:M e hooks de ciclo de vida. Usar outro banco introduziria adaptadores não oficiais ou comportamentos não documentados no Lucid.

- **Conhecimento amplamente distribuído:** PostgreSQL é o banco relacional open-source mais adotado na indústria. A probabilidade de que novos colaboradores já tenham experiência com ele é alta, reduzindo a curva de onboarding técnico.

## Alternativas Consideradas

- **MySQL / MariaDB:** Banco relacional maduro, amplamente adotado e com bom suporte no Lucid. Descartado porque: (1) o suporte a `CHECK constraints` só é confiável a partir do MySQL 8 — versões anteriores as ignoram silenciosamente, o que é um risco em ambientes onde a versão não é controlada; (2) o suporte a JSONB indexável é inferior; (3) o PostgreSQL é tecnicamente superior na maioria das dimensões relevantes para este projeto sem custo adicional.

- **MongoDB:** Banco de documentos com schema flexível, amplamente usado em stacks Node.js. Descartado porque: (1) o modelo de dados do MissionApp é altamente relacional — tentar representar follows, likes, campanhas vinculadas a projetos e auditorias em documentos resultaria em desnormalização excessiva ou referências manuais sem integridade garantida; (2) transações multi-documento no MongoDB existem desde a v4.0, mas introduzem latência adicional e são estruturalmente mais complexas que transações relacionais; (3) dados financeiros em banco não-relacional é padrão de alto risco para um domínio que exige rastreabilidade e auditoria.

- **SQLite:** Banco embarcado, zero-configuração, excelente para testes e desenvolvimento local. Descartado porque: (1) não suporta escritas concorrentes de múltiplos processos — inviável para uma API com múltiplos workers; (2) não possui tipos avançados como `JSONB` ou suporte robusto a `CHECK constraints`; (3) não é adequado para produção em APIs com tráfego real. Pode ser considerado exclusivamente para ambiente de testes isolados, mas não como banco principal.

- **CockroachDB:** Banco distribuído compatível com o protocolo PostgreSQL, projetado para alta disponibilidade e escalabilidade horizontal. Descartado porque: (1) adiciona complexidade operacional significativa sem justificativa para o volume atual do MissionApp; (2) a compatibilidade com PostgreSQL é parcial — alguns comportamentos do Lucid podem não funcionar corretamente; (3) a escala distribuída é uma solução para um problema que o MissionApp não tem neste momento.

- **Supabase:** O questionamento é recorrente — Supabase usa PostgreSQL por baixo, então "por que não usar diretamente?". O ponto crítico é que **Supabase não é um banco de dados — é um BaaS completo** (auth próprio via GoTrue/PostgREST, API REST autogerada, Realtime via websockets, Storage, Edge Functions). Usar Supabase como banco de dados seria carregar uma plataforma inteira para usar apenas uma fração dela, ignorando todas as outras features pelas quais haveria dependência ou custo. Além disso, a manutenção do projeto adota minimização de acoplamento a provedor como diretriz explícita. Supabase introduziria dependência em uma plataforma comercial que, ao contrário do PostgreSQL (padrão aberto com décadas de estabilidade), pode alterar seus termos, APIs ou modelo de negócio independentemente do MissionApp.

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Integridade financeira garantida:** Transações ACID asseguram que operações de doação, atualização de campanhas e geração de auditoria são atômicas — sem estados intermediários inconsistentes mesmo em caso de falha.

- **Integridade referencial no banco, não só na aplicação:** Foreign keys com `CASCADE` garantem que deleções de entidades pai propagam corretamente para filhos, independentemente de qual camada faz a deleção — removendo uma classe inteira de bugs de inconsistência.

- **Ecossistema familiar:** Alta probabilidade de que contribuidores já conheçam PostgreSQL, reduzindo a barreira de entrada para contribuições que envolvam migrations ou otimizações de query.

### Negativas / Riscos

- **Requer Docker para desenvolvimento local:** Diferente do SQLite, o PostgreSQL exige um processo de banco em execução. O Docker Compose mitiga isso, mas adiciona um pré-requisito de setup para novos contribuidores.

- **Migrations são stateful e exigem disciplina:** Migrações PostgreSQL com `ALTER TABLE`, remoção de colunas ou mudança de tipos em tabelas com dados existentes requerem cuidado para não gerar downtime ou perda de dados. Rollbacks precisam ser planejados explicitamente.

- **Limites de conexão em infraestrutura menor:** PostgreSQL tem limite de conexões simultâneas configurável, mas finito. Em produção, um connection pooler (ex: PgBouncer) pode ser necessário dependendo do perfil de tráfego — o que adiciona uma peça de infraestrutura não prevista no setup inicial.

- **Complexidade de backup e recuperação:** Backups do PostgreSQL exigem estratégia adequada (`pg_dump`, WAL archiving). Em produção, isso demanda atenção operacional que um banco gerenciado (RDS, Supabase) simplificaria — mas introduziria custo e acoplamento a provedor.

## Referências

- [Documentação oficial do PostgreSQL 18](https://www.postgresql.org/docs/18/): referência principal do banco de dados adotado
- [Lucid ORM](https://lucid.adonisjs.com/docs/introduction): configuração e uso com PostgreSQL
- [ADR-0001](./0001-adocao-do-adonisjs-como-framework-backend.md): adoção do AdonisJS, que guia a escolha do ORM e do banco

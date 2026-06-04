# [ADR-0004]: Uso do MinIO como Emulador de Storage em Ambiente de Desenvolvimento

## Dados
* **Status:** Proposto
* **Data:** 2026-05-30
* **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O MissionApp requer armazenamento de arquivos binários em múltiplos fluxos: foto de perfil de missionários e apoiadores (Req. 2.3), imagens anexadas a posts (Req. 6.1), imagem de capa de projetos de impacto (Req. 7.2) e QR codes estáticos de Pix (Req. 9.1.2). A estratégia de armazenamento em produção adota AWS S3, com estrutura de buckets padronizada conforme o [ADR-0009](./0009-padronizacao-de-nomenclatura-de-buckets.md).

O problema surge no ambiente de desenvolvimento: utilizar o AWS S3 real como alvo de upload durante o desenvolvimento local impõe restrições significativas:

- **Custo por operação:** Cada upload, download e listagem de objetos em S3 gera cobrança. Em um projeto open-source com múltiplos contribuidores executando a aplicação localmente e em pipelines de CI/CD, esse custo se acumula de forma não controlável.

- **Dependência de credenciais AWS por colaborador:** Cada desenvolvedor precisaria de uma conta AWS, de um usuário IAM configurado com as permissões corretas e de credenciais gerenciadas localmente. Isso cria um obstáculo de onboarding, um risco de vazamento de credenciais e uma superfície de administração desproporcional para um projeto open-source.

- **Dependência de conectividade com a internet:** O desenvolvimento de funcionalidades de upload ficaria inviabilizado em ambientes sem internet (viagens, conferências, quedas de ISP), e o tempo de resposta das operações de storage seria sujeito à latência da rede pública.

- **Incapacidade de validar a estrutura de buckets localmente:** A convenção de nomenclatura definida no [ADR-0009](./0009-padronizacao-de-nomenclatura-de-buckets.md) (`missionapp-{ambiente}-{visibilidade}-{proposito}`) não pode ser verificada contra o ambiente `dev` em S3 real sem criar e pagar por buckets reais.

O `@adonisjs/drive` — adotado no [ADR-0001](./0001-adocao-do-adonisjs-como-framework-backend.md) — abstrai o provedor de storage via configuração, permitindo apontar para S3 em produção e para outro provedor compatível em desenvolvimento, sem alteração de código. A questão é: **qual serviço de storage local oferece compatibilidade suficiente com a API S3 para que o mesmo código de aplicação funcione em dev e em produção, sem custo e sem dependência de infraestrutura AWS?**

## Decisão

Adotaremos o **MinIO** como serviço de storage em ambiente de desenvolvimento, provisionado via Docker Compose na mesma rede do PostgreSQL e do DragonflyDB.

O MinIO é um servidor de armazenamento de objetos de código aberto e alto desempenho, compatível com a API S3 da Amazon Web Services. Projetado para ser executado on-premises ou em containers, permite replicar localmente o comportamento de um bucket S3 de produção com fidelidade total — mesmas operações (`PutObject`, `GetObject`, `DeleteObject`, presigned URLs) e mesma interface de políticas de acesso — sem depender de conectividade com a AWS durante o desenvolvimento.

O MinIO implementa a API S3 da AWS integralmente, o que significa que o `@adonisjs/drive` com driver S3 aponta para `http://localhost:9000` em desenvolvimento e para `https://s3.amazonaws.com` em produção — sem nenhuma alteração de código entre os ambientes. A estrutura de buckets definida no [ADR-0009](./0009-padronizacao-de-nomenclatura-de-buckets.md) será replicada localmente no MinIO durante o setup inicial via script de seed de buckets.

O MinIO Console (interface web) estará disponível em `http://localhost:9001` para inspeção visual de buckets e objetos durante o desenvolvimento.

## Justificativa

O MinIO foi escolhido por ser a solução que melhor atende ao conjunto de restrições do ambiente de desenvolvimento do MissionApp:

- **Compatibilidade integral com a API S3:** O MinIO implementa o protocolo S3 da AWS — mesmos endpoints, mesma autenticação por Access Key/Secret Key, mesmos padrões de URL de objeto e presigned URLs. O `@adonisjs/drive` configurado com driver S3 aponta para o MinIO sem qualquer adaptação — o mesmo código que faz upload em dev faz upload em produção.

- **Zero dependência de infraestrutura AWS:** Desenvolvedores e pipelines de CI/CD não precisam de conta AWS, usuário IAM, políticas ou credenciais externas. As credenciais de acesso ao MinIO local são definidas no `docker-compose.yaml` e compartilhadas via `.env.example` — qualquer colaborador clona o repositório e executa `docker compose up -d` para ter o ambiente completo funcional.

- **Zero custo:** Operações locais contra o MinIO não geram cobrança. Upload, download, listagem, deleção e geração de presigned URLs são executados sem impacto financeiro, independentemente do volume de testes ou iterações de desenvolvimento.

- **Validação local da estrutura de buckets ([ADR-0009](./0009-padronizacao-de-nomenclatura-de-buckets.md)):** O script de seed de buckets criará localmente os mesmos buckets definidos na convenção do [ADR-0009](./0009-padronizacao-de-nomenclatura-de-buckets.md) (`missionapp-dev-public-assets`, `missionapp-dev-private-docs`, etc.), permitindo que desenvolvedores verifiquem o comportamento da aplicação com a estrutura real de produção sem acessar a AWS.

- **MinIO Console para inspeção visual:** A interface web integrada permite que desenvolvedores inspecionem o conteúdo dos buckets, verifiquem uploads, removam objetos de teste e monitorem o estado do storage sem ferramentas externas ou CLI da AWS.

- **Operação efêmera controlável:** Com volume Docker configurado, os dados de storage persistem entre reinicializações do container. Sem volume, o storage reinicia limpo a cada `docker compose up` — comportamento útil para testes que precisam de estado inicial previsível.

## Alternativas Consideradas

* **AWS S3 real em ambiente de desenvolvimento:** Usar buckets S3 reais com prefixo `dev` para desenvolvimento. Descartado porque: (1) gera custo por operação — inviável em projeto open-source com contribuidores desconhecidos; (2) exige conta AWS e credenciais IAM por contribuidor, criando obstáculo de onboarding e risco de vazamento; (3) cria dependência de conectividade com a internet para operações de storage; (4) dificulta pipelines de CI/CD, que precisariam de credenciais AWS injetadas como secrets.

* **Driver de filesystem local (`@adonisjs/drive` com `fs`):** Armazenar arquivos diretamente no sistema de arquivos do servidor via driver local do `@adonisjs/drive`. Descartado porque: (1) não exercita o caminho de código S3 — erros de configuração de bucket, presigned URLs, políticas de CORS e comportamentos específicos do S3 só seriam descobertos em produção; (2) não valida a estrutura de buckets do [ADR-0009](./0009-padronizacao-de-nomenclatura-de-buckets.md); (3) a troca entre driver `fs` e driver `s3` exige mudança de configuração não trivial e pode mascarar incompatibilidades que surgem apenas em produção; (4) não reproduz o comportamento de storage distribuído nem o modelo de URLs públicas/privadas por bucket.

* **LocalStack:** Emulador completo da AWS que cobre S3, SQS, SNS, Lambda, DynamoDB e dezenas de outros serviços. Descartado porque: (1) o MissionApp usa exclusivamente S3 como serviço AWS — emular o ecossistema completo é desproporcional ao escopo; (2) o LocalStack na modalidade gratuita tem limitações que requerem a versão Pro para alguns comportamentos avançados do S3; (3) footprint significativamente maior que o MinIO em memória e tempo de inicialização; (4) para o caso de uso exclusivo de S3, o MinIO oferece maior fidelidade com menor complexidade operacional.

## Consequências (Trade-offs)

### Positivas / Benefícios

* **Onboarding sem fricção:** Nenhum pré-requisito externo para storage — `docker compose up -d` provisiona MinIO junto com PostgreSQL e DragonflyDB. Novos contribuidores têm o ambiente de storage funcional em segundos.

* **Paridade de código entre dev e produção:** O mesmo driver S3 do `@adonisjs/drive` opera contra MinIO em dev e AWS S3 em produção. Bugs de integração com storage são detectados localmente, não em produção.

* **Validação antecipada da estrutura de buckets:** A convenção do [ADR-0009](./0009-padronizacao-de-nomenclatura-de-buckets.md) pode ser testada e verificada localmente antes de qualquer deploy, reduzindo o risco de erros de nomenclatura ou permissão em produção.

* **Desenvolvimento offline:** Funcionalidades de upload e download funcionam sem internet, sem latência de rede pública e sem dependência de disponibilidade da AWS.

### Negativas / Riscos

* **Fidelidade parcial com S3:** O MinIO implementa o núcleo da API S3, mas algumas funcionalidades avançadas e comportamentos específicos da AWS (S3 Select, Object Lambda, certos comportamentos de IAM Policies) podem diferir. Funcionalidades que dependem dessas APIs avançadas precisam ser validadas diretamente em S3.

* **Persistência requer configuração explícita de volume:** Sem volume Docker configurado, objetos armazenados no MinIO são perdidos ao reiniciar o container. A configuração de volume precisa estar documentada no `docker-compose.yaml` e no guia de setup para evitar confusão entre desenvolvedores.

* **Mais um serviço no Docker Compose:** MinIO adiciona memória e CPU ao ambiente de desenvolvimento local. Em máquinas com recursos limitados, o stack completo (PostgreSQL + DragonflyDB + MinIO) pode impactar a experiência de desenvolvimento.

## Referências

* [Documentação oficial do MinIO](https://min.io/docs/minio/container/index.html)
* [Compatibilidade MinIO com API S3 da AWS](https://min.io/product/s3-compatibility)
* [ADR-0001 — Adoção do AdonisJS como Framework Web Backend](./0001-adocao-do-adonisjs-como-framework-backend.md)
* [ADR-0009 — Padronização de Nomenclatura de Buckets S3](./0009-padronizacao-de-nomenclatura-de-buckets.md)

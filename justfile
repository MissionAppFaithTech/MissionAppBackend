set shell           := ["bash", "-eu", "-o", "pipefail", "-c"]
set dotenv-load     := true
set dotenv-filename := ".env"

COMPOSE_COMMAND  := "docker compose"
COMPOSE_FILE_DEV := "docker-compose.yaml"

COMPOSE_FILE_DEV_COMMAND := COMPOSE_COMMAND + " -f " + COMPOSE_FILE_DEV

POSTGRES_CONTAINER   := env_var_or_default('POSTGRES_CONTAINER_NAME',   'missionapp-pg')
DRAGONFLY_CONTAINER  := env_var_or_default('DRAGONFLY_CONTAINER_NAME',  'missionapp-dragonfly')
MINIO_CONTAINER      := env_var_or_default('MINIO_CONTAINER_NAME',      'missionapp-minio')
ES_CONTAINER         := env_var_or_default('ES_CONTAINER_NAME',         'missionapp-elasticsearch')

# Lista todos os comandos disponíveis
default:
    @just --list

# Lista todos os comandos disponíveis
[group('meta')]
list:
    @just --list

# Escolhe um comando interativamente
[group('meta')]
choose:
    @just --choose

# Aliases
alias ls     := list
alias c      := choose
alias status := ps

# Sobe a infraestrutura de desenvolvimento (PostgreSQL)
[group('infra')]
up:
    {{COMPOSE_FILE_DEV_COMMAND}} up -d

# Derruba a infraestrutura de desenvolvimento
[group('infra')]
down:
    {{COMPOSE_FILE_DEV_COMMAND}} down

# Reinicia a infraestrutura
[group('infra')]
restart: down up

# Derruba containers + volumes e sobe novamente (dados zerados)
[group('infra')]
reset: clean up

# Logs de todos os serviços de infraestrutura
[group('infra')]
logs:
    {{COMPOSE_FILE_DEV_COMMAND}} logs -f --tail=200

# Status dos containers
[group('infra')]
ps:
    {{COMPOSE_FILE_DEV_COMMAND}} ps

# Build das imagens Docker
[group('infra')]
build:
    {{COMPOSE_FILE_DEV_COMMAND}} build

# Remove containers + volumes
[group('infra')]
clean:
    {{COMPOSE_FILE_DEV_COMMAND}} down -v --remove-orphans

# Shell psql no PostgreSQL
[group('infra')]
db-shell:
    {{COMPOSE_FILE_DEV_COMMAND}} exec postgres psql -U $DB_USER -d $DB_DATABASE

# Logs do PostgreSQL
[group('infra')]
db-logs:
    {{COMPOSE_FILE_DEV_COMMAND}} logs -f --tail=200 postgres

# Logs do DragonflyDB
[group('infra')]
dragonfly-logs:
    {{COMPOSE_FILE_DEV_COMMAND}} logs -f --tail=200 dragonfly

# Logs do MinIO
[group('infra')]
minio-logs:
    {{COMPOSE_FILE_DEV_COMMAND}} logs -f --tail=200 minio

# Logs do Elasticsearch
[group('infra')]
es-logs:
    {{COMPOSE_FILE_DEV_COMMAND}} logs -f --tail=200 elasticsearch

# Aguarda o PostgreSQL estar saudável (timeout: 60s)
[group('infra')]
_wait-db:
    @echo "Aguardando PostgreSQL ficar saudável..."
    @timeout=60; elapsed=0; \
    until [ "$(docker inspect -f '{{{{.State.Health.Status}}}}' {{POSTGRES_CONTAINER}})" = "healthy" ]; do \
        if [ "$elapsed" -ge "$timeout" ]; then \
            echo "Erro: PostgreSQL não ficou saudável após ${timeout}s." >&2; exit 1; \
        fi; \
        sleep 2; elapsed=$((elapsed + 2)); \
    done; \
    echo "PostgreSQL pronto."

# Aguarda o DragonflyDB estar saudável (timeout: 60s)
[group('infra')]
_wait-dragonfly:
    @echo "Aguardando DragonflyDB ficar saudável..."
    @timeout=60; elapsed=0; \
    until [ "$(docker inspect -f '{{{{.State.Health.Status}}}}' {{DRAGONFLY_CONTAINER}})" = "healthy" ]; do \
        if [ "$elapsed" -ge "$timeout" ]; then \
            echo "Erro: DragonflyDB não ficou saudável após ${timeout}s." >&2; exit 1; \
        fi; \
        sleep 2; elapsed=$((elapsed + 2)); \
    done; \
    echo "DragonflyDB pronto."

# Aguarda o MinIO estar saudável (timeout: 60s)
[group('infra')]
_wait-minio:
    @echo "Aguardando MinIO ficar saudável..."
    @timeout=60; elapsed=0; \
    until [ "$(docker inspect -f '{{{{.State.Health.Status}}}}' {{MINIO_CONTAINER}})" = "healthy" ]; do \
        if [ "$elapsed" -ge "$timeout" ]; then \
            echo "Erro: MinIO não ficou saudável após ${timeout}s." >&2; exit 1; \
        fi; \
        sleep 2; elapsed=$((elapsed + 2)); \
    done; \
    echo "MinIO pronto."

# Aguarda o Elasticsearch estar saudável (timeout: 120s — startup mais lento)
[group('infra')]
_wait-elasticsearch:
    @echo "Aguardando Elasticsearch ficar saudável..."
    @timeout=120; elapsed=0; \
    until [ "$(docker inspect -f '{{{{.State.Health.Status}}}}' {{ES_CONTAINER}})" = "healthy" ]; do \
        if [ "$elapsed" -ge "$timeout" ]; then \
            echo "Erro: Elasticsearch não ficou saudável após ${timeout}s." >&2; exit 1; \
        fi; \
        sleep 2; elapsed=$((elapsed + 2)); \
    done; \
    echo "Elasticsearch pronto."

# Aguarda toda a infraestrutura estar pronta
[group('infra')]
_wait-infra: _wait-db _wait-dragonfly _wait-minio _wait-elasticsearch

# Falha se o .env não tiver alguma variável declarada no .env.example
[group('dev')]
check-env:
    @if [ ! -f .env ]; then echo "ERRO: .env não encontrado — rode: cp .env.example .env"; exit 1; fi
    @missing=$(comm -23 <(grep -oE '^[A-Z0-9_]+=' .env.example | sort -u) <(grep -oE '^[A-Z0-9_]+=' .env | sort -u) | tr -d '='); \
    if [ -n "$missing" ]; then \
        echo "ERRO: variáveis do .env.example ausentes no .env:"; \
        echo "$missing" | sed 's/^/  - /'; \
        echo "Copie-as do .env.example (veja a seção de storage em CONTRIBUTING.md)."; \
        exit 1; \
    fi
    @echo "OK: .env contém todas as variáveis do .env.example."

# Cria os buckets do MinIO (S3_PUBLIC_BUCKET/S3_PRIVATE_BUCKET) — idempotente
[group('dev')]
storage-setup:
    node ace storage:setup

# Instala dependências
[group('dev')]
install:
    pnpm install

# Sobe a infraestrutura, aguarda, migra e inicia o servidor de desenvolvimento
[group('dev')]
start: check-env up _wait-infra storage-setup migrate
    pnpm dev

# Inicia servidor de desenvolvimento com HMR
[group('dev')]
dev:
    pnpm dev

# Compila TypeScript → build/
[group('dev')]
compile:
    pnpm build

# ESLint
[group('qualidade')]
lint:
    pnpm lint

# ESLint com autofix
[group('qualidade')]
lint-fix:
    pnpm lint:fix

# Prettier (verifica formatação)
[group('qualidade')]
format:
    pnpm format

# Prettier (formata in-place)
[group('qualidade')]
format-fix:
    pnpm format:fix

# TypeScript sem emit
[group('qualidade')]
typecheck:
    pnpm typecheck

# Lint + typecheck (equivalente ao CI)
[group('qualidade')]
ci: lint typecheck

# Falha se package-lock.json ou yarn.lock estiverem versionados (proibido — ver CONTRIBUTING.md)
[group('qualidade')]
check-lockfiles:
    @if git ls-files --error-unmatch package-lock.json yarn.lock >/dev/null 2>&1; then \
        echo "Erro: package-lock.json/yarn.lock não podem ser commitados — use apenas pnpm." >&2; exit 1; \
    fi
    @echo "OK: nenhum lockfile de npm/yarn versionado."

# Checagens automatizáveis antes de abrir um PR: ci + testes + lockfiles
[group('qualidade')]
pr-check: ci test check-lockfiles

# Executa todas as verificações: lint, format, typecheck, testes e fallow
[group('qualidade')]
verify: lint format typecheck test fallow-audit

# Aplica migrações pendentes e regenera database/schema.ts
[group('banco de dados')]
migrate:
    node ace migration:run

# Reverte o último batch de migrações
[group('banco de dados')]
migrate-rollback:
    node ace migration:rollback

# Executa seeders
[group('banco de dados')]
seed:
    node ace db:seed

# NOTE: o dotenv-load exporta o .env para o processo, e o AdonisJS dá
# precedência ao process.env sobre o .env.test — sem reexportar o .env.test,
# os testes rodariam com os valores de desenvolvimento (ex.: REDIS_DB=0).
LOAD_TEST_ENV := "set -a && . ./.env.test && set +a"

# Todos os suites de teste
[group('testes')]
test:
    {{LOAD_TEST_ENV}} && pnpm test

# Apenas testes unitários
[group('testes')]
test-unit:
    {{LOAD_TEST_ENV}} && node ace test unit

# Apenas testes funcionais
[group('testes')]
test-functional:
    {{LOAD_TEST_ENV}} && node ace test functional

# Análise completa do projeto: código morto + duplicatas + saúde
[group('fallow')]
fallow:
    pnpm fallow

# Apenas código morto e dependências não utilizadas
[group('fallow')]
fallow-dead-code:
    pnpm fallow:dead-code

# Apenas duplicação de código
[group('fallow')]
fallow-dupes:
    pnpm fallow:dupes

# Complexidade e manutenibilidade com hotspots priorizados
[group('fallow')]
fallow-health:
    pnpm fallow:health

# Candidatos a problemas de segurança (requer verificação manual)
[group('fallow')]
fallow-security:
    pnpm fallow:security

# Re-executa análise automaticamente a cada mudança de arquivo
[group('fallow')]
fallow-watch:
    pnpm fallow:watch

# Audita arquivos alterados vs upstream — veredicto pass/warn/fail (exit 1 em fail)
[group('fallow')]
fallow-audit:
    pnpm fallow:audit

# Idem, saída legível sem exit 1 — útil para revisão e orientação de agentes
[group('fallow')]
fallow-audit-brief:
    pnpm fallow:audit:brief

# Audita arquivos alterados vs upstream — saída JSON silenciosa para CI e scripts
[group('fallow')]
fallow-audit-ci:
    pnpm fallow:audit:ci

# Verificação completa: qualidade do diff + candidatos de segurança + vulnerabilidades de dependências
[group('fallow')]
fallow-verify: fallow-audit fallow-security
    pnpm audit

# Snyk Open Source (requer `snyk auth`) — mesmo escopo do CI; build/ guarda um lockfile copiado pelo build
[group('segurança')]
snyk:
    pnpm dlx snyk@1.1308.3 test --all-projects --exclude=build

# Snyk Code (SAST) — exige org com Snyk Code habilitado (ex.: SNYK_CFG_ORG=missionapp.faithtech)
[group('segurança')]
snyk-code:
    pnpm dlx snyk@1.1308.3 code test

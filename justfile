set shell           := ["bash", "-eu", "-o", "pipefail", "-c"]
set dotenv-load     := true
set dotenv-filename := ".env"

COMPOSE_COMMAND  := "docker compose"
COMPOSE_FILE_DEV := "docker-compose.yaml"

COMPOSE_FILE_DEV_COMMAND := COMPOSE_COMMAND + " -f " + COMPOSE_FILE_DEV

POSTGRES_CONTAINER := env_var_or_default('POSTGRES_CONTAINER_NAME', 'missionapp-pg')

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

# Aguarda o PostgreSQL estar saudável (timeout: 60s)
[group('infra')]
wait-db:
    @echo "Aguardando PostgreSQL ficar saudável..."
    @timeout=60; elapsed=0; \
    until [ "$(docker inspect -f '{{{{.State.Health.Status}}}}' {{POSTGRES_CONTAINER}})" = "healthy" ]; do \
        if [ "$elapsed" -ge "$timeout" ]; then \
            echo "Erro: PostgreSQL não ficou saudável após ${timeout}s." >&2; exit 1; \
        fi; \
        sleep 2; elapsed=$((elapsed + 2)); \
    done; \
    echo "PostgreSQL pronto."

# Aguarda toda a infraestrutura estar pronta
[group('infra')]
wait-infra: wait-db

# Instala dependências
[group('dev')]
install:
    pnpm install

# Sobe a infraestrutura, aguarda, migra e inicia o servidor de desenvolvimento
[group('dev')]
start: up wait-infra migrate
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

# Todos os suites de teste
[group('testes')]
test:
    pnpm test

# Apenas testes unitários
[group('testes')]
test-unit:
    node ace test --suite=unit

# Apenas testes funcionais
[group('testes')]
test-functional:
    node ace test --suite=functional

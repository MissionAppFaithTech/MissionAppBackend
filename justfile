set shell           := ["bash", "-c"]
set dotenv-load     := true
set dotenv-filename := ".env"

COMPOSE_COMMAND  := "docker compose"
COMPOSE_FILE_DEV := "docker-compose.yaml"

COMPOSE_FILE_DEV_COMMAND := COMPOSE_COMMAND + " -f " + COMPOSE_FILE_DEV

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

# Instala dependências
[group('dev')]
install:
    pnpm install

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
    pnpm lint --fix

# Prettier (formata in-place)
[group('qualidade')]
format:
    pnpm format

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

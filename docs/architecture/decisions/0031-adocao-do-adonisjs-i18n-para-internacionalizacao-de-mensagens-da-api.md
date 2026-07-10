# [ADR-0031]: Adoção do @adonisjs/i18n para Internacionalização de Mensagens da API

## Dados

- **Status:** 🟢 Aceito
- **Data:** 2026-07-10
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

Vários controllers retornam mensagens de confirmação textuais direto no corpo da resposta, sem passar por `serialize()`/`ApiSerializer` — um padrão `{ message: '...' }` solto, fora do envelope `{ data: ... }` usado pelo resto da API:

```ts
// access_tokens_controller.ts
return { message: 'Logged out successfully' }

// account_password_controller.ts
return { message: 'Password changed successfully' }

// sessions_controller.ts
return { message: 'Sessão encerrada' }

// all_sessions_controller.ts
return { message: 'Todas as sessões foram encerradas' }
```

Isso expôs dois problemas reais, não hipotéticos:

**Idioma inconsistente dentro da mesma API.** Dois endpoints respondem em inglês, dois em português — sem nenhum critério explícito de qual idioma usar onde. Um cliente que espera consistência de locale entre chamadas não tem garantia nenhuma.

**Strings de usuário hardcoded na camada de controller.** A mensagem final que o usuário vê está embutida na lógica de negócio, sem chave de identificação, sem possibilidade de reuso, e sem qualquer mecanismo de tradução. Duas mensagens equivalentes ("Sessão encerrada" vs. um futuro "Sessão finalizada" em outro endpoint) podem divergir por acidente de digitação, não por decisão consciente.

Um sugar de serialização (ex: `serialize.message(...)`) resolveria só a inconsistência de envelope — nenhuma abordagem no nível de `ApiSerializer` resolve o problema de conteúdo/idioma, porque serialização é sobre **estrutura** da resposta, não sobre **texto** dela. O problema de fundo é a ausência de uma camada de internacionalização: hoje não existe onde declarar "essa é a mensagem X, em tal idioma", nem mecanismo para escolher o idioma certo por request.

A questão central é: **como centralizar mensagens de usuário fora do código de controllers/services, de forma versionada, sem duplicação entre idiomas, e com seleção de idioma automática por request?**

## Decisão

Adotaremos o **`@adonisjs/i18n`** — módulo oficial do ecossistema AdonisJS para internacionalização — quando o MissionApp Backend precisar suportar múltiplos idiomas ou, no mínimo, centralizar mensagens de usuário fora dos controllers.

### Instalação e configuração

```sh
node ace add @adonisjs/i18n
```

O comando instala a dependência, registra o provider em `adonisrc.ts` e gera `config/i18n.ts`, com:

- `defaultLocale`: idioma de fallback quando uma tradução está ausente.
- `formatter`: formato de mensagem — ICU (International Components for Unicode) por padrão, com suporte a interpolação, plural e formatação de número/data.
- `loaders`: origem das traduções (filesystem por padrão).
- `supportedLocales`: inferido automaticamente pelos diretórios existentes em `resources/lang/`, ou declarado explicitamente.

### Estrutura das traduções

```
resources/lang/
├── pt-BR/
│   ├── auth.json
│   └── validator.json
└── en/
    ├── auth.json
    └── validator.json
```

Chaves em notação de ponto, sem aninhamento de objeto:

```json
// resources/lang/pt-BR/auth.json
{
  "logout.success": "Sessão encerrada",
  "password.changed": "Senha alterada com sucesso"
}
```

### Detecção de idioma por request

O `detect_user_locale_middleware` (registrado no kernel) lê o header `Accept-Language` da request, resolve o locale mais próximo dentre os `supportedLocales`, e injeta uma instância `i18n` já resolvida no `HttpContext` — disponível em todo controller sem setup manual por rota.

### Uso em controllers

```ts
async destroy({ i18n }: HttpContext) {
  // ...
  return { message: i18n.t('auth.logout.success') }
}
```

### Integração com VineJS

Mensagens de erro de validação (`vine.errors()`) passam a ser resolvidas também via `resources/lang/{locale}/validator.json`, sob a chave `shared` — o middleware registra o provider de mensagens customizado automaticamente para requests HTTP. Fora do ciclo de request (Ace commands, jobs de fila), o provider precisa ser registrado manualmente — relevante para `app/jobs/` do projeto.

### Fallback

Tradução ausente no locale detectado → cai para `fallbackLocales` (se configurado) → cai para `defaultLocale` → se ainda ausente, retorna string de erro ou fallback customizado. Nunca quebra a request por chave de tradução faltando.

## Justificativa

- **Pacote oficial do ecossistema já em uso:** mesmo padrão de integração dos demais módulos AdonisJS do projeto (`@adonisjs/auth`, `@adonisjs/lucid`, `@vinejs/vine`) — sem adapter customizado, sem dependência de terceiro fora do ecossistema.

- **Scaffolding via Ace:** `node ace add` segue a convenção "Ace-First" já documentada em `AGENTS.md` — registro de provider e geração de config automatizados, sem edição manual de `adonisrc.ts`.

- **Integração nativa com VineJS:** os validators já usados no projeto (`app/validators/`) ganham mensagens de erro traduzíveis sem reescrever a camada de validação.

- **ICU como formato de mensagem:** suporta interpolação, pluralização e formatação de data/número nativamente — cobre necessidades futuras (ex: "Você tem {count, plural, one {1 doação} other {# doações}}") sem trocar de ferramenta.

- **Sem vendor lock-in:** traduções vivem como arquivos JSON/YAML versionados no próprio repositório — mesmo princípio já aplicado em outras decisões do projeto ([ADR-0005](./0005-adocao-do-fallow-para-analise-estatica-de-codigo-morto.md), [ADR-0029](./0029-adocao-do-k6-como-quality-gate-de-performance.md)).

## Alternativas Consideradas

**1. Dicionário manual (objeto indexado por locale, sem biblioteca)**

Solução caseira: um objeto `{ 'pt-BR': { logoutSuccess: '...' }, en: { logoutSuccess: '...' } }` importado onde necessário. Descartada porque: (1) reimplementa detecção de locale, fallback e interpolação — problema já resolvido pelo ecossistema; (2) sem integração com VineJS, exigindo duplicar a lógica de tradução para mensagens de validação; (3) sem formato ICU, pluralização/formatação de número teria que ser escrita à mão.

**2. i18next**

Biblioteca de i18n mais popular do ecossistema JavaScript geral, com plugins extensos (detecção de browser, backend HTTP, etc.). Descartada porque: (1) não tem integração oficial com AdonisJS/VineJS — exigiria middleware e adapter customizados para replicar o que `@adonisjs/i18n` já entrega pronto; (2) grande parte dos plugins do i18next (detecção via querystring, cookie de browser) é irrelevante para uma API backend-only; (3) foge do padrão "usar o módulo oficial do framework" já seguido no restante do projeto.

**3. Não fazer nada (manter strings hardcoded)**

Descartada — é o estado atual, e é exatamente o problema que motivou este ADR: idioma inconsistente entre endpoints, sem mecanismo de correção estrutural.

## Consequências (Trade-offs)

### Positivas / Benefícios

- **Mensagens de usuário centralizadas e versionadas:** toda string visível ao usuário fica em `resources/lang/`, revisável em PR como qualquer outro arquivo de conteúdo, sem estar espalhada por controllers/services.

- **Idioma consistente por request:** o mesmo mecanismo de detecção resolve o locale para toda a resposta — mensagens de sucesso e erros de validação usam a mesma fonte de verdade.

- **Extensível para multi-idioma real:** hoje o problema é só consistência (pt-BR vs en misturado sem critério); se o MissionApp precisar suportar múltiplos idiomas de fato no futuro, a infraestrutura já estará pronta — sem migração de arquitetura.

### Negativas / Riscos

- **Implementação ainda não realizada.** Este ADR documenta a decisão e o raciocínio para não perder o contexto da discussão — os 4 controllers identificados (`access_tokens_controller.ts`, `sessions_controller.ts`, `all_sessions_controller.ts`, `account_password_controller.ts`) continuam com mensagens hardcoded e idioma misturado até a migração ser executada.

- **Overhead de manutenção de arquivos de tradução:** toda nova mensagem de usuário exige uma entrada em `resources/lang/{locale}/*.json` por idioma suportado, em vez de uma string inline — mais um arquivo para manter sincronizado a cada feature.

- **Provider precisa de registro manual fora do ciclo HTTP:** jobs de fila (`app/jobs/`) e comandos Ace que precisem de mensagens traduzidas não ganham o provider automaticamente do middleware — exige setup explícito nesses contextos.

## Referências

- [AdonisJS — I18n (Digging Deeper)](https://docs.adonisjs.com/guides/digging-deeper/i18n): guia oficial de instalação, configuração e uso
- [GitHub — adonisjs/i18n](https://github.com/adonisjs/i18n): código-fonte do módulo, suporte a drivers de arquivo e banco de dados
- [AdonisJS — Validation](https://docs.adonisjs.com/guides/basics/validation): integração de mensagens de erro do VineJS com i18n
- [Unicode ICU Message Format](https://unicode-org.github.io/icu/userguide/format_parse/messages/): especificação do formato de mensagem usado pelo formatter padrão
- [ADR-0028](./0028-arquitetura-de-validators-reutilizaveis-com-vinejs.md): arquitetura de validators VineJS — camada que ganha mensagens traduzíveis com esta adoção

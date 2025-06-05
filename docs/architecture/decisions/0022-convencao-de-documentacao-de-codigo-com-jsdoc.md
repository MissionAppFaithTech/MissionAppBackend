# [ADR-0022]: Convenção de Documentação de Código com JSDoc

## Dados

- **Status:** 🔵 Em Uso
- **Data:** 2026-06-14
- **Proponentes:** [Allber Ferreira](https://github.com/AFSFerreira)

---

## Contexto e Problema

O MissionApp Backend é um projeto open source que lida com dados sensíveis (afiliação religiosa, transações financeiras) e implementa mecanismos de segurança não triviais — como refresh token rotation com family tracking e revogação assimétrica via DragonflyDB. À medida que novos colaboradores chegam, dois comportamentos opostos emergem sem uma convenção explícita:

**Subdocumentação:**
Contribuidores removem ou não adicionam comentários por considerar o código "autoexplicativo". Invariantes de segurança críticos — como "a família inteira é invalidada ao detectar reuso de token revogado" ou "o valor bruto do token nunca é persistido" — ficam implícitos e precisam ser inferidos pela leitura completa da implementação. O risco de uma contribuição futura quebrar um invariante sem perceber é real.

**Superdocumentação:**
O extremo oposto: comentários `// Valida e rotaciona` acima de `async rotate(rawToken: string)`, ou `// Cria novo refresh token para o usuário` acima de `async create(userId: string)`. Esses comentários repetem o que os próprios identificadores já comunicam, adicionam ruído e envelhecem mal — uma rename silencia o método mas o comentário permanece.

**Ausência de critério por camada:**
Sem uma convenção que estabeleça onde JSDoc agrega valor e onde é ruído, cada PR traz uma decisão ad hoc. Controllers acabam documentados como se fossem serviços; listeners ganham parágrafos que descrevem o que o nome já diz; serviços com invariantes de segurança ficam sem nenhuma documentação.

A questão central é: **qual é o critério objetivo para decidir onde e como documentar código com JSDoc no MissionApp Backend, de forma que contribuidores entendam invariantes não óbvios sem que o projeto acumule documentação redundante?**

---

## Decisão

Adotaremos JSDoc **seletivo e orientado ao porquê** — documentando apenas invariantes, restrições de segurança e comportamentos que surpreenderiam um leitor competente. Comentários que descrevem o que o próprio nome do identificador já comunica são proibidos.

### Princípio fundamental

> Documente **por que**, não **o quê**. Identifiers bem nomeados já descrevem o quê. JSDoc existe para revelar restrições ocultas, invariantes de segurança e decisões que não são evidentes pela assinatura ou pelo nome.

### Idioma

Todos os comentários e JSDoc devem ser escritos em **português (pt-BR)**, conforme AGENTS.md.

### Regras de escrita

**Nível de classe:**
Descreva a responsabilidade da classe dentro do pipeline da aplicação em 2–3 linhas. Não liste os métodos — o leitor já vê os métodos. Descreva o contrato implícito ou a posição da classe na arquitetura.

```typescript
/**
 * Gerencia o ciclo de vida de refresh tokens opacos.
 *
 * Tokens são armazenados apenas como hash SHA-256 — o valor bruto
 * existe somente em memória durante a emissão e nunca é persistido.
 */
export class RefreshTokenService { ... }
```

**Nível de método:**
Documente apenas quando houver ao menos um dos seguintes:

- Invariante de segurança que não é evidente pela assinatura
- Pré-condição ou pós-condição que o caller precisa respeitar
- Comportamento surpreendente em um cenário específico
- Parâmetro cujo significado muda o comportamento de forma não óbvia

```typescript
/**
 * Rotaciona o token da sessão corrente.
 *
 * Se o token apresentado já estiver revogado, assume possível roubo e invalida
 * toda a família — todos os tokens emitidos na mesma sessão de login de origem.
 * Neste caso, o usuário precisará autenticar novamente em todos os dispositivos.
 *
 * @throws {InvalidTokenException} Token não encontrado, expirado ou revogado.
 */
async rotate(rawToken: string): Promise<{ userId: string; newRaw: string }> { ... }
```

**`@param` e `@returns`:**
Use somente quando o nome do parâmetro não é suficiente para comunicar a restrição. Se `userId: string` é autoexplicativo, não documente. Se `familyId?: string` determina se o token pertence a uma sessão existente ou inicia uma nova, documente.

```typescript
// necessário — o comportamento muda com base no valor
/**
 * @param familyId Quando fornecido, vincula o token a uma sessão existente (rotação).
 *                 Quando omitido, uma nova família é criada (novo login).
 */
async create(userId: string, familyId?: string): Promise<string> { ... }

// desnecessário — nome já comunica
async revokeAllForUser(userId: string): Promise<void> { ... }
```

**`@throws`:**
Documente exceções que o caller deve tratar ou que representam cenários de segurança relevantes. Não documente exceções de runtime genéricas que indicam bug no caller.

### O que nunca documentar

| Padrão proibido                                           | Por quê                                  |
| --------------------------------------------------------- | ---------------------------------------- |
| `// Valida o token` acima de `validate()`                 | Repete o nome                            |
| `// Retorna o usuário` em `@returns` de `findUser()`      | Óbvio pela assinatura                    |
| `@param userId ID do usuário`                             | O nome já diz                            |
| Referência ao PR, issue ou tarefa que introduziu o código | Pertence ao histórico git, não ao código |

---

## Onde aplicar JSDoc

A necessidade de documentação varia conforme a camada da aplicação. A tabela abaixo define o critério por camada com base na probabilidade de conter invariantes não óbvios:

<table width="100%">
   <colgroup>
      <col width="22%">
      <col width="13%">
      <col width="65%">
   </colgroup>
   <thead>
      <tr>
         <th>Camada</th>
         <th>JSDoc</th>
         <th>Critério</th>
      </tr>
   </thead>
   <tbody>
      <tr>
         <td><strong>Services</strong> (<code>app/services/</code>)</td>
         <td>✅ Obrigatório</td>
         <td align="left">Camada de maior densidade lógica. JSDoc de classe sempre. JSDoc de método quando houver invariante de segurança, efeito colateral relevante ou pré/pós condição.</td>
      </tr>
      <tr>
         <td><strong>Auth guards e providers</strong> (<code>app/auth/</code>)</td>
         <td>✅ Obrigatório</td>
         <td align="left">Implementações customizadas com contratos de segurança críticos (ex: ordem dos passos de validação JWT, quando um token é considerado válido). JSDoc de classe e dos métodos que implementam a lógica de verificação.</td>
      </tr>
      <tr>
         <td><strong>Middleware</strong> (<code>app/middleware/</code>)</td>
         <td>⚠️ Seletivo</td>
         <td align="left">Middleware que impõe dependências de ordem, requisitos de contexto (<code>ctx</code>) ou comportamento silencioso (ex: <code>silent_auth</code> não lança exceção) merece JSDoc de classe. Middleware que apenas delega a uma lib não precisa.</td>
      </tr>
      <tr>
         <td><strong>Models</strong> (<code>app/models/</code>)</td>
         <td>⚠️ Seletivo</td>
         <td align="left">Scopes com regra de composição não óbvia (ex: uso obrigatório de callback em <code>orWhere</code>), relacionamentos com cascade específico ou hooks com efeito colateral devem ser documentados. Colunas e tipos vêm do schema gerado — não documentar lá.</td>
      </tr>
      <tr>
         <td><strong>Workers / Jobs</strong> (<code>commands/</code>, <code>app/jobs/</code>)</td>
         <td>⚠️ Seletivo</td>
         <td align="left">Quando o job carrega garantias de idempotência, lógica de retry específica ou restrições no payload. JSDoc de classe descrevendo o contrato de execução. Omitir quando o worker apenas delega a um service.</td>
      </tr>
      <tr>
         <td><strong>Mixins</strong> (<code>app/models/mixins/</code>)</td>
         <td>⚠️ Seletivo</td>
         <td align="left">JSDoc de classe descrevendo o comportamento injetado e por que o hook existe. Mixins com hooks Lucid (<code>@beforeCreate</code>) frequentemente carregam requisitos não óbvios — por exemplo, <code>selfAssignPrimaryKey = true</code> é obrigatório para que o Lucid não tente inserir <code>id = null</code>. Métodos do hook dispensam documentação quando o nome é autoexplicativo.</td>
      </tr>
      <tr>
         <td><strong>Filters</strong> (<code>app/models/filters/</code>)</td>
         <td>⚠️ Seletivo</td>
         <td align="left">A lib <code>adonis-lucid-filter</code> usa convenção implícita: cada método público da classe mapeia para um parâmetro de query com o mesmo nome. Esse contrato não é derivável pelo código — merece JSDoc de classe. Métodos triviais de coluna única (<code>name(v) → where('name', v)</code>) dispensam documentação. Filtros com lógica composta (OR, joins, condicionais) merecem JSDoc de método.</td>
      </tr>
      <tr>
         <td><strong>Controllers</strong> (<code>app/controllers/</code>)</td>
         <td>❌ Não aplicar</td>
         <td align="left">Controllers são intencionalmente finos: validar, delegar, serializar. Se um controller precisa de documentação, está fazendo demais. Qualquer lógica não óbvia pertence ao service, não ao controller.</td>
      </tr>
      <tr>
         <td><strong>Listeners</strong> (<code>app/listeners/</code>)</td>
         <td>❌ Não aplicar</td>
         <td align="left">Responsabilidade única e explícita: serializar payload e enfileirar job. Sem lógica, sem invariante oculto. Se um listener precisa de documentação, está violando sua própria responsabilidade.</td>
      </tr>
      <tr>
         <td><strong>Validators</strong> (<code>app/validators/</code>)</td>
         <td>❌ Não aplicar</td>
         <td align="left">Schemas VineJS são declarativos e autoexplicativos. Regras de validação complexas podem receber um comentário inline de uma linha, não JSDoc.</td>
      </tr>
      <tr>
         <td><strong>Transformers</strong> (<code>app/transformers/</code>)</td>
         <td>❌ Não aplicar</td>
         <td align="left">Responsabilidade de allowlist de campos. O que é exposto é evidente pelo <code>this.pick()</code>. Sem lógica condicional nem invariante de segurança.</td>
      </tr>
   </tbody>
</table>

---

## Justificativa

**Por que não documentar tudo?**
Documentação redundante se torna ruído e estala com o tempo. Um método renomeado invalida silenciosamente um JSDoc que repetia o nome anterior. O custo de manutenção de documentação que não agrega informação é real e sistemático — em projetos open source, onde o contexto dos revisores varia muito, comentários errados são piores que a ausência de comentários.

**Por que não deixar sem documentação?**
O projeto lida com invariantes de segurança que não são evidentes pela assinatura: a invalidação de família inteira ao detectar reuso de token revogado, o fato de o valor bruto do refresh token nunca ser persistido, a ordem dos três passos de validação do access token. Contribuidores que não leram o ADR-0021 podem introduzir regressões nessas garantias sem perceber. JSDoc direcionado expõe esses invariantes no ponto de uso, sem exigir que o leitor consulte documentação externa.

**Por que excluir controllers e listeners?**
Essas camadas têm contratos definidos por convenção estabelecida (AGENTS.md e ADR-0018): controllers são finos por definição, listeners têm responsabilidade única. Se alguém precisou documentar um controller, o problema não é de documentação — é de design. JSDoc nessas camadas mascararia violações de responsabilidade em vez de sinalizá-las.

**Por que JSDoc e não comentários inline?**
JSDoc é exibido pelo LSP nas IDEs mais comuns (VS Code, JetBrains, Neovim com LSP) ao passar o cursor sobre o símbolo. Isso torna o invariante visível no ponto de uso sem exigir navegação até o arquivo de implementação. Comentários inline acima da declaração têm o mesmo conteúdo mas não são surfaceados pelo hover.

---

## Alternativas Consideradas

**1. Sem documentação (código autoexplicativo)**

A filosofia "bom código não precisa de comentários" funciona para lógica de domínio convencional mas falha para invariantes de segurança. "O valor bruto nunca é persistido" não é derivável pela leitura de `RefreshToken.create({ tokenHash: hash })` sem contexto adicional. Descartado.

**2. JSDoc obrigatório em todos os métodos públicos**

Abordagem adotada em alguns projetos corporativos com geração automática de documentação. Cria obrigação de escrever `@param userId ID do usuário` em todos os métodos — ruído puro que degrada a relação sinal/ruído da documentação. Contribuidores passam a copiar JSDoc de outros métodos sem pensar, propagando documentação incorreta. Descartado.

**3. Documentação externa (wiki, docs site)**

Documenta o comportamento fora do código. Stale rápido — nenhum linter avisa quando a implementação muda e a wiki não. Em open source, onde contribuidores ocasionais dificilmente leem documentação externa antes de abrir um PR, o contrato precisa estar no ponto de uso. Descartado.

**4. Comentários inline em vez de JSDoc**

Mesma informação, mas não exibida pelo hover do LSP. Requer que o leitor navegue até a implementação para ver o comentário. JSDoc não exige essa navegação — o invariante aparece no ponto de chamada. Descartado em favor de JSDoc para as camadas que exigem documentação.

---

## Consequências

**Positivas:**

- Invariantes de segurança críticos ficam visíveis no ponto de uso via hover do LSP, sem exigir leitura da implementação completa
- A ausência de JSDoc em controllers e listeners sinaliza ativamente que aquelas camadas devem permanecer finas — qualquer adição se tornaria um cheiro de design
- Documentação mínima tem menor custo de manutenção e menor probabilidade de ficar desatualizada

**Negativas:**

- Exige julgamento: a fronteira entre "óbvio" e "não óbvio" é subjetiva e pode gerar debate em code review
- JSDoc desatualizado é pior que ausência de JSDoc — o time precisa tratar documentação errada como bug
- Não há verificação automática de qualidade do conteúdo do JSDoc (apenas de presença, via ferramentas como ESLint `jsdoc` plugin)

---

## Referências

- [AGENTS.md — Seção Comments](../../AGENTS.md): regra de escrita de comentários inline no projeto
- [ADR-0021](./0021-estrategia-de-autenticacao-jwt-hibrido-com-revogacao-via-dragonflydb.md): invariantes de segurança do fluxo de autenticação — exemplo central de comportamento que justifica JSDoc
- [ADR-0018](./0018-convencoes-de-escrita-de-migracoes.md): convenção análoga para migrações de banco de dados
- [JSDoc Reference](https://jsdoc.app/): documentação oficial das tags suportadas
- [TSDoc Specification](https://tsdoc.org/): superset de JSDoc para TypeScript, compatível com o ecosistema de tooling adotado

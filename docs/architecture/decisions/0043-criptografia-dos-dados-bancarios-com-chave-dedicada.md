# [ADR-0043]: Criptografia dos Dados Bancários com Chave Dedicada

## Dados

- **Status:** 🟡 Proposto
- **Data:** 2026-11-23
- **Proponentes:** [@devhenriquemendonca](https://github.com/devhenriquemendonca)

---

## Contexto e Problema

A área de doação do missionário (RF 12) guarda em `financial_configs` a chave Pix e os dados de transferência: banco, agência, conta, nome e CPF/CNPJ do titular. O NF 1.1 exige "hash forte para senhas e AES-256 para dados bancários", e o LGPD Art. 46 pede medidas técnicas para proteger dados pessoais. A tabela foi criada prevendo "criptografia em repouso", mas nenhum endpoint gravava nela até agora.

O AdonisJS já traz um encryptor AES-256-GCM configurado com o `APP_KEY`. O mesmo `APP_KEY` também cifra os refresh tokens no cache e assina cookies de sessão.

Os dados bancários são diferentes desses usos: ficam no banco por anos, e perdê-los faz doações irem para lugar nenhum. Um refresh token cifrado vive no máximo alguns dias.

A questão central é: **com que chave e de que forma os dados bancários devem ser cifrados no banco?**

## Decisão

**Cifrar as colunas sensíveis com AES-256-GCM, por um encryptor próprio (`financial`) e uma chave dedicada (`FINANCIAL_DATA_ENCRYPTION_KEY`), amarrando cada valor ao missionário e à coluna.**

- `config/encryption.ts` ganha o encryptor `financial` (`drivers.aes256gcm`). A chave atual vem de `FINANCIAL_DATA_ENCRYPTION_KEY` (obrigatória). Durante uma rotação, as antigas ficam em `FINANCIAL_DATA_ENCRYPTION_PREVIOUS_KEYS` (opcional, separadas por vírgula) e servem só para descriptografar.
- `pix_key`, `agency`, `account_number`, `holder_name` e `holder_document` viram `text` e guardam só texto cifrado. Código e nome do banco e tipo de conta continuam em claro, porque são públicos e não identificam ninguém.
- `FinancialDataCipher` (`app/services/financial_config/`) é o único ponto de leitura e escrita dessas colunas. Ele cifra com o `purpose` `financial_config:<missionaryId>:<coluna>`: um texto cifrado copiado para outra linha ou outra coluna não descriptografa.
- Um valor que não descriptografa (chave errada, rotação incompleta, adulteração) lança `FinancialDataUnreadableException` e responde 500. Ele nunca é tratado como "método pendente".
- A leitura pública (`GET /public/missionaries/{username}/donation`) mostra o CPF do titular mascarado (`***.456.789-**`). O CNPJ sai completo, por ser dado público de cadastro. A chave Pix sai completa, porque é o que o apoiador copia para pagar.

## Justificativa

- **Isolamento de chave:** trocar o `APP_KEY` (por vazamento, ou só para derrubar todas as sessões) não pode tornar os dados bancários ilegíveis. O inverso também vale: vazar a chave financeira não compromete sessões.
- **Rotação sem migração em massa:** o driver cifra com a primeira chave e tenta todas para descriptografar. Uma rotação é: mover a chave atual para `_PREVIOUS_KEYS`, gerar uma nova e regravar as linhas aos poucos.
- **GCM autenticado:** além do sigilo, detecta adulteração. Com o `purpose`, também impede a troca de valores entre linhas por quem só tem acesso ao banco.
- **Sem dependência nova:** usa o encryptor nativo do AdonisJS (`@boringnode/encryption`).

## Alternativas Consideradas

**1. Reusar o encryptor padrão (`APP_KEY`)**

Mais simples, sem variável nova. Descartada porque acopla a vida útil de dados permanentes a uma chave que a operação troca por outros motivos.

**2. Criptografia transparente no banco (pgcrypto / TDE)**

Com pgcrypto a chave trafega nas queries e aparece em logs do Postgres. TDE protege o disco, mas não um dump nem quem tem acesso ao banco. Descartada.

**3. Cofre externo (KMS, Vault) com envelope encryption**

É o ideal para escala, mas exige ADR de infraestrutura, custo e operação que o MVP não tem. A troca futura fica concentrada no `FinancialDataCipher`.

## Consequências (Trade-offs)

### Positivas / Benefícios

- Dados bancários cifrados em repouso (NF 1.1), com a troca de valores entre linhas bloqueada.
- Rotação de chave possível sem janela de indisponibilidade.

### Negativas / Riscos

- **Mais um segredo por ambiente.** Perder `FINANCIAL_DATA_ENCRYPTION_KEY` (e as anteriores) torna os dados bancários irrecuperáveis: os missionários precisam cadastrá-los de novo. A chave precisa de backup próprio.
- **Sem busca nem índice nessas colunas:** o texto cifrado é aleatório a cada gravação. Hoje nenhum fluxo precisa disso.
- **O rollback da migration descarta os valores cifrados,** porque o código anterior os leria como texto plano.

## Referências

- [ADR-0039](./0039-pix-somente-com-chave.md): Pix configurado só pela chave
- [ADR-0034](./0034-envelope-de-erro-unico-com-codigo.md): 500 sai no envelope genérico
- [AdonisJS — Encryption](https://docs.adonisjs.com/guides/security/encryption): encryptors, múltiplas chaves e `purpose`
- [Lista de requisitos do MissionApp](https://mission-app-requirements-checklist.vercel.app/#rf-12): RF 12 e NF 1.1

# dsh-autotier

> 🧊 **CONGELADO — 2026-10-31. Modo manutenção.** Sem novos recursos; apenas correções de segurança e dependências.

## Estado de manutenção: 🧊 CONGELADO

Congelado em 2026-10-31 em modo manutenção. O pacote continua instalável; apenas correções de segurança e dependências estão previstas.


[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-autotier)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-autotier.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19.0%20%7C%7C%20%3E%3D24.0.0-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-autotier/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-autotier/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-autotier?label=version)](https://github.com/PerryLink/dsh-autotier/releases)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-autotier?metric=downloads&lang=pt)](https://dshfind.com/pt/plugins/PerryLink/dsh-autotier?ref=badge)

[English](README.md) | [简体中文](README-zh.md) | [Español](README-es.md) | **Português** | [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-autotier
```


Roteamento automático por níveis de modelo para o DeepSeek Harness: entra uma
instrução do usuário, sai uma decisão de nível — sem trocar de modelo à mão.

A intenção complexa (arquitetura, planejamento, depuração, engenharia de várias
etapas) é planejada no nível **strong** e depois implementada no nível **cheap**.
A intenção simples (perguntas, recuperação, tarefas em lote, trabalho diário) é
projetada e implementada diretamente no nível **cheap**. Enquanto o nível cheap
executa, chamadas de ferramenta de alto risco são negadas por um guard
determinístico, e falhas repetidas escalam para o nível strong com um TTL de
retorno.

- **Repositório oficial**: <https://github.com/PerryLink/dsh-autotier>
- **npm**: `dsh-autotier` (nome simples, sem scope)


**📖 Base de conhecimento do ecossistema** — dados medidos, não marketing: [guia de desenvolvimento · dados de seleção · critérios de manutenção](https://perrylink.github.io/dsh-plugin-guide/).

<!-- star-cta -->
## Instalação e desinstalação

**Canal npm**

```bash
npm i -g dsh1024
dsh1024 plugin --profile web add dsh-autotier
```

**Canal git**

```bash
git clone https://github.com/PerryLink/dsh-autotier.git
cd dsh-autotier && pnpm install && pnpm run build
dsh plugin --profile web add .
```

**Seção de prompt opcional no preset.** O router funciona sem ela. Para que o
modelo saiba em qual nível está, acrescente uma linha ao *seu* preset
(`docs/preset-row.md` tem o bloco exato):

```yaml
- insert:
    - id: autotier-prompt
      name: '@deepseek-ai/dsh-system-prompt'
      # sections: [...]  — veja docs/preset-row.md
```

**Desinstalação**

```bash
dsh plugin --profile web remove dsh-autotier
```

A linha, seu comando, suas ferramentas e seus listeners são removidos com o
plugin. A configuração que um usuário salvou pela página Plugins vive no patch do
perfil ativo e pertence àquele perfil, não a este plugin; remover a linha a deixa
ali intacta.

## ⭐ 如果它帮到了你

Este plugin faz parte da [família de plugins DSH](https://github.com/PerryLink) (mais de 40, todos Apache-2.0). Se for útil, **deixe uma estrela**: não desbloqueia nada, mas ajuda a próxima pessoa a encontrá-lo.

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-autotier?

Canal npm

Canal git

![Diagrama de fluxo de dsh-autotier: chamada → plugin → resultado.](docs/assets/dsh-autotier-flow.svg)

*Visão geral do fluxo: chamada → plugin → resultado. Os exemplos abaixo usam a superfície real de comandos.*


*A mesma execução, animada.*

## Compatibilidade

| Harness | Estado |
|---|---|
| `@deepseek-ai/dsh` `0.1.2-rc.1` | não é mais suportada; essa linha é anterior ao contrato `SettingsForms` que o plugin agora mira |
| `@deepseek-ai/dsh` `0.1.5-rc.2` | não é mais suportada; o contrato `settings.register` / `settings/updated` que ela expõe foi removido a montante |
| `@deepseek-ai/dsh` `0.1.6-alpha.2` | não é mais suportada; a mesma remoção, primeira linha com `SettingsForms` |
| `@deepseek-ai/dsh` `0.1.7-rc.2` | **obrigatória**; verificada contra o checkout correspondente (`typecheck`) e os pacotes publicados (`typecheck:ci`, 214 testes) |
| `@deepseek-ai/cordis` `^4.0.3`, `@deepseek-ai/cosmokit` `^1.8.4`, `@deepseek-ai/schemastery` `^3.18.3` | base de peers |

Os ranges de peers nomeiam as quatro linhas publicadas (`>=0.1.6-0 <0.2.0 || >=0.2.0-0 <0.3.0 || >=0.2.1-0 <0.3.0`), porque um range cujo único comparador de prerelease
está numa tupla anterior não admite um alpha posterior. São atualizados por onda.
O range declarado é deliberadamente mais amplo que o verificado: documenta o que o
manifesto aceita, não o que foi testado.

**Esta versão é uma adaptação que quebra compatibilidade.** O host da geração
`0.1.6` removeu a costura de *provider* de settings sobre a qual este plugin foi
construído: o pacote `@deepseek-ai/dsh-settings-file` não existe mais,
`ctx.settings` agora é `SettingsForms` (um projetor schema→formulário, sem
`register`), e `settings/updated` também não existe. Nenhuma superfície
compartilhada permite que um plugin observe o documento de configurações de
outro, então nenhuma versão deste plugin pode suportar os dois contratos ao mesmo
tempo. A configuração agora flui pelo mecanismo de configuração volátil do host;
o **modo de roteamento por sessão** — a configuração que de fato muda o
comportamento em tempo de execução — não muda.

O plugin vive apenas no plano host e não precisa de preset próprio: a linha host
vale para todas as sessões. Uma seção de prompt no *seu* preset é opcional e
apenas torna as decisões visíveis ao modelo (veja [Instalação e desinstalação](#instalação-e-desinstalação)).

## O que você recebe

- **Portão de intenção** — cada turno é classificado por sinais determinísticos
  (texto da mensagem, nomes de ferramentas, presença de imagens, tamanho da
  conversa). A camada de regras decide sem gastar tokens quando tem confiança;
  apenas um turno de baixa confiança chama o modelo juiz barato, e nunca dentro do
  cooldown.
- **Aterrissagem no seam oficial** — a decisão é aplicada na waterfall
  `agent/request` retornando uma tripla provider/model/effort de substituição. Os
  escalares de amostragem já escolhidos pela sessão (`temperature`, `maxTokens`,
  `stop`) são preservados.
- **Passagem para o modo plano** — uma instrução complexa entra em modo plano no
  nível strong; ao sair, volta ao nível cheap para implementar.
- **Guard de alto risco** — durante a execução cheap, comandos destrutivos
  (`rm -rf`, `sudo`, `mkfs`, `git push --force`, escrita de arquivos de
  credenciais, …) são negados com uma mensagem corretiva pedindo escalonamento.
- **Escalonamento por falhas** — falhas repetidas (opcionalmente com a mesma
  assinatura) elevam o nível por um TTL; uma falha de modelo/rota percorre a
  cadeia de fallback configurada.
- **Válvulas manuais** — `/tier auto|strong|cheap|off` e as ferramentas
  `tier_status` / `tier_route`. Definir `routingMode: delegated` (ou `/tier off`)
  interrompe o roteamento para uma sessão que precisa manter o próprio modelo.
- **Serviço `ctx.autotier`** — uma superfície de leitura (`status`) mais a
  waterfall de veto `autotier/route` e o evento `autotier/tier-changed`, para que
  outros plugins observem ou anulem uma decisão.

## Início rápido

```sh
dsh plugin --profile web add github:PerryLink/dsh-autotier
```

```bash
npm i -g dsh1024
dsh1024 plugin --profile web add dsh-autotier
```

Depois inicie (ou reinicie) o harness. A linha é acrescentada ao seu
`cordis.patch.yml`; o roteamento começa no próximo turno.

### Exemplos

São os pontos de entrada reais; instale e chame um.

#### Exemplo detalhado

**Comando**

~~~sh
tier_route
~~~

**Entrada**

~~~json
{ "text": "Plan the migration of the storage layer end to end" }
~~~

**Saída**

~~~text
{
  "tier": "strong",
  "scenario": "planning",
  "confidence": 0.97,
  "fingerprint": "planning|0|0",
  "reason": "explicit planning intent"
}
~~~

*Observado em `README.md:248 (Tools & surfaces); tests/tools.spec.ts:96-109; src/tools.ts:80`*

#### Ramo de falha

**Entrada**

~~~text
resolveConfig({ tiers: { cheap: { provider: 'deepseek-official', model: 'deepseek-v4-pro', effort: 'high', followSession: false } } })
~~~

**Saída**

~~~text
Error: dsh-autotier: config.tiers strong and cheap resolve to the same landing (deepseek-official/deepseek-v4-pro@high); tiering would be a no-op
~~~

*Observado em `plugins/dsh-autotier/src/config.ts:377-386; plugins/dsh-autotier/tests/config.spec.ts:87-92; plugins/dsh-autotier/README.md:208-209`*

#### Exemplos breves

- `tier_status`
- `tier_route`

## Configuração

Cada chave é validada na carga; um valor inválido falha ruidosamente em vez de
desativar o roteamento em silêncio. O `cordis.patch.yml` deste repositório
documenta as mesmas chaves em linha.

| Chave | Padrão | Significado |
|---|---|---|
| `tiers.strong.provider` | `deepseek-official` | Provider do nível de planejamento/revisão. |
| `tiers.strong.model` | `deepseek-v4-pro` | Id de catálogo do modelo strong. |
| `tiers.strong.effort` | `high` | Vocabulário do adaptador `off` \| `low` \| `high` \| `max`. |
| `tiers.strong.followSession` | `false` | `false` = o effort deste nível substitui o da sessão. |
| `tiers.strong.fallback` | `[]` | Aterrissagens provider/model ordenadas se o nível estiver indisponível. |
| `tiers.cheap.provider` | `deepseek-official` | Provider do nível de implementação. |
| `tiers.cheap.model` | `deepseek-flash` | Id de catálogo do modelo cheap. |
| `tiers.cheap.effort` | `low` | Vocabulário do adaptador `off` \| `low` \| `high` \| `max`. |
| `tiers.cheap.followSession` | `true` | `true` = herda o effort da sessão e a escolha explícita vence. |
| `tiers.cheap.fallback` | `[]` | Aterrissagens provider/model ordenadas se o nível estiver indisponível. |
| `tiers.vision.provider` | `deepseek-official` | Provider para turnos com imagens. |
| `tiers.vision.model` | `deepseek-flash` | O único modelo do catálogo com modalidade de imagem. |
| `intent.ruleThreshold` | `0.7` | Confiança a partir da qual a camada de regras decide sozinha. |
| `intent.attemptBand.enabled` | `false` | Começar a faixa média no cheap e escalar ao primeiro sinal. |
| `intent.attemptBand.tauLow` | `0.45` | Limite inferior da faixa attempt-first. |
| `intent.hysteresis.toStrong` | `0.8` | Pontuação que muda um turno cheap para strong. |
| `intent.hysteresis.toCheap` | `0.6` | Pontuação abaixo da qual um turno strong volta para cheap. |
| `intent.rules` | `[]` | Tabela declarativa de regras (`when.patterns` / `when.tools` / `when.cwd`, `tier`, `priority`). |
| `intent.judge.enabled` | `true` | Permitir o juiz de baixa confiança. |
| `intent.judge.model` | `''` | Id do modelo juiz; vazio = primeiro modelo do catálogo que contenha `flash`. |
| `intent.judge.temperature` | `0` | Temperatura de amostragem do juiz. |
| `intent.judge.maxTokens` | `16` | Limite de saída do juiz (responde com uma palavra). |
| `intent.judge.cooldownMs` | `30000` | Intervalo mínimo entre duas chamadas ao juiz. |
| `intent.judge.timeoutMs` | `2000` | Tempo limite da chamada ao juiz. |
| `intent.judge.unavailableSkip` | `2` | Falhas consecutivas após as quais o turno omite o juiz. |
| `intent.scenarios` | todos `true` | Interruptores por cenário: `coding`, `review`, `planning`, `retrieval`, `batch`, `daily`, `longText`, `multimodal`. |
| `intent.costMode` | `balanced` | Arbitragem na ambiguidade: `cost-first` \| `quality-first` \| `balanced`. |
| `guard.enabled` | `true` | Ativar o guard determinístico de alto risco. |
| `guard.tiers` | `[cheap]` | Níveis que o guard protege. |
| `guard.whitelist` | `[]` | Comandos, ferramentas ou prefixos de caminho que nunca disparam o guard. |
| `guard.protectedPaths` | `['.dsh','AGENTS.md','package.json','.github/workflows']` | Superfícies de automodificação que forçam revisão strong. |
| `guard.interopDefend` | `auto` | Relação com o `dsh-defend`: `auto` audita a convivência, `none` fica silencioso. |
| `escalation.threshold` | `2` | Falhas dentro da janela que elevam o nível. |
| `escalation.windowMs` | `60000` | Janela de contagem de falhas. |
| `escalation.ttlMs` | `180000` | Quanto tempo um escalonamento permanece. |
| `escalation.fallbackTtlMs` | `300000` | TTL usado após tomar uma aterrissagem de fallback. |
| `escalation.signature` | `true` | Contar recorrências da mesma assinatura em vez de cada falha. |
| `routingMode` | `auto` | `auto` \| `strong` \| `cheap` \| `delegated` \| `off`. |

Todas as chaves também podem ser editadas a quente pelo cartão do plugin na
página Plugins: o Host valida o valor novo contra o schema e o confirma com
`loader/volatile-update`, e este plugin então rejulga a configuração inteira com
o mesmo juiz de campos cruzados que usa na montagem. Um valor que viole um
requisito cruzado (dois tiers caindo na mesma rota, um par de histerese que não
freia o piscar, uma regra sem pattern nem tool) deixa a última política válida
roteando em vez de instalar algo inroteável.

`routingMode` é a única chave que **não** é a quente: é o padrão da composição, e
o interruptor em tempo de execução é a sobreposição por sessão escrita por
`/tier`, pela pílula do compositor e pelo seletor do cartão. Torná-la a quente
também daria a um mesmo comportamento dois donos.

## Ferramentas e superfícies

| Superfície | Tipo | Propósito |
|---|---|---|
| `/tier` | comando | `auto` \| `strong` \| `cheap` \| `off` \| `status`; substituição por sessão. |
| `tier_status` | ferramenta | Nível atual, modo, TTL de escalonamento e estado do guard. |
| `tier_route` | ferramenta | Roteia uma intenção a seco, sem enviar requisição. |
| `ctx.autotier` | serviço | Superfície `status()` para outros plugins. |
| `autotier/route` | evento serial | Terceiros podem vetar o nível proposto. |
| `autotier/tier-changed` | evento emit | Observabilidade quando o nível efetivo muda. |

## Permissões e dados

- **Arquivos** — o plugin não lê nenhum arquivo nem escreve nenhum. A
  configuração é do Host: um valor salvo na página Plugins é persistido pelo Host
  no patch do perfil ativo, e este plugin apenas lê o snapshot vivo que recebe.
- **Rede** — o único tráfego de saída é a chamada ao juiz, que passa pelo caminho
  normal de `ctx.llm` e pelo provider configurado.
- **Log de sessão** — o plugin não anexa eventos de sessão próprios. O rastro de
  roteamento é o logger do plugin mais o evento vivo `autotier/tier-changed`; a
  única anexação é o `plan/mode` de reserva quando o serviço de modo plano não
  está disponível. Tipos de evento próprios são fail-closed a partir de
  `0.1.2-alpha.1`, então nenhum registro durável do plugin é escrito.
- **Segredos** — este plugin não lê, registra nem armazena credenciais.

## Limites de segurança

- O guard é **defesa em profundidade**, não uma sandbox. Ele nega os padrões que
  conhece no nível cheap e nunca enfraquece o `dsh-defend`, o serviço de aprovação
  ou a política de sandbox. Mantenha-os ativos.
- O guard protege apenas os níveis de `guard.tiers` (cheap por padrão). Um turno
  strong não é bloqueado por design: o modelo strong é o revisor.
- Se o próprio guard lançar, a chamada é escalada para strong em vez de permitida —
  um guard quebrado não deve virar uma porta aberta.
- `/tier off` desativa o roteamento por completo; o harness se comporta exatamente
  como antes da instalação.

## Limitações conhecidas

- A camada de regras é determinística e portanto finita: uma frase nova para um
  pedido complexo pode começar no cheap e escalar só após uma falha ou negação do
  guard. A chamada ao juiz cobre o meio de baixa confiança.
- O escalonamento é por agente e em memória; um reinício do harness volta a `auto`.
- Trocar de nível reinicia o cache de prompt do provider para aquela requisição,
  então sessões muito ativas podem ver um pequeno custo de falha de cache no turno
  da troca; os limites de histerese existem para tornar isso raro.
- O plugin roteia requisições de conversa. Compactação e geração de título são
  seams separados do host; alinhe as configurações de modelo deles com o nível
  cheap para o mesmo perfil de custo (`docs/supporting-lanes.md`).
- `followSession: true` no nível cheap significa que uma escolha explícita de
  modelo na sessão vence; nesse caso o nível cheap não pode impor o seu.
- **O cartão de Settings e a pílula do compositor chegaram na 0.2.0.** O cartão
  (modo de roteamento, aterrissagens de nível, catálogo de modelos) fica na seção
  Plugins e a pílula cicla o modo da sessão pelo compositor.
- **Um modelo escolhido na GUI não é detectado automaticamente.** Use
  `routingMode: delegated` ou `/tier off` para interromper o roteamento.
- **As posteriores por impressão digital ficam em memória** e reiniciam a cada
  reinício.
- **A faixa intermediária attempt-first vem desativada** até o corpus de
  calibração existir (v0.2).

## Desenvolvimento

```bash
pnpm install
pnpm run typecheck      # contra as faces de tipo do checkout local do harness
pnpm run typecheck:ci   # contra as faces publicadas 0.1.7-rc.2 (o que a CI executa)
pnpm test
pnpm run build
pnpm run verify:self-contained
pnpm run verify:artifacts
pnpm pack
```

`pnpm run build` emite `lib/types` (declarações tsc) e `lib/index.js` (bundle
tsdown). Os testes usam diretamente os pacotes host publicados — `Context` real,
serviços reais de session/tools/commands/settings — mais uma composição real do
Loader sobre um `cordis.yml` temporário.

## Tópicos

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `router`,
`model-tier`, `cost`, `auto`.

## Contribuidores

PerryLink. Issues e pull requests em
<https://github.com/PerryLink/dsh-autotier/issues>.

## Licença

Apache-2.0. Veja [LICENSE](./LICENSE) e
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## Interoperabilidade com outros plugins do DSH

Verificado contra **DSH `0.2.0-rc.2`** (o runtime para o qual este README é publicado) e o conjunto de plugins com mais estrelas pesquisado em 2026-10-05.

Este plugin **não interfere** em outros plugins, incluindo os de mais estrelas:

- **Sem colisão de nome de ferramenta.** Todas as ferramentas têm namespace; nenhuma ocupa um nome puro já pertencente a uma ferramenta embutida ou a outro plugin.
- **Sem colisão de chave de serviço.** Fornece apenas `autotier`; essa chave não é uma costura embutida nem é fornecida por nenhum plugin de mais estrelas.
- **Sem colisão de slot.** Não registra nenhuma chave de slot de cliente, então não disputa um assento `shadows-shipped-ui`.
- **Sem colisão de rota HTTP.** Não registra nenhum prefixo `webServer`.
- **Sem colisão na camada de patch.** O patch do bundle apenas faz `insert` da própria linha; nunca sobrescreve o `config` de uma linha embutida.
- **Sem mutação global.** Não altera protótipos, não reescreve `process.env` nem substitui o dispatcher global de fetch.

**Listeners de eventos compartilhados não interferem por construção.** Observa os eventos sensíveis à ordem `agent/created`, `agent/request`, `agent/request-error`, `tools/pre-execute` com `ctx.on()` — o registro de difusão do Cordis, onde cada listener executa e nenhum pode privar outro do turno. **Todos os listeners aqui delegam via `next()`**, então a cadeia nunca é curto-circuitada:
  - `agent/request` — also used by `dsh-agent-teams` (1923★), which short-circuits by throwing without calling `next()`.
  - `tools/pre-execute` — also used by `cc-safety-net` (1576★).

Evidência estática: `dsh-plugin-doctor` K10–K13 retornam `pass` em todas as verificações deste repositório.

## PerryLink DSH Plugin Family

Este projeto faz parte da família de plugins do DeepSeek Harness da [PerryLink](https://github.com/PerryLink). O registro fica recolhido abaixo para que cada README mantenha uma primeira tela curta; expanda para ver cada linha e seu status.

<details>
<summary>Expandir todos os plugins</summary>

| Plugin | Status |
|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** |  |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** |  |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** |  |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** |  |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** |  |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** |  |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** |  |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** |  |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 RETIRADO — ver o README do repositório |

</details>

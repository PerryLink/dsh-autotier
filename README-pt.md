# dsh-autotier

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

![Demonstração de terminal do dsh-autotier: dsh-autotier — install, then the documented tier defaults behind /tier](https://raw.githubusercontent.com/PerryLink/dsh-autotier/main/docs/assets/dsh-autotier-hero.png)

![Animated terminal demo of dsh-autotier](https://raw.githubusercontent.com/PerryLink/dsh-autotier/main/docs/assets/dsh-autotier-demo.gif)

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

Este projeto é um dos **87 plugins ativamente mantidos** do DeepSeek Harness da [PerryLink](https://github.com/PerryLink). O registro da família tem **95** plugins — **5 congelados**, **3 retirados** — e fica recolhido abaixo para que cada README mantenha uma primeira tela curta. Expanda para ver cada linha, com o motivo na coluna Status.

<details>
<summary>Expandir os 95 plugins</summary>

| Plugin | Uma linha | Status |
|---|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** | 水产养殖投入品记录核对（按投入品用量、休药期与起捕间隔核对记录自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** | 档案归档完整性与保管期限核对（依据《档案法》及配套规定，仅提示差异，不作出定性结论） |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command |  |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** | 投标文件符合性预检（按招标文件逐条核对响应情况，仅提示差异，不作出定性结论） |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** | 投标人资格条件核对（按资格条件与证明材料核对逐条响应，仅提示差异，不作出定性结论） |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore |  |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** | 合同条款立场台账核对（按立场、风险等级与退让底线核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** | 报关单证一致性核对（按公开的报关单填制规范核对单证间字段一致性，仅提示差异，不作出定性结论） |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) |  |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** | 滞箱费台账核对（按免箱期与费率核对超期天数与金额的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review |  |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** | 应急演练脚本核对（按阶段、响应分级、指挥与资源要素核对脚本齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** | 环评导则适用性核对（按要素、导则名称与执行标准核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** | 应急预案要素齐备性与条款级页码定位（依据 GB/T 29639-2020 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** | 作文量表评分核对（按评分项、原文定位与分值算术核对评分自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** | 证据清单齐备性核对（按待证事实与证据要素核对清单自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** | 出口管制物项核对（按管制清单、最终用途与许可证核对台账齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** | FMEA 分析表要素齐备性与风险顺序数一致性核对（按公开的 FMEA 方法标准核对表内自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** | 预测准确率考核核对（按准确率、门槛与考核单价核对考核费用的算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** | 公文流转与办理时限核对（按公开的公文处理规范核对环节完整性与时限，仅提示差异，不作出定性结论） |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** | 公文格式要素核对（按公开的党政机关公文格式标准核对版头与主体要素，仅提示差异，不作出定性结论） |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** | 劳动保护与安全防护用品配置表核对（按公开的配备标准核对品名规格与配置数量，仅提示差异，不作出定性结论） |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** | 危险化学品临界量与重大危险源辨识核对（按储存量与临界量核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** | HAZOP 分析表要素齐备性与偏差推导一致性核对（依据公开的危险与可操作性分析标准，仅提示差异，不作出定性结论） |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** | 安全隐患台账→《工贸企业重大事故隐患判定标准》（应急管理部令第10号）条款映射提示（仅提示差异，不作出定性结论） |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** | 商品归类层级一致性核对（按章、品目、子目与商品编号的层级关系核对自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** | ICD 合并编码与星剑号配对提示（依据 GB/T 14396-2016 与公开的 ICD 使用说明，仅提示差异，不作出定性结论） |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** | 法条引用与文书要素核对（按名称、条号、原文与效力状态核对引用可核验性，仅提示差异，不作出定性结论） |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** | 信用证单据条款核对（按单据种类、份数、期限与不符点核对交单自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** | 能力差距与培养计划核对（按能力等级差、培养措施与完成期限核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base for DeepSeek Harness. |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** | 病案首页形式质控与逻辑矛盾提示（依据国卫办医发〔2016〕24号等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** | 国家自然科学基金申请书形式审查与匿名化提示（依据《国家自然科学基金条例》与申请人导入的当年指南，仅提示差异，不作出定性结论） |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** | 护理记录时限、签名与评估表完整性校验（依据《病历书写基本规范》等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** | 原产地区域价值成分核对（按 RVC 定义式与门槛核对原产地判定自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** | 在线点评回复台账核对（按回复时限、问题分类与整改状态核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** | 试卷解析结构核对（按题型、答案、分值与 yotta 标识核对试卷结构自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** | 行政许可办理核对（按申请材料、法定时限与决定记录核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** | 项目全流程文件链条核对（按环节先后与金额口径核对链条自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** | 起诉状要素齐备性核对（按诉请、事实、证据、法条四要素核对文书齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** | 政策专报要素核对（按观点、依据、出处与建议核对专报齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** | 线损电量拆分与考核表核对（依据公开的线损计算口径，仅提示差异，不作出定性结论） |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** | 电力工作票要素齐备性与签发许可顺序核对（依据现行电力安全工作规程，仅提示差异，不作出定性结论） |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** | PPAP 提交要素齐备性核对（按公开的 PPAP 手册与提交等级核对要素齐备与版本填写，仅提示差异，不作出定性结论） |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** | 质疑与投诉期限核对（按公开的政府采购质疑投诉规定核对期限与台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** | 铁路施工天窗台账核对（按时间窗、时长算术与命令号核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** | 维修工单结算核对（按项目金额、配件工时合计与结算总额核对算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** | 审稿意见逐条回应覆盖核对（按意见与回应一一对应核对覆盖完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** | 规则库文件自检核对（按条款引用纪律与效力上限核对规则库自身合规，仅提示差异，不作出定性结论） |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** | 安全技术交底记录要素齐备性与签字闭环核对（依据公开的安全生产法规与检查标准，仅提示差异，不作出定性结论） |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. |  |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** | 监理日志跨日连续性与旁站覆盖提示（依据 GB/T 50319-2013 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** | 三重一大决策台账核对（按前置研究、会议审议与决议记录核对程序留痕，仅提示差异，不作出定性结论） |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** | 土壤与地下水监测台账核对（按点位、监测项目、限值与超标判定核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** | 作业规程与 FMEA／控制计划一致性核对（按编号与版本核对三份文件是否同步，仅提示差异，不作出定性结论） |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** | 控制图常数与过程能力指数核对（按 GB/T 4091 的常规控制图常数表核对控制限与 Cp/Cpk 的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. |  |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** | 招标文件条款摘录核对（按出处与原文逐字核对摘录完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** | 评标因素评分矩阵核对（按分值上限与合计核对矩阵自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** | 质保期与索赔金额核对（按质保期月数与里程、索赔金额算式核对自洽，仅提示差异，不作出定性结论） |  |

</details>

</details>

</details>
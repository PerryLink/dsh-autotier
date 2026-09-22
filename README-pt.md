# dsh-autotier

[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-autotier)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-autotier.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19.0%20%7C%7C%20%3E%3D24.0.0-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-autotier/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-autotier/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-autotier?label=version)](https://github.com/PerryLink/dsh-autotier/releases)

[English](README.md) | [简体中文](README-zh.md) | [Español](README-es.md) | **Português** | [हिन्दी](README-hi.md)

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

## Compatibilidade

| Harness | Estado |
|---|---|
| `@deepseek-ai/dsh` `0.1.2-rc.1` | não é mais suportada; essa linha é anterior ao contrato `SettingsForms` que o plugin agora mira |
| `@deepseek-ai/dsh` `0.1.5-rc.2` | não é mais suportada; o contrato `settings.register` / `settings/updated` que ela expõe foi removido a montante |
| `@deepseek-ai/dsh` `0.1.6-alpha.2` | não é mais suportada; a mesma remoção, primeira linha com `SettingsForms` |
| `@deepseek-ai/dsh` `0.1.7-alpha.1` | **obrigatória**; verificada contra o checkout correspondente (`typecheck`) e os pacotes publicados (`typecheck:ci`, 214 testes) |
| `@deepseek-ai/cordis` `^4.0.3`, `@deepseek-ai/cosmokit` `^1.8.4`, `@deepseek-ai/schemastery` `^3.18.3` | base de peers |

Os ranges de peers nomeiam as quatro linhas publicadas (`>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0 || >=0.1.6-0 <0.2.0 || >=0.1.7-0 <0.2.0`), porque um range cujo único comparador de prerelease
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

```bash
npm i -g dsh1024
dsh1024 plugin --profile web add dsh-autotier
```

Depois inicie (ou reinicie) o harness. A linha é acrescentada ao seu
`cordis.patch.yml`; o roteamento começa no próximo turno.

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
pnpm run typecheck:ci   # contra as faces publicadas 0.1.7-alpha.1 (o que a CI executa)
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

## Família de plugins DSH da PerryLink

Este projeto é um dos [42 plugins de DeepSeek Harness](https://github.com/PerryLink) mantidos por [PerryLink](https://github.com/PerryLink). Se este ajuda você, os outros provavelmente também:

| Plugin | One-liner |
|---|---|
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default | |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | |
| **[dsh-catalog](https://github.com/PerryLink/dsh-catalog)** | DSH Desktop Market standard catalog source for the PerryLink family | |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence | |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Unified session + workspace + config checkpoints with one-shot `/rewind` | |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code, Codex, OpenCode and Hermes sessions, memories and skills into DSH | |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. | |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search | |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Deterministic dataset profiling, cleaning and citation verification | |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review | |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics: load, spill, compaction and cache hit rate | |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Chinese mutual-fund research with sealed, traceable source snapshots | |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issue/CI integration with every write approval-gated | |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry and company research pack: chain map, policy timeline, company cards | |
| **[dsh-kit](https://github.com/PerryLink/dsh-kit)** | One-command starter pack that installs the core family | |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base with hybrid search and citation-aware injection | |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local Ollama model discovery and task-based routing with cloud fallback | |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions, symbols and rename | |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking at the model boundary with a host-side restore table | |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | MCP management console: `/mcp` command, Settings tab and trial calls | |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory protocol (`ctx.memory` + SQLite) | |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse telemetry export from the session event stream | |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Runtime-switchable model output styles | |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Declarative allow/deny/ask rules plus a process-level network policy | |
| **[dsh-plugin-certification](https://github.com/PerryLink/dsh-plugin-certification)** | Community certification registry with repro-checkable grades and badges | |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins | |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-dev knowledge base, agent skill and the `dsh-plugin-dev` CLI toolchain | |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins | |
| **[dsh-plugin-portal](https://github.com/PerryLink/dsh-plugin-portal)** | Zero-dependency static portal rendering the whole plugin family as one page | |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat, Telegram, Feishu + a session console | |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research reports: evidence ledger, manifest seal, per-claim verdicts | |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional plugin quality scoring with an evidence-backed leaderboard | |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions and workspaces in the Web sidebar with per-pin colors | |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Git-backed cross-device session synchronization with keep-both merges | |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack plus the `plugin_vet` supply-chain gate | |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop: speech-to-text input and text-to-speech replies | |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives with a pass/fail matrix | |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel plus eleven agent tools | |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair | |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools | |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card | |

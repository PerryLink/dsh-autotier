# dsh-autotier

[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-autotier)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-autotier.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![Node](https://img.shields.io/badge/node-%5E22.19.0%20%7C%7C%20%3E%3D24.0.0-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-autotier/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-autotier/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-autotier?label=version)](https://github.com/PerryLink/dsh-autotier/releases)

[English](README.md) | [简体中文](README-zh.md) | **Español** | [Português](README-pt.md) | [हिन्दी](README-hi.md)

Enrutamiento automático por niveles de modelo para DeepSeek Harness: entra una
instrucción del usuario y sale una decisión de nivel — sin cambiar de modelo a
mano.

La intención compleja (arquitectura, planificación, depuración, ingeniería de
varios pasos) se planifica en el nivel **strong** y luego se implementa en el
nivel **cheap**. La intención simple (preguntas, recuperación, tareas por lotes,
trabajo diario) se diseña e implementa directamente en el nivel **cheap**.
Mientras el nivel cheap ejecuta, las llamadas de herramienta de alto riesgo son
denegadas por un guard determinista, y los fallos repetidos escalan al nivel
strong con un TTL de retorno.

- **Repositorio oficial**: <https://github.com/PerryLink/dsh-autotier>
- **npm**: `dsh-autotier` (nombre simple, sin scope)

## Compatibilidad

| Harness | Estado |
|---|---|
| `@deepseek-ai/dsh` `0.1.2-rc.1` | compatible; el flujo compat instala esta línea de extremo a extremo |
| `@deepseek-ai/dsh` `0.1.5-rc.2` | compatible; verificada de extremo a extremo (perfil real, fila en `--dump-config`, smoke keyless) y en la matriz compat |
| `@deepseek-ai/cordis` `^4.0.2`, `@deepseek-ai/schemastery` `^3.18.2` | base de peers |

Los rangos de peers nombran ambas líneas publicadas (`>=0.1.2-rc.1 <0.2.0 ||
>=0.1.5-alpha.1 <0.2.0`), porque un rango cuyo único comparador de prerelease
está en una tupla anterior no admite un alpha posterior. Se refrescan por ola.

El plugin vive solo en el plano host y no necesita un preset propio: la fila host
se aplica a todas las sesiones. Una sección de prompt en *tu* preset es opcional
y solo hace visibles las decisiones al modelo (véase [Instalación y desinstalación](#instalación-y-desinstalación)).

## Qué obtienes

- **Puerta de intención** — cada turno se clasifica con señales deterministas
  (texto del mensaje, nombres de herramientas, presencia de imágenes, longitud de
  la conversación). La capa de reglas decide sin gastar tokens cuando tiene
  confianza; solo un turno de baja confianza llama al modelo juez barato, y
  nunca dentro del cooldown.
- **Aterrizaje en el seam oficial** — la decisión se aplica en la waterfall
  `agent/request` devolviendo una terna provider/model/effort de reemplazo. Los
  escalares de muestreo ya elegidos por la sesión (`temperature`, `maxTokens`,
  `stop`) se conservan.
- **Traspaso a modo plan** — una instrucción compleja entra en modo plan en el
  nivel strong; al salir vuelve al nivel cheap para implementar.
- **Guard de alto riesgo** — durante la ejecución cheap, los comandos
  destructivos (`rm -rf`, `sudo`, `mkfs`, `git push --force`, escritura de
  ficheros de credenciales, …) se deniegan con un mensaje correctivo que pide
  escalar.
- **Escalado por fallos** — los fallos repetidos (opcionalmente con la misma
  firma) elevan el nivel durante un TTL; un fallo de modelo/ruta recorre la
  cadena de fallback configurada.
- **Válvulas manuales** — `/tier auto|strong|cheap|off` y las herramientas
  `tier_status` / `tier_route`. Ajustar `routingMode: delegated` (o `/tier off`)
  detiene el enrutamiento para una sesión que debe conservar su propio modelo.
- **Servicio `ctx.autotier`** — una superficie de lectura (`status`) más la
  waterfall de veto `autotier/route` y el evento `autotier/tier-changed`, para
  que otros plugins observen o anulen una decisión.

## Inicio rápido

```bash
npm i -g dsh1024
dsh1024 plugin --profile web add dsh-autotier
```

Luego inicia (o reinicia) el harness. La fila se añade a tu
`cordis.patch.yml`; el enrutamiento empieza en el siguiente turno.

## Instalación y desinstalación

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

**Sección de prompt opcional en el preset.** El router funciona sin ella. Para
que el modelo sepa en qué nivel corre, añade una fila a *tu* preset
(`docs/preset-row.md` tiene el bloque exacto):

```yaml
- insert:
    - id: autotier-prompt
      name: '@deepseek-ai/dsh-system-prompt'
      # sections: [...]  — véase docs/preset-row.md
```

**Desinstalación**

```bash
dsh plugin --profile web remove dsh-autotier
```

La fila, su namespace de settings, su comando, sus herramientas y sus listeners
se eliminan con el plugin; no se escribe nada fuera del documento de settings.

## Configuración

Cada clave se valida al cargar; un valor inválido falla de forma ruidosa en vez
de desactivar el enrutamiento en silencio. El `cordis.patch.yml` de este
repositorio documenta las mismas claves en línea.

| Clave | Por defecto | Significado |
|---|---|---|
| `tiers.strong.provider` | `deepseek-official` | Provider del nivel de planificación/revisión. |
| `tiers.strong.model` | `deepseek-v4-pro` | Id de catálogo del modelo strong. |
| `tiers.strong.effort` | `high` | Vocabulario del adaptador `off` \| `low` \| `high` \| `max`. |
| `tiers.strong.followSession` | `false` | `false` = el effort de este nivel anula el de la sesión. |
| `tiers.strong.fallback` | `[]` | Aterrizajes provider/model ordenados si el nivel no está disponible. |
| `tiers.cheap.provider` | `deepseek-official` | Provider del nivel de implementación. |
| `tiers.cheap.model` | `deepseek-v4-flash` | Id de catálogo del modelo cheap. |
| `tiers.cheap.effort` | `low` | Vocabulario del adaptador `off` \| `low` \| `high` \| `max`. |
| `tiers.cheap.followSession` | `true` | `true` = hereda el effort de la sesión y gana la elección explícita. |
| `tiers.cheap.fallback` | `[]` | Aterrizajes provider/model ordenados si el nivel no está disponible. |
| `tiers.vision.provider` | `deepseek-official` | Provider para turnos con imágenes. |
| `tiers.vision.model` | `deepseek-v4-flash-vision-exp` | El único modelo del catálogo con modalidad de imagen. |
| `intent.ruleThreshold` | `0.7` | Confianza a partir de la cual la capa de reglas decide sola. |
| `intent.attemptBand.enabled` | `false` | Empezar la banda media en cheap y escalar ante una señal. |
| `intent.attemptBand.tauLow` | `0.45` | Límite inferior de la banda attempt-first. |
| `intent.hysteresis.toStrong` | `0.8` | Puntuación que cambia un turno cheap a strong. |
| `intent.hysteresis.toCheap` | `0.6` | Puntuación por debajo de la cual un turno strong vuelve a cheap. |
| `intent.rules` | `[]` | Tabla declarativa de reglas (`when.patterns` / `when.tools` / `when.cwd`, `tier`, `priority`). |
| `intent.judge.enabled` | `true` | Permitir el juez de baja confianza. |
| `intent.judge.model` | `''` | Id del modelo juez; vacío = primer modelo del catálogo que contenga `flash`. |
| `intent.judge.temperature` | `0` | Temperatura de muestreo del juez. |
| `intent.judge.maxTokens` | `16` | Límite de salida del juez (responde con una palabra). |
| `intent.judge.cooldownMs` | `30000` | Separación mínima entre dos llamadas al juez. |
| `intent.judge.timeoutMs` | `2000` | Tiempo límite de la llamada al juez. |
| `intent.judge.unavailableSkip` | `2` | Fallos consecutivos tras los que el turno omite al juez. |
| `intent.scenarios` | todos `true` | Interruptores por escenario: `coding`, `review`, `planning`, `retrieval`, `batch`, `daily`, `longText`, `multimodal`. |
| `intent.costMode` | `balanced` | Arbitraje en la ambigüedad: `cost-first` \| `quality-first` \| `balanced`. |
| `guard.enabled` | `true` | Activar el guard determinista de alto riesgo. |
| `guard.tiers` | `[cheap]` | Niveles que el guard protege. |
| `guard.whitelist` | `[]` | Comandos, herramientas o prefijos de ruta que nunca disparan el guard. |
| `guard.protectedPaths` | `['.dsh','AGENTS.md','package.json','.github/workflows']` | Superficies de automodificación que fuerzan revisión strong. |
| `guard.interopDefend` | `auto` | Relación con `dsh-defend`: `auto` audita la convivencia, `none` calla. |
| `escalation.threshold` | `2` | Fallos dentro de la ventana que elevan el nivel. |
| `escalation.windowMs` | `60000` | Ventana de conteo de fallos. |
| `escalation.ttlMs` | `180000` | Cuánto dura un escalado. |
| `escalation.fallbackTtlMs` | `300000` | TTL usado tras tomar un aterrizaje de fallback. |
| `escalation.signature` | `true` | Contar recurrencias de la misma firma en vez de cada fallo. |
| `routingMode` | `auto` | `auto` \| `strong` \| `cheap` \| `delegated` \| `off`. |

Todas las claves se pueden editar en caliente desde el namespace de settings
`autotier` (`$DSH_HOME/settings.yaml`); una escritura que viole un requisito
cruzado se rechaza al guardar y la última política válida sigue vigente.

## Herramientas y superficies

| Superficie | Tipo | Propósito |
|---|---|---|
| `/tier` | comando | `auto` \| `strong` \| `cheap` \| `off` \| `status`; anulación por sesión. |
| `tier_status` | herramienta | Nivel actual, modo, TTL de escalado y estado del guard. |
| `tier_route` | herramienta | Enruta una intención en seco, sin enviar petición. |
| `ctx.autotier` | servicio | Superficie `status()` para otros plugins. |
| `autotier/route` | evento serial | Terceros pueden vetar el nivel propuesto. |
| `autotier/tier-changed` | evento emit | Observabilidad cuando cambia el nivel efectivo. |

## Permisos y datos

- **Ficheros** — el plugin no lee ni escribe nada salvo a través del servicio
  compartido de settings (el namespace `autotier`).
- **Red** — el único tráfico saliente es la llamada al juez, que pasa por la ruta
  normal de `ctx.llm` y el provider configurado.
- **Registro de sesión** — el plugin no añade eventos de sesión propios. El rastro
  de enrutamiento es el logger del plugin más el evento vivo
  `autotier/tier-changed`; el único añadido es el `plan/mode` de reserva cuando el
  servicio de modo plan no está disponible. Los tipos de evento propios son
  fail-closed desde `0.1.2-alpha.1`, así que no se escribe ningún registro
  duradero del plugin.
- **Secretos** — este plugin no lee, registra ni almacena credenciales.

## Límites de seguridad

- El guard es **defensa en profundidad**, no una sandbox. Deniega los patrones que
  conoce en el nivel cheap y nunca debilita `dsh-defend`, el servicio de
  aprobación ni la política de sandbox. Mantenlos activos.
- El guard solo protege los niveles de `guard.tiers` (cheap por defecto). Un turno
  strong no se bloquea por diseño: el modelo strong es el revisor.
- Si el guard mismo lanza, la llamada se escala a strong en lugar de permitirse —
  un guard roto no debe convertirse en una puerta abierta.
- `/tier off` desactiva el enrutamiento por completo; el harness se comporta
  exactamente como antes de instalar el plugin.

## Limitaciones conocidas

- La capa de reglas es determinista y por tanto finita: una frase nueva para una
  petición compleja puede empezar en cheap y escalar solo tras un fallo o una
  denegación del guard. La llamada al juez cubre el medio de baja confianza.
- El escalado es por agente y en memoria; un reinicio del harness vuelve a `auto`.
- Cambiar de nivel reinicia la caché de prompt del provider para esa petición, así
  que las sesiones muy activas pueden ver un pequeño coste de fallo de caché en el
  turno de cambio; los umbrales de histéresis existen para que eso sea raro.
- El plugin enruta peticiones de conversación. La compactación y la generación de
  títulos son seams separados del host; alinea sus propios ajustes de modelo con
  el nivel cheap si quieres el mismo perfil de coste (`docs/supporting-lanes.md`).
- `followSession: true` en el nivel cheap significa que una elección explícita de
  modelo en la sesión gana; en ese caso el nivel cheap no puede imponer el suyo.
- **La tarjeta de Settings y la píldora del compositor llegaron en 0.2.0.** La
  tarjeta (modo de enrutamiento, aterrizajes de nivel, catálogo de modelos) vive en
  la sección Plugins y la píldora cicla el modo de la sesión desde el compositor.
- **Un modelo elegido en la GUI no se detecta automáticamente.** Usa
  `routingMode: delegated` o `/tier off` para detener el enrutamiento.
- **Las posteriores por huella viven en memoria** y se reinician al reiniciar.
- **La banda media attempt-first llega desactivada** hasta que exista el corpus
  de calibración (v0.2).

## Desarrollo

```bash
pnpm install
pnpm run typecheck      # contra las caras de tipo del checkout local del harness
pnpm run typecheck:ci   # contra las caras publicadas 0.1.5-rc.2 (lo que ejecuta CI)
pnpm test
pnpm run build
pnpm run verify:self-contained
pnpm run verify:artifacts
pnpm pack
```

`pnpm run build` emite `lib/types` (declaraciones tsc) y `lib/index.js` (bundle
tsdown). Las pruebas usan directamente los paquetes host publicados — `Context`
real, servicios reales de session/tools/commands/settings — más una composición
real del Loader sobre un `cordis.yml` temporal.

## Temas

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `router`,
`model-tier`, `cost`, `auto`.

## Contribuidores

PerryLink. Issues y pull requests en
<https://github.com/PerryLink/dsh-autotier/issues>.

## Licencia

Apache-2.0. Véase [LICENSE](./LICENSE) y
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## Familia de plugins DSH de PerryLink

Este proyecto es uno de los [40 complementos de DeepSeek Harness](https://github.com/PerryLink) mantenidos por [PerryLink](https://github.com/PerryLink). Si este te ayuda, probablemente los demás también:

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
| **[dsh-plugin-upgrade-015](https://github.com/PerryLink/dsh-plugin-upgrade-015)** | Merged `0.1.3-alpha.1` → `0.1.5-rc.1` upgrade corridor card plus a zero-dependency seam scanner | |
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
| **[dsh-wechat](https://github.com/pan17/dsh-wechat)** | WeChat ↔ DSH bridge (Tencent iLink bot) developed with [pan17](https://github.com/pan17/dsh-wechat), who hosts the repo | |
| **[dsh-personal-directive](https://github.com/PerryLink/dsh-personal-directive)** | Personal directive injector with a top-bar toggle (fork of liucai2026/dsh-personal-directive) | |

# dsh-autotier

[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-autotier)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-autotier.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19.0%20%7C%7C%20%3E%3D24.0.0-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-autotier/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-autotier/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-autotier?label=version)](https://github.com/PerryLink/dsh-autotier/releases)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-autotier?metric=downloads&lang=es)](https://dshfind.com/es/plugins/PerryLink/dsh-autotier?ref=badge)

[English](README.md) | [简体中文](README-zh.md) | **Español** | [Português](README-pt.md) | [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-autotier
```


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


**📖 Base de conocimiento del ecosistema** — datos medidos, no marketing: [guía de desarrollo · datos de selección · criterios de mantenimiento](https://perrylink.github.io/dsh-plugin-guide/).

<!-- star-cta -->
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

## ⭐ 如果它帮到了你

Este plugin forma parte de la [familia de plugins DSH](https://github.com/PerryLink) (más de 40, todos Apache-2.0). Si te resulta útil, **dale una estrella**: no desbloquea nada, pero ayuda a que la siguiente persona lo encuentre antes.

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-autotier?

Canal npm

Canal git

![Demostración de terminal de dsh-autotier: dsh-autotier — install, then the documented tier defaults behind /tier](https://raw.githubusercontent.com/PerryLink/dsh-autotier/main/docs/assets/dsh-autotier-hero.png)

![Animated terminal demo of dsh-autotier](https://raw.githubusercontent.com/PerryLink/dsh-autotier/main/docs/assets/dsh-autotier-demo.gif)

*La misma ejecución, animada.*

## Compatibilidad

| Harness | Estado |
|---|---|
| `@deepseek-ai/dsh` `0.1.2-rc.1` | ya no compatible; esa línea es anterior al contrato `SettingsForms` al que apunta ahora el plugin |
| `@deepseek-ai/dsh` `0.1.5-rc.2` | ya no compatible; el contrato `settings.register` / `settings/updated` que expone fue eliminado aguas arriba |
| `@deepseek-ai/dsh` `0.1.6-alpha.2` | ya no compatible; la misma eliminación, primera línea con `SettingsForms` |
| `@deepseek-ai/dsh` `0.1.7-rc.2` | **requerida**; verificada contra el checkout correspondiente (`typecheck`) y los paquetes publicados (`typecheck:ci`, 214 pruebas) |
| `@deepseek-ai/cordis` `^4.0.3`, `@deepseek-ai/cosmokit` `^1.8.4`, `@deepseek-ai/schemastery` `^3.18.3` | base de peers |

Los rangos de peers nombran las cuatro líneas publicadas (`>=0.1.6-0 <0.2.0 || >=0.2.0-0 <0.3.0 || >=0.2.1-0 <0.3.0`), porque un rango cuyo único comparador de prerelease
está en una tupla anterior no admite un alpha posterior. Se refrescan por ola.
El rango declarado es deliberadamente más amplio que el verificado: documenta lo
que acepta el manifiesto, no lo que se ha probado.

**Esta versión es una adaptación rompiente.** El host de la generación `0.1.6`
eliminó la costura de *provider* de settings sobre la que se construyó este
plugin: el paquete `@deepseek-ai/dsh-settings-file` ya no existe,
`ctx.settings` es ahora `SettingsForms` (un proyector schema→formulario, sin
`register`), y `settings/updated` tampoco existe. Ninguna superficie compartida
permite que un plugin observe el documento de ajustes de otro, así que ninguna
versión de este plugin puede soportar ambos contratos a la vez. La configuración
fluye ahora por el mecanismo de configuración volátil del host; el **modo de
enrutado por sesión** —el ajuste que realmente cambia el comportamiento en
tiempo de ejecución— no cambia.

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

```sh
dsh plugin --profile web add github:PerryLink/dsh-autotier
```

```bash
npm i -g dsh1024
dsh1024 plugin --profile web add dsh-autotier
```

Luego inicia (o reinicia) el harness. La fila se añade a tu
`cordis.patch.yml`; el enrutamiento empieza en el siguiente turno.

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
| `tiers.cheap.model` | `deepseek-flash` | Id de catálogo del modelo cheap. |
| `tiers.cheap.effort` | `low` | Vocabulario del adaptador `off` \| `low` \| `high` \| `max`. |
| `tiers.cheap.followSession` | `true` | `true` = hereda el effort de la sesión y gana la elección explícita. |
| `tiers.cheap.fallback` | `[]` | Aterrizajes provider/model ordenados si el nivel no está disponible. |
| `tiers.vision.provider` | `deepseek-official` | Provider para turnos con imágenes. |
| `tiers.vision.model` | `deepseek-flash` | El único modelo del catálogo con modalidad de imagen. |
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

Todas las claves también se pueden editar en caliente desde la tarjeta del
plugin en la página Plugins: el Host valida el valor nuevo contra el schema y lo
confirma con `loader/volatile-update`, y este plugin vuelve a juzgar toda la
configuración con el mismo juez de campos cruzados que usa al montar. Un valor
que viole un requisito cruzado (dos tiers aterrizando en la misma ruta, un par de
histéresis que no frena el parpadeo, una regla sin pattern ni tool) deja la
última política válida enrutando en lugar de instalar algo inenrutable.

`routingMode` es la única clave que **no** es en caliente: es el valor por
defecto de la composición, y el interruptor en tiempo de ejecución es la
anulación por sesión que escriben `/tier`, la píldora del compositor y el
selector de la tarjeta. Hacerla en caliente también daría a un mismo
comportamiento dos dueños.

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

- **Ficheros** — el plugin no lee ningún fichero ni escribe ninguno. La
  configuración es del Host: un valor guardado en la página Plugins lo persiste
  el Host en el parche del perfil activo, y este plugin solo lee la instantánea
  viva que se le entrega.
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
pnpm run typecheck:ci   # contra las caras publicadas 0.1.7-rc.2 (lo que ejecuta CI)
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

## Interoperabilidad con otros plugins de DSH

Verificado contra **DSH `0.2.0-rc.2`** (el runtime para el que se publica este README) y el conjunto de plugins con más estrellas sondeado el 2026-10-05.

Este plugin **no interfiere** con otros plugins, incluidos los de más estrellas:

- **Sin colisión de nombres de herramienta.** Todas las herramientas llevan espacio de nombres; ninguna ocupa un nombre desnudo ya perteneciente a una herramienta incluida u otro plugin.
- **Sin colisión de clave de servicio.** Solo provee `autotier`; esa clave no es una costura incluida ni la provee ningún plugin de más estrellas.
- **Sin colisión de slot.** No registra ninguna clave de slot de cliente, así que no disputa un asiento `shadows-shipped-ui`.
- **Sin colisión de ruta HTTP.** No registra ningún prefijo `webServer`.
- **Sin colisión en la capa de patch.** El patch del bundle solo hace `insert` de su propia fila; nunca sobrescribe el `config` de una fila incluida.
- **Sin mutación global.** No parchea prototipos, ni reescribe `process.env`, ni reemplaza el dispatcher global de fetch.

**Los listeners de eventos compartidos no interfieren por construcción.** Observa los eventos sensibles al orden `agent/created`, `agent/request`, `agent/request-error`, `tools/pre-execute` con `ctx.on()` — el registro de difusión de Cordis, donde cada listener se ejecuta y ninguno puede dejar sin turno a otro. **Todos los listeners aquí delegan por `next()`**, así que la cadena nunca se cortocircuita:
  - `agent/request` — also used by `dsh-agent-teams` (1923★), which short-circuits by throwing without calling `next()`.
  - `tools/pre-execute` — also used by `cc-safety-net` (1576★).

Evidencia estática: `dsh-plugin-doctor` K10–K13 dan `pass` en todas las comprobaciones de este repositorio.

## PerryLink DSH Plugin Family

Este proyecto es uno de los **87 plugins activamente mantenidos** de DeepSeek Harness de [PerryLink](https://github.com/PerryLink). El registro familiar tiene **95** plugins — **5 congelados**, **3 retirados** — y permanece plegado abajo para que cada README conserve una primera pantalla corta. Expándelo para ver cada fila, con el motivo en la columna Estado.

<details>
<summary>Expandir los 95 plugins</summary>

| Plugin | Una línea | Estado |
|---|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** | 水产养殖投入品记录核对（按投入品用量、休药期与起捕间隔核对记录自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** | 档案归档完整性与保管期限核对（依据《档案法》及配套规定，仅提示差异，不作出定性结论） |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command |  |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** | 投标文件符合性预检（按招标文件逐条核对响应情况，仅提示差异，不作出定性结论） |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** | 投标人资格条件核对（按资格条件与证明材料核对逐条响应，仅提示差异，不作出定性结论） |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore |  |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** | 合同条款立场台账核对（按立场、风险等级与退让底线核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** | 报关单证一致性核对（按公开的报关单填制规范核对单证间字段一致性，仅提示差异，不作出定性结论） |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) |  |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** | 滞箱费台账核对（按免箱期与费率核对超期天数与金额的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review |  |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | 🧊 CONGELADO — ver el README del repositorio |
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
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** | 维修工单结算核对（按项目金额、配件工时合计与结算总额核对算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** | 审稿意见逐条回应覆盖核对（按意见与回应一一对应核对覆盖完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** | 规则库文件自检核对（按条款引用纪律与效力上限核对规则库自身合规，仅提示差异，不作出定性结论） |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** | 安全技术交底记录要素齐备性与签字闭环核对（依据公开的安全生产法规与检查标准，仅提示差异，不作出定性结论） |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. |  |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** | 监理日志跨日连续性与旁站覆盖提示（依据 GB/T 50319-2013 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** | 三重一大决策台账核对（按前置研究、会议审议与决议记录核对程序留痕，仅提示差异，不作出定性结论） |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** | 土壤与地下水监测台账核对（按点位、监测项目、限值与超标判定核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** | 作业规程与 FMEA／控制计划一致性核对（按编号与版本核对三份文件是否同步，仅提示差异，不作出定性结论） |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** | 控制图常数与过程能力指数核对（按 GB/T 4091 的常规控制图常数表核对控制限与 Cp/Cpk 的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. |  |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** | 招标文件条款摘录核对（按出处与原文逐字核对摘录完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** | 评标因素评分矩阵核对（按分值上限与合计核对矩阵自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** | 质保期与索赔金额核对（按质保期月数与里程、索赔金额算式核对自洽，仅提示差异，不作出定性结论） |  |

</details>

</details>

</details>
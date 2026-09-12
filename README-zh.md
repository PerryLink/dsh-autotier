# dsh-autotier

[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-autotier)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-autotier.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![Node](https://img.shields.io/badge/node-%5E22.19.0%20%7C%7C%20%3E%3D24.0.0-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-autotier/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-autotier/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-autotier?label=version)](https://github.com/PerryLink/dsh-autotier/releases)

DeepSeek Harness 的自动模型分档路由：一条用户指令进来，一个档位决策出去 ——
无需手动切换模型。

复杂意图（架构、规划、调试、多步工程）先由**强档**规划，再由**弱档**实施；
简单意图（问答、检索、批量杂务、日常）直接由**弱档**设计并实施。弱档执行期间，
高危工具调用会被确定性守卫拦截；连续失败则按 TTL 自动升级到强档。

- **官方仓库**：<https://github.com/PerryLink/dsh-autotier>
- **npm**：`dsh-autotier`（裸名，无 scope）

## 兼容性

| Harness | 状态 |
|---|---|
| `@deepseek-ai/dsh` `0.1.2-rc.1` | 兼容；compat 工作流对该线做端到端安装验证 |
| `@deepseek-ai/dsh` `0.1.5-rc.2` | 兼容；已端到端实测（真实 profile 安装、`--dump-config` 行、keyless headless 冒烟）并纳入 compat 矩阵 |
| `@deepseek-ai/cordis` `^4.0.2`、`@deepseek-ai/schemastery` `^3.18.2` | peer 基线 |

peer 范围显式列出两条已发布线（`>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1
<0.2.0`）——因为仅含较早版本元组预发布比较符的 semver 范围无法接纳更晚的 alpha；
每次发布波同步刷新。

本插件只驻留 host 平面，不需要自带 agent preset：host 行对所有会话生效。
在你的 preset 中加一段提示是可选项，仅用于让模型看见路由决策
（见[安装与卸载](#安装与卸载)）。

## 功能

- **意图门控** —— 每个 turn 都用确定性信号（消息文本、工具名、是否含图、
  对话长度）分类。零 token 的规则层有把握时直接决策；只有低置信 turn 才会调用
  廉价的裁判模型，且受冷却时间约束。
- **落点在官方 seam** —— 决策在 `agent/request` waterfall 上通过返回替换后的
  provider/model/effort 三元组生效；会话已选定的采样标量（`temperature`、
  `maxTokens`、`stop`）保持不变。
- **计划模式交接** —— 复杂指令在强档进入计划模式；退出计划模式后回到弱档实施。
- **高危守卫** —— 弱档执行期间，破坏性命令（`rm -rf`、`sudo`、`mkfs`、
  `git push --force`、写凭据文件等）会被拒绝，并给出"请先升级"的纠正信息。
- **失败升级** —— 连续失败（可按同签名计数）会临时提升档位；模型/链路故障会沿
  配置的回退链换档。
- **手动逃生舱** —— `/tier auto|strong|cheap|off` 与 `tier_status` /
  `tier_route` 工具。设置 `routingMode: delegated`（或 `/tier off`）可为必须保留
  自身模型的会话关闭路由。
- **`ctx.autotier` 服务** —— 精简的只读面（`status`），外加
  `autotier/route` 否决 waterfall 与 `autotier/tier-changed` 事件，便于其他
  插件观察或覆盖决策。

## 快速开始

```bash
npm i -g dsh1024
dsh1024 plugin --profile web add dsh-autotier
```

随后启动（或重启）harness。该行会被追加到你的 profile `cordis.patch.yml`；
下一个 turn 起自动路由，无需其他配置。

## 安装与卸载

**npm 通道**

```bash
npm i -g dsh1024
dsh1024 plugin --profile web add dsh-autotier
```

**git 通道**

```bash
git clone https://github.com/PerryLink/dsh-autotier.git
cd dsh-autotier && pnpm install && pnpm run build
dsh plugin --profile web add .
```

**可选的 preset 提示段**：不加也能工作。若想让模型知道自己跑在哪一档，在
*你自己的* agent preset 中加一行（完整块见 `docs/preset-row.md`）：

```yaml
- insert:
    - id: autotier-prompt
      name: '@deepseek-ai/dsh-system-prompt'
      # sections: [...]  — 见 docs/preset-row.md
```

**卸载**

```bash
dsh plugin --profile web remove dsh-autotier
```

该行、settings 命名空间、命令、工具与全部监听器都随插件移除；除设置文档外
不会在别处留下任何写入。

## 配置

每个键都在加载期校验；非法值会响亮失败，而不是静默关闭路由。本仓
`cordis.patch.yml` 内联注释了同一组键。

| 键 | 默认值 | 含义 |
|---|---|---|
| `tiers.strong.provider` | `deepseek-official` | 规划/复审档的 provider。 |
| `tiers.strong.model` | `deepseek-v4-pro` | 强档模型的目录 id。 |
| `tiers.strong.effort` | `high` | 适配器词表 `off` \| `low` \| `high` \| `max`。 |
| `tiers.strong.followSession` | `false` | `false` = 本档 effort 覆盖会话自身的设置。 |
| `tiers.strong.fallback` | `[]` | 该档不可用时的有序 provider/model 落点。 |
| `tiers.cheap.provider` | `deepseek-official` | 实施档的 provider。 |
| `tiers.cheap.model` | `deepseek-v4-flash` | 弱档模型的目录 id。 |
| `tiers.cheap.effort` | `low` | 适配器词表 `off` \| `low` \| `high` \| `max`。 |
| `tiers.cheap.followSession` | `true` | `true` = 继承会话 effort，让显式选择优先。 |
| `tiers.cheap.fallback` | `[]` | 该档不可用时的有序 provider/model 落点。 |
| `tiers.vision.provider` | `deepseek-official` | 含图 turn 的 provider。 |
| `tiers.vision.model` | `deepseek-v4-flash-vision-exp` | 目录中唯一支持图像模态的模型。 |
| `intent.ruleThreshold` | `0.7` | 规则层可独立决策的置信度下限。 |
| `intent.attemptBand.enabled` | `false` | 中间波段：先跑弱档，出现信号再升级。 |
| `intent.attemptBand.tauLow` | `0.45` | attempt-first 波段的下界。 |
| `intent.hysteresis.toStrong` | `0.8` | 弱档 turn 切到强档的分数。 |
| `intent.hysteresis.toCheap` | `0.6` | 强档 turn 回落到弱档的分数。 |
| `intent.rules` | `[]` | 声明式规则表（`when.patterns` / `when.tools` / `when.cwd`、`tier`、`priority`）。 |
| `intent.judge.enabled` | `true` | 是否允许低置信裁判。 |
| `intent.judge.model` | `''` | 裁判模型 id；空 = 取目录中第一个含 `flash` 的模型。 |
| `intent.judge.temperature` | `0` | 裁判采样温度。 |
| `intent.judge.maxTokens` | `16` | 裁判输出上限（只回答一个词）。 |
| `intent.judge.cooldownMs` | `30000` | 两次裁判调用的最小间隔。 |
| `intent.judge.timeoutMs` | `2000` | 裁判调用超时。 |
| `intent.judge.unavailableSkip` | `2` | 连续失败多少次后本 turn 跳过裁判。 |
| `intent.scenarios` | 全 `true` | 分场景开关：`coding`、`review`、`planning`、`retrieval`、`batch`、`daily`、`longText`、`multimodal`。 |
| `intent.costMode` | `balanced` | 歧义裁决方向：`cost-first` \| `quality-first` \| `balanced`。 |
| `guard.enabled` | `true` | 启用确定性高危守卫。 |
| `guard.tiers` | `[cheap]` | 守卫保护的档位。 |
| `guard.whitelist` | `[]` | 永不触发守卫的命令、工具或路径前缀。 |
| `guard.protectedPaths` | `['.dsh','AGENTS.md','package.json','.github/workflows']` | 触发强档复核的自修改表面。 |
| `guard.interopDefend` | `auto` | 与 `dsh-defend` 的关系：`auto` 审计共存，`none` 保持安静。 |
| `escalation.threshold` | `2` | 窗口内达到该失败数即升级档位。 |
| `escalation.windowMs` | `60000` | 失败计数窗口。 |
| `escalation.ttlMs` | `180000` | 升级保持有效的时长。 |
| `escalation.fallbackTtlMs` | `300000` | 已走回退落点后使用的 TTL。 |
| `escalation.signature` | `true` | 按同签名复发计数，而非统计每次失败。 |
| `routingMode` | `auto` | `auto` \| `strong` \| `cheap` \| `delegated` \| `off`。 |

所有键也可通过 `autotier` settings 命名空间（`$DSH_HOME/settings.yaml`）热改；
违反跨字段约束的写入会在保存期被拒绝，并保留上一份可用策略。

## 工具与表面

| 表面 | 类型 | 用途 |
|---|---|---|
| `/tier` | 命令 | `auto` \| `strong` \| `cheap` \| `off` \| `status`；会话级覆盖。 |
| `tier_status` | 工具 | 当前档位、模式、升级 TTL 与守卫状态。 |
| `tier_route` | 工具 | 对一段意图做干跑路由，不发送请求。 |
| `ctx.autotier` | 服务 | 供其他插件读取的 `status()` 面。 |
| `autotier/route` | serial 事件 | 第三方可否决拟定的档位。 |
| `autotier/tier-changed` | emit 事件 | 生效档位变化时的可观测性事件。 |

## 权限与数据

- **文件** —— 本插件不读文件、不写文件，唯一的写入路径是共享 settings 服务的
  `autotier` 命名空间。
- **网络** —— 唯一的出站流量是裁判调用，走正常的 `ctx.llm` 路径与所配置的
  provider。
- **会话日志** —— 本插件不追加任何自定义会话事件。路由留痕 = 插件 logger 与
  实时 `autotier/tier-changed` 总线事件；唯一的写入是 plan-mode 服务缺失时回退
  追加的 `plan/mode`。`0.1.2-alpha.1` 起自定义事件类型 fail-closed，因此不会留下
  插件自有的持久记录。
- **凭据** —— 本插件不读取、不记录、不存储任何凭据。

## 安全边界

- 守卫是**纵深防御**，不是沙箱。它只拒绝弱档上已知的模式，绝不削弱
  `dsh-defend`、审批服务或 sandbox 策略 —— 请保持它们开启。
- 守卫只保护 `guard.tiers` 列出的档位（默认 cheap）。强档 turn 按设计不被拦截：
  强模型本身就是复核者。
- 守卫自身抛错时，调用会被升级到强档而不是放行 —— 坏掉的守卫不能变成敞开的门。
- `/tier off` 完全关闭路由；harness 的行为与安装本插件之前完全一致。

## 已知限制

- 规则层是确定性的、因而也是有限的：复杂请求若换了说法，可能先落到弱档，只有
  失败或守卫拒绝之后才升级。低置信的中间地带由裁判调用覆盖。
- 升级状态按 agent 保存在内存中；harness 重启后从 `auto` 重新开始。
- 切换档位会重置该请求的 provider 提示缓存，因此极高频会话在切换 turn 可能看到
  少量缓存未命中成本；迟滞阈值的存在就是为了让这件事少见。
- 本插件只路由对话请求。压缩与标题生成是宿主独立的 seam；若想获得同样的成本
  画像，请把它们各自的模型设置对齐到弱档（`docs/supporting-lanes.md`）。
- 弱档 `followSession: true` 意味着会话中显式选择的模型优先；此时弱档无法强制
  使用自己的模型。
- **Settings 卡片与 composer 胶囊已于 0.2.0 交付**。卡片（路由模式、实时档位落点、
  模型目录）位于 Plugins 设置区，胶囊在输入区循环切换会话档位。
- **GUI 里改选模型不会被自动识别**。请用 `routingMode: delegated` 或
  `/tier off` 关闭路由。
- **指纹后验仅存于内存**，重启后重新学习。
- **attempt-first 中间波段默认关闭**，待校准语料落地后（v0.2）开启。

## 开发

```bash
pnpm install
pnpm run typecheck      # 对照本地 harness checkout 的类型面
pnpm run typecheck:ci   # 对照已发布的 0.1.5-rc.2 类型面（CI 实际执行）
pnpm test
pnpm run build
pnpm run verify:self-contained
pnpm run verify:artifacts
pnpm pack
```

`pnpm run build` 产出 `lib/types`（tsc 声明）与 `lib/index.js`（tsdown 打包）。
测试直接使用已发布的宿主包 —— 真实 `Context`、真实 session/tools/commands/
settings 服务 —— 外加一次针对临时 `cordis.yml` 的真实 Loader 组合。

## 主题

`dsh`、`dsh-plugin`、`deepseek-harness`、`deepseek`、`cordis`、`router`、
`model-tier`、`cost`、`auto`。

## 贡献者

PerryLink。欢迎在 <https://github.com/PerryLink/dsh-autotier/issues> 提 issue
或 PR。

## 许可证

Apache-2.0。见 [LICENSE](./LICENSE) 与
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。

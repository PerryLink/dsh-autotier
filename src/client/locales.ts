/**
 * Copy dictionaries for the autotier client surfaces (en + zh, the two locales
 * the shared locale registry ships). Every key must exist in both dictionaries:
 * the typed `register` call checks that at compile time, and the presenter test
 * re-checks it at runtime.
 *
 * @module dsh-autotier/client/locales
 */

// Type-only: brings the augmented module into every program that loads these
// dictionaries (the test program imports this file without any component, and a
// module augmentation cannot resolve its target on its own).
import type {} from '@deepseek-ai/dsh-client-ui-slots'

/** Simplified Chinese dictionary. */
export const zh = {
  tab: '自动分层',
  loading: '正在读取分层状态…',
  pillLoading: '分层…',
  error: '暂时无法读取分层状态。',
  retry: '重试',
  refresh: '刷新',
  mode: '路由模式',
  modeHint: '仅对当前会话生效；插件重载后恢复 cordis.yml 配置。',
  modeAuto: '自动',
  modeStrong: '强模型',
  modeCheap: '轻量模型',
  modeDelegated: '会话指定',
  modeOff: '关闭',
  pillHint: '点击切换当前会话的路由模式',
  escalated: '已升级',
  landings: '分层落点（只读）',
  tierStrong: '强模型层',
  tierCheap: '轻量层',
  tierVision: '视觉层',
  followsSession: '跟随会话推理强度',
  effort: '推理强度',
  catalog: '模型目录',
  catalogHint: '来自当前已注册的服务商与模型，仅供查看。',
  catalogSelect: '选择模型',
  provider: '服务商',
  model: '模型',
  modalities: '输入模态',
  session: '会话状态',
  sessionOverride: '会话覆盖',
  sessionFollow: '跟随配置',
  appliedTier: '最近落点',
  appliedNone: '暂无',
  escalationActive: '失败升级中',
  planActive: '计划模式',
  denials: '守卫拦截',
  source: '来源',
  noSession: '尚未选择会话：先打开一个会话，才能修改会话模式。',
  unknownAgent: '当前会话尚未注册到路由服务，暂时无法修改模式。',
} as const

/** English dictionary (source of truth for keys). */
export const en: Record<keyof typeof zh, string> = {
  tab: 'Autotier',
  loading: 'Loading routing status…',
  pillLoading: 'Tier…',
  error: 'Unable to read the routing status.',
  retry: 'Retry',
  refresh: 'Refresh',
  mode: 'Routing mode',
  modeHint: 'Session-scoped; a plugin reload restores the cordis.yml value.',
  modeAuto: 'Auto',
  modeStrong: 'Strong',
  modeCheap: 'Cheap',
  modeDelegated: 'Delegated',
  modeOff: 'Off',
  pillHint: 'Click to cycle this session\'s routing mode',
  escalated: 'Escalated',
  landings: 'Tier landings (read-only)',
  tierStrong: 'Strong tier',
  tierCheap: 'Cheap tier',
  tierVision: 'Vision tier',
  followsSession: 'Follows the session effort',
  effort: 'Effort',
  catalog: 'Model catalog',
  catalogHint: 'Read from the live registered providers and models; display only.',
  catalogSelect: 'Select a model',
  provider: 'Provider',
  model: 'Model',
  modalities: 'Input modalities',
  session: 'Session state',
  sessionOverride: 'Session override',
  sessionFollow: 'Follows configuration',
  appliedTier: 'Last applied tier',
  appliedNone: 'none yet',
  escalationActive: 'Failure escalation active',
  planActive: 'Plan mode',
  denials: 'Guard denials',
  source: 'Source',
  noSession: 'No session selected: open a session to change its routing mode.',
  unknownAgent: 'The current session is not registered with the routing service, so its mode cannot change yet.',
} as const

/** Every dictionary key. */
export type AutotierLocaleKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Autotier settings card and composer pill copy. */
    'settings.autotier': AutotierLocaleKey
  }
}

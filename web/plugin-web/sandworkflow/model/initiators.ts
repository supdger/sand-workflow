import type { FlowInitiator } from '../api/types';

/**
 * 发起范围条目（flowPermission.flowInitiators）的纯函数变换。
 * 条目是 {type:'user'|'dept'|'role', id, name?} 的扁平并集；选人界面按
 * 三个维度分开多选，合并时同类型整组替换，未知 type 条目原样保留。
 */

export const INITIATOR_TYPES = ['user', 'dept', 'role'] as const;

export type InitiatorType = (typeof INITIATOR_TYPES)[number];

export function isInitiatorType(type: string): type is InitiatorType {
  return (INITIATOR_TYPES as readonly string[]).includes(type);
}

/** 取某一维度的已选 id 列表。 */
export function initiatorIds(items: FlowInitiator[], type: InitiatorType): (number | string)[] {
  return items.filter((item) => item.type === type).map((item) => item.id);
}

/**
 * 整组替换某一维度的条目：新 entries 覆盖同 type 旧条目，
 * 其余维度与未知 type 的条目不动（兼容老数据）。
 */
export function replaceInitiators(
  items: FlowInitiator[],
  type: InitiatorType,
  entries: FlowInitiator[],
): FlowInitiator[] {
  const kept = items.filter((item) => item.type !== type);
  return [...kept, ...entries];
}

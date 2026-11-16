import type { AssigneeRule, CcRule } from '../api/types';
import { ASSIGNEE_TYPE, NODE_TYPE } from '../api/types';

/**
 * 处理人规则（assignees/transactors）与抄送规则（ccs）的纯函数助手。
 * 审批节点规则写 assigneeType+assignees 字段、办理节点写
 * transactorType+transactors 字段，字段名差异由 assigneeFields 统一收口，
 * 面板只面对「规则类型」，不摸字段名。
 */

/** 设计器提供的处理人规则方式：后端拒收的 1/5 不给入口，直通形态只读不产出。 */
export const ASSIGNEE_RULE_CHOICES = [
  ASSIGNEE_TYPE.SELF,
  ASSIGNEE_TYPE.DEPARTMENT_LEADER,
  ASSIGNEE_TYPE.ROLE,
  ASSIGNEE_TYPE.ASSIGNEE,
  ASSIGNEE_TYPE.MULTISTEP_DEPARTMENT_LEADER,
  ASSIGNEE_TYPE.INITIATOR_CHOICE,
] as const;

/** 设计器提供的抄送方式：契约只放行 0/3/4。 */
export const CC_RULE_CHOICES = [
  ASSIGNEE_TYPE.SELF,
  ASSIGNEE_TYPE.ROLE,
  ASSIGNEE_TYPE.ASSIGNEE,
] as const;

/** 审批/办理节点上规则字段名的差异；抄送节点字段固定不在此列。 */
export interface AssigneeFieldNames {
  /** 节点上挂规则数组的键。 */
  rulesKey: 'assignees' | 'transactors';
  /** 规则对象里规则类型的键。 */
  typeKey: 'assigneeType' | 'transactorType';
  /** 规则对象里指定成员数组的键。 */
  membersKey: 'assignees' | 'transactors';
}

export function assigneeFields(nodeType: number): AssigneeFieldNames {
  if (nodeType === NODE_TYPE.TRANSACT) {
    return { rulesKey: 'transactors', typeKey: 'transactorType', membersKey: 'transactors' };
  }
  return { rulesKey: 'assignees', typeKey: 'assigneeType', membersKey: 'assignees' };
}

/** 取规则的类型字段：审批/办理两种键名都认。 */
export function ruleTypeOf(rule: AssigneeRule): number | undefined {
  return rule.assigneeType ?? rule.transactorType;
}

/**
 * 不设类型字段的三种直通形态：{account_space,account_id} / {participant_key}
 * / {id}。老数据原样保留，界面只读展示，不产出（契约 §2.4）。
 */
export function isDirectRule(rule: AssigneeRule | CcRule): boolean {
  return (
    rule.account_space !== undefined ||
    rule.account_id !== undefined ||
    rule.participant_key !== undefined ||
    (rule.id !== undefined && rule.ccType === undefined)
  );
}

/** 规则里指定成员数组归一成 id 列表；元素兼容裸 id 与 {id} 对象两种形态。 */
export function memberIds(members: AssigneeRule['assignees']): (number | string)[] {
  if (!Array.isArray(members)) {
    return [];
  }
  const ids: (number | string)[] = [];
  for (const member of members) {
    if (typeof member === 'number' || typeof member === 'string') {
      ids.push(member);
    } else if (member && typeof member === 'object' && member.id !== undefined) {
      ids.push(member.id);
    }
  }
  return ids;
}

/** 新建一条处理人规则；层级类规则带上契约缺省值（向上 1 层）。 */
export function createAssigneeRule(nodeType: number, ruleType: number): AssigneeRule {
  const { typeKey } = assigneeFields(nodeType);
  const rule: AssigneeRule = { [typeKey]: ruleType };
  if (
    ruleType === ASSIGNEE_TYPE.DEPARTMENT_LEADER ||
    ruleType === ASSIGNEE_TYPE.MULTISTEP_DEPARTMENT_LEADER
  ) {
    rule.layerType = 0;
    rule.layer = 1;
  }
  if (ruleType === ASSIGNEE_TYPE.ROLE) {
    rule.roles = [];
  }
  if (ruleType === ASSIGNEE_TYPE.ASSIGNEE) {
    const { membersKey } = assigneeFields(nodeType);
    rule[membersKey] = [];
  }
  return rule;
}

export function createCcRule(ccType: number): CcRule {
  const rule: CcRule = { ccType };
  if (ccType === ASSIGNEE_TYPE.ROLE) {
    rule.roles = [];
  }
  if (ccType === ASSIGNEE_TYPE.ASSIGNEE) {
    rule.assignees = [];
  }
  return rule;
}

export function hasInitiatorChoice(rules: AssigneeRule[]): boolean {
  return rules.some((rule) => ruleTypeOf(rule) === ASSIGNEE_TYPE.INITIATOR_CHOICE);
}

export function hasMultistepLeader(rules: AssigneeRule[]): boolean {
  return rules.some(
    (rule) => ruleTypeOf(rule) === ASSIGNEE_TYPE.MULTISTEP_DEPARTMENT_LEADER,
  );
}

/**
 * 多人处理方式的双向映射（I-08）：界面只给 或签/会签/依次审批 三档；
 * 含发起人自选规则时「或签」落库存 2（后端发布校验自选必须非 0），
 * 其余情况 0/2 在界面上是同一档。
 */
export function multiInstanceChoice(value: number | undefined): number {
  if (value === 1) {
    return 1;
  }
  if (value === 3) {
    return 3;
  }
  return 0;
}

export function encodeMultiInstance(choice: number, hasChoiceRule: boolean): number {
  return choice === 0 && hasChoiceRule ? 2 : choice;
}

/** choiceKey/relationKey 的发布格式：^[A-Za-z][A-Za-z0-9_]{0,63}$。 */
export const SLOT_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

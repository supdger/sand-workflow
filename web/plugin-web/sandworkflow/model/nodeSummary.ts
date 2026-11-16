import type { AssigneeRule, CcRule, FlowNode } from '../api/types';
import { ASSIGNEE_TYPE, NODE_TYPE } from '../api/types';
import { isDirectRule, ruleTypeOf } from './assignee';
import { isDefaultBranch } from './nodeTypes';

/**
 * 节点卡片上的一行摘要：只表达「谁在什么规则下干活」，
 * 不暴露 id/nodeId/choiceKey 这类机器标识（规格 I-09）。
 * 老数据里的直通规则没有类型字段，展示为系统绑定，界面不产出。
 */

function countSuffix(items: unknown[] | undefined): string {
  return Array.isArray(items) && items.length > 0 ? `（${items.length}）` : '';
}

function assigneeRuleLabel(rule: AssigneeRule): string {
  const ruleType = ruleTypeOf(rule);
  if (ruleType === undefined) {
    return isDirectRule(rule) ? '系统绑定' : '未知规则';
  }
  switch (ruleType) {
    case ASSIGNEE_TYPE.SELF:
      return '发起人本人';
    case ASSIGNEE_TYPE.DEPARTMENT_LEADER:
      return '部门负责人';
    case ASSIGNEE_TYPE.ROLE:
      return `指定角色${countSuffix(rule.roles)}`;
    case ASSIGNEE_TYPE.ASSIGNEE:
      return `指定成员${countSuffix(rule.assignees ?? rule.transactors)}`;
    case ASSIGNEE_TYPE.MULTISTEP_DEPARTMENT_LEADER:
      return '连续多级部门负责人';
    case ASSIGNEE_TYPE.INITIATOR_CHOICE:
      return '发起人自选';
    case ASSIGNEE_TYPE.SUPERIOR:
    case ASSIGNEE_TYPE.MULTISTEP_LEADER:
      return '暂不支持的方式';
    default:
      return `未知规则(${ruleType})`;
  }
}

function ccRuleLabel(rule: CcRule): string {
  if (rule.ccType === undefined) {
    return isDirectRule(rule) ? '系统绑定' : '未知规则';
  }
  switch (rule.ccType) {
    case ASSIGNEE_TYPE.SELF:
      return '发起人本人';
    case ASSIGNEE_TYPE.ROLE:
      return `指定角色${countSuffix(rule.roles)}`;
    case ASSIGNEE_TYPE.ASSIGNEE:
      return `指定成员${countSuffix(rule.assignees)}`;
    default:
      return '暂不支持的方式';
  }
}

export function multiInstanceLabel(value: number | undefined): string {
  switch (value) {
    case 1:
      return '会签';
    case 3:
      return '依次审批';
    default:
      // 0 与 2 运行时同义，界面只给一个叫法。
      return '或签';
  }
}

function joinRules(labels: string[], emptyText: string): string {
  return labels.length > 0 ? labels.join('、') : emptyText;
}

export function summarizeNode(node: FlowNode): string {
  switch (node.type) {
    case NODE_TYPE.START:
      return '发起人提交表单';
    case NODE_TYPE.APPROVE: {
      const rules = (node.assignees ?? []).map(assigneeRuleLabel);
      const base = joinRules(rules, '未配置审批人');
      return rules.length > 0 ? `${base} · ${multiInstanceLabel(node.multiInstanceApprovalType)}` : base;
    }
    case NODE_TYPE.TRANSACT: {
      const rules = (node.transactors ?? []).map(assigneeRuleLabel);
      const base = joinRules(rules, '未配置办理人');
      return rules.length > 0 ? `${base} · ${multiInstanceLabel(node.multiInstanceApprovalType)}` : base;
    }
    case NODE_TYPE.COPY:
      return joinRules((node.ccs ?? []).map(ccRuleLabel), '未配置抄送人');
    case NODE_TYPE.CONDITION:
      if (isDefaultBranch(node)) {
        return '默认分支：其他情况走这条';
      }
      return `${(node.conditionGroups ?? []).length} 组条件`;
    case NODE_TYPE.EXCLUSIVE_GATEWAY:
      return `${(node.conditionNodes ?? []).length} 条分支，按顺序取第一个命中的`;
    case NODE_TYPE.END:
      return '流程结束';
    default:
      return '当前版本不支持的节点';
  }
}

import { describe, expect, it } from 'vitest';

import type { FlowNode } from '../api/types';
import { legacyDefinitionJson, sampleDefinitionJson } from '../components/designer/__fixtures__/sampleDefinition';
import { loadDefinition, serializeDraft, type DefinitionDraft } from './definitionCodec';
import { checkDraft, type DraftIssue } from './draftCheck';
import { walkNodes } from './nodeTree';

/** 以样例定义造一份能通过校验的合法草稿。 */
function validDraft(): DefinitionDraft {
  return loadDefinition(sampleDefinitionJson);
}

/** 按后端 id（node_keyOf 之外的稳定标识）在树里找节点。 */
function nodeById(root: FlowNode, id: string): FlowNode | undefined {
  let hit: FlowNode | undefined;
  walkNodes(root, (n) => {
    if (n.id === id) {
      hit = n;
    }
  });
  return hit;
}

function messages(issues: DraftIssue[]): string[] {
  return issues.map((issue) => issue.message);
}

describe('draftCheck', () => {
  it('契约样例草稿整体通过校验', () => {
    const report = checkDraft(validDraft(), { name: '请假审批' });
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('选了指定成员/角色但没选具体对象报出来', () => {
    const draft = validDraft();
    const approve = nodeById(draft.nodeConfig, 'node_approve01');
    if (approve) {
      approve.assignees = [{ assigneeType: 4, assignees: [] }, { assigneeType: 3, roles: [] }];
    }
    const found = messages(checkDraft(draft).issues);
    expect(found.some((m) => m.includes('选了指定成员但没选人'))).toBe(true);
    expect(found.some((m) => m.includes('选了指定角色但没选角色'))).toBe(true);

    // 规则一条都不配是另一种违规。
    const empty = validDraft();
    const emptyApprove = nodeById(empty.nodeConfig, 'node_approve01');
    if (emptyApprove) {
      emptyApprove.assignees = [];
    }
    expect(
      messages(checkDraft(empty).issues).some((m) => m.includes('未配置审批人规则')),
    ).toBe(true);
  });

  it('发起范围选指定范围却空名单、或条目类型不认识都拦下', () => {
    const draft = validDraft();
    draft.flowPermission = { type: 2, flowInitiators: [] };
    expect(
      messages(checkDraft(draft).issues).some((m) => m.includes('一个条目都没配')),
    ).toBe(true);

    const bad = validDraft();
    bad.flowPermission = {
      type: 2,
      flowInitiators: [{ type: 'team', id: 1 }],
    };
    expect(
      messages(checkDraft(bad).issues).some((m) => m.includes('不认识')),
    ).toBe(true);
  });

  it('条件组缺条件、没选字段、字段不存在、操作符不支持逐条报', () => {
    const draft = validDraft();
    const branch = nodeById(draft.nodeConfig, 'node_branch_a');
    if (branch) {
      branch.conditionGroups = [
        { conditions: [] },
        {
          conditions: [
            { operator: 12, val: 'x' },
            { varName: 'ghost_field', operator: 12, val: 'x' },
            { varName: 'days', operator: 99, val: 1 },
          ],
        },
      ];
    }
    const found = messages(checkDraft(draft).issues);
    expect(found.some((m) => m.includes('第 1 个条件组是空的'))).toBe(true);
    expect(found.some((m) => m.includes('没选字段'))).toBe(true);
    expect(found.some((m) => m.includes('表单里不存在'))).toBe(true);
    expect(found.some((m) => m.includes('不支持'))).toBe(true);
  });

  it('flowWidgets 字段名（含明细子字段）重复报重名', () => {
    const draft = validDraft();
    draft.flowWidgets = [
      { name: 'reason', type: 1, label: '请假事由' },
      { name: 'reason', type: 3, label: '天数' },
    ];
    expect(
      messages(checkDraft(draft).issues).some((m) => m.includes('表单字段名重复：reason')),
    ).toBe(true);

    const detailDup = validDraft();
    detailDup.flowWidgets = [
      {
        name: 'items',
        type: 9,
        label: '明细',
        details: [
          { name: 'quantity', type: 3 },
          { name: 'quantity', type: 0 },
        ],
      },
    ];
    expect(
      messages(checkDraft(detailDup).issues).some((m) => m.includes('表单字段名重复：quantity')),
    ).toBe(true);
  });

  it('formAuths 里 editable 不带 readable 报「可编辑必须先可读」', () => {
    const draft = validDraft();
    const approve = nodeById(draft.nodeConfig, 'node_approve01');
    if (approve) {
      approve.formAuths = [{ name: 'reason', type: 1, readable: false, editable: true }];
    }
    expect(
      messages(checkDraft(draft).issues).some((m) => m.includes('可编辑必须先可读')),
    ).toBe(true);
  });

  it('被条件引用的字段配 editable 也拦', () => {
    const draft = validDraft();
    const approve = nodeById(draft.nodeConfig, 'node_approve01');
    if (approve) {
      approve.formAuths = [{ name: 'days', type: 3, readable: true, editable: true }];
    }
    expect(
      messages(checkDraft(draft).issues).some((m) => m.includes('被条件引用，不能配可编辑')),
    ).toBe(true);
  });

  it('默认分支不在最后报位置错误', () => {
    const draft = validDraft();
    const gateway = nodeById(draft.nodeConfig, 'node_gateway01');
    const branches = gateway?.conditionNodes;
    if (branches && branches.length === 2) {
      gateway!.conditionNodes = [branches[1]!, branches[0]!];
    }
    expect(
      messages(checkDraft(draft).issues).some((m) => m.includes('必须排在最后')),
    ).toBe(true);
  });

  it('全树没有审批/办理节点、根不是发起节点都是硬伤', () => {
    const draft = loadDefinition({
      nodeConfig: {
        type: 0,
        childNode: { type: 2, name: '抄送', ccs: [{ ccType: 0 }], childNode: null },
      },
    });
    expect(
      messages(checkDraft(draft).issues).some((m) => m.includes('至少需要一个审批或办理节点')),
    ).toBe(true);

    const badRoot = loadDefinition({
      nodeConfig: { type: 1, name: '审批', assignees: [{ assigneeType: 0 }], childNode: null },
    });
    expect(
      messages(checkDraft(badRoot).issues).some((m) => m.includes('必须从发起节点开始')),
    ).toBe(true);
  });

  it('老数据直通规则不报「没有类型」，未知节点类型整体报不支持', () => {
    const report = checkDraft(loadDefinition(legacyDefinitionJson));
    const found = messages(report.issues);
    expect(found.some((m) => m.includes('没有类型'))).toBe(false);
    expect(found.some((m) => m.includes('节点类型(6)当前版本不支持'))).toBe(true);
  });

  it('发起人自选与其他规则混用、配或签都拦', () => {
    const draft = validDraft();
    const approve = nodeById(draft.nodeConfig, 'node_approve01');
    if (approve) {
      approve.assignees = [{ assigneeType: 7 }, { assigneeType: 0 }];
      approve.multiInstanceApprovalType = 0;
    }
    const found = messages(checkDraft(draft).issues);
    expect(found.some((m) => m.includes('不能和其他规则混用'))).toBe(true);
    expect(found.some((m) => m.includes('不能配或签'))).toBe(true);
  });

  it('nodeId 全树查重，choiceKey 格式与撞名都拦', () => {
    const draft = validDraft();
    const branchApprove = nodeById(draft.nodeConfig, 'node_approve02');
    if (branchApprove) {
      branchApprove.nodeId = 'UT_approve01';
    }
    expect(
      messages(checkDraft(draft).issues).some((m) => m.includes('nodeId「UT_approve01」')),
    ).toBe(true);

    const keyed = validDraft();
    const keyedApprove = nodeById(keyed.nodeConfig, 'node_approve01');
    if (keyedApprove) {
      keyedApprove.assignees = [{ assigneeType: 7, choiceKey: '9bad' }];
    }
    expect(
      messages(checkDraft(keyed).issues).some((m) => m.includes('格式不对')),
    ).toBe(true);
  });

  it('流程名空与超长都拦，serialize 后的写回载荷保持原字段', () => {
    const draft = validDraft();
    expect(
      messages(checkDraft(draft, { name: '  ' }).issues).some((m) => m.includes('流程名称没填')),
    ).toBe(true);
    expect(
      messages(checkDraft(draft, { name: 'x'.repeat(121) }).issues).some((m) =>
        m.includes('最多 120 个字'),
      ),
    ).toBe(true);
    // 校验不动数据：写回仍与原样例逐键一致（剥编辑键后）。
    expect(serializeDraft(draft).nodeConfig).toEqual(sampleDefinitionJson.nodeConfig);
  });
});

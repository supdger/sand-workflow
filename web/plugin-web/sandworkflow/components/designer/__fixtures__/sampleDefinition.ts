import type { DefinitionJson } from '../../../api/types';

/**
 * 画布渲染验证夹具，按 api-contract.md §2 契约手造。
 * sampleDefinitionJson：发起 → 审批 → 排他网关（条件分支 + 默认分支，分支内再挂
 * 审批/抄送）→ 结束，覆盖全部受支持节点形态。
 * legacyDefinitionJson：老数据形态——顶层键缺失、直通规则、未知节点类型、
 * 节点缺 formAuths/signable/backable，验证载入容错与不丢字段。
 */

export const sampleDefinitionJson: DefinitionJson = {
  workFlowDef: {
    name: '请假审批',
    remark: '样例流程',
    flowAdminIds: [1, 2],
  },
  flowWidgets: [
    { name: 'reason', type: 1, label: '请假事由', required: true },
    { name: 'days', type: 3, label: '请假天数', required: true },
  ],
  nodeConfig: {
    type: 0,
    id: 'node_start001',
    nodeId: 'SE_start001',
    name: '发起申请',
    childNode: {
      type: 1,
      id: 'node_approve01',
      nodeId: 'UT_approve01',
      name: '直属主管审批',
      assignees: [
        { assigneeType: 4, assignees: [{ id: 11 }, { id: 12 }] },
        { assigneeType: 3, roles: [2] },
      ],
      multiInstanceApprovalType: 0,
      signable: 1,
      backable: 1,
      formAuths: [
        { name: 'reason', type: 1, label: '请假事由', readable: true, editable: false },
        { name: 'days', type: 3, label: '请假天数', readable: true, editable: false },
      ],
      childNode: {
        type: 4,
        id: 'node_gateway01',
        nodeId: 'EG_gateway01',
        name: '按天数分流',
        conditionNodes: [
          {
            type: 3,
            id: 'node_branch_a',
            nodeId: 'CG_branch_a',
            name: '超过 3 天',
            conditionGroups: [
              { conditions: [{ varName: 'days', operator: 4, val: 3 }] },
            ],
            childNode: {
              type: 1,
              id: 'node_approve02',
              nodeId: 'UT_approve02',
              name: '总经理审批',
              assignees: [{ assigneeType: 3, roles: [1] }],
              multiInstanceApprovalType: 1,
              childNode: null,
            },
          },
          {
            type: 3,
            id: 'node_branch_b',
            nodeId: 'CG_branch_b',
            name: '其他情况',
            conditionGroups: [],
            childNode: {
              type: 2,
              id: 'node_copy01',
              nodeId: 'CC_copy01',
              name: '抄送人事',
              ccs: [{ ccType: 3, roles: [5] }],
              childNode: null,
            },
          },
        ],
        childNode: {
          type: 9,
          id: 'node_end01',
          nodeId: 'EE_end01',
          name: '结束',
          childNode: null,
        },
      },
    },
  },
  flowPermission: {
    type: 2,
    flowInitiators: [
      { type: 'dept', id: 5, name: '研发部' },
      { type: 'user', id: '42', name: '张三' },
    ],
  },
};

export const legacyDefinitionJson: DefinitionJson = {
  nodeConfig: {
    type: 0,
    childNode: {
      type: 1,
      name: '审批',
      assignees: [{ id: 9 }, { participant_key: 'leader_chain' }],
      childNode: {
        type: 6,
        name: '旧触发器',
        childNode: {
          type: 5,
          name: '办理',
          transactors: [{ account_space: 'sandadmin', account_id: '7' }],
          childNode: null,
        },
      },
    },
  },
  flowWidgets: [{ name: 'amount', type: 4, label: '金额' }],
};

import { describe, expect, it } from 'vitest';

import type { FlowNode, FlowWidget } from '../api/types';
import { legacyDefinitionJson, sampleDefinitionJson } from '../components/designer/__fixtures__/sampleDefinition';
import { createDraft, loadDefinition, serializeDraft } from './definitionCodec';

/** 收拢整棵节点树上所有节点（含分支），方便逐个断言。 */
function collectNodes(root: FlowNode): FlowNode[] {
  const nodes: FlowNode[] = [root];
  if (root.childNode) {
    nodes.push(...collectNodes(root.childNode));
  }
  for (const branch of root.conditionNodes ?? []) {
    nodes.push(...collectNodes(branch));
  }
  return nodes;
}

describe('definitionCodec', () => {
  it('老数据缺失的顶层键补默认值，已有键原样随行', () => {
    const draft = loadDefinition(legacyDefinitionJson);
    expect(draft.workFlowDef).toEqual({});
    expect(draft.flowPermission).toEqual({ type: 1, flowInitiators: [] });
    expect(draft.flowWidgets).toHaveLength(1);
    // 未知节点类型与直通规则不丢。
    const nodes = collectNodes(draft.nodeConfig);
    expect(nodes.some((node) => node.type === 6)).toBe(true);
    const approve = nodes.find((node) => node.type === 1);
    expect(approve?.assignees).toEqual([{ id: 9 }, { participant_key: 'leader_chain' }]);
    const transact = nodes.find((node) => node.type === 5);
    expect(transact?.transactors).toEqual([
      { account_space: 'sandadmin', account_id: '7' },
    ]);
  });

  it('载入时给每个节点和控件补 __editorKey，已带的不重发', () => {
    const draft = loadDefinition({
      nodeConfig: { type: 0, __editorKey: 'keep_me', childNode: null },
      flowWidgets: [{ name: 'amount', type: 4, __editorKey: 'keep_widget' }],
    });
    expect(draft.nodeConfig.__editorKey).toBe('keep_me');
    expect(draft.flowWidgets[0]?.__editorKey).toBe('keep_widget');
    for (const node of collectNodes(loadDefinition(sampleDefinitionJson).nodeConfig)) {
      expect(typeof node.__editorKey).toBe('string');
      expect(node.__editorKey).not.toBe('');
    }
  });

  it('明细控件的子字段也补 __editorKey', () => {
    const draft = loadDefinition({
      flowWidgets: [
        { name: 'items', type: 9, details: [{ name: 'qty', type: 3 }] },
      ],
    });
    const detail = draft.flowWidgets[0]?.details?.[0] as FlowWidget | undefined;
    expect(typeof detail?.__editorKey).toBe('string');
  });

  it('接受 JSON 字符串入参，非法输入回退为新草稿', () => {
    const loaded = loadDefinition(JSON.stringify(sampleDefinitionJson));
    expect(loaded.workFlowDef).toEqual(sampleDefinitionJson.workFlowDef);
    expect(loaded.nodeConfig.type).toBe(0);

    for (const bad of [null, undefined, 'not-json', '["a"]', 42]) {
      const draft = loadDefinition(bad as never);
      expect(draft.nodeConfig.type).toBe(0);
      expect(draft.flowWidgets).toEqual([]);
      expect(draft.flowPermission).toEqual({ type: 1, flowInitiators: [] });
    }
  });

  it('序列化剥净 __editorKey/focus/error，id 与 nodeId 原样写回', () => {
    const draft = loadDefinition(sampleDefinitionJson);
    const payload = serializeDraft(draft);
    const text = JSON.stringify(payload);
    expect(text).not.toContain('__editorKey');
    expect(text).not.toContain('"focus"');
    expect(text).not.toContain('"error"');
    // 运行时标识与直通规则原样保留。
    expect(text).toContain('UT_approve01');
    expect(text).toContain('EG_gateway01');
    expect(payload.nodeConfig?.id).toBe('node_start001');
  });

  it('序列化剥掉界面临时键但保留节点上的业务杂键', () => {
    const draft = loadDefinition(sampleDefinitionJson);
    draft.nodeConfig = {
      ...draft.nodeConfig,
      focus: true,
      error: '校验未过',
      customBizFlag: 'keep',
    };
    const payload = serializeDraft(draft);
    expect(payload.nodeConfig?.focus).toBeUndefined();
    expect(payload.nodeConfig?.error).toBeUndefined();
    expect(payload.nodeConfig?.customBizFlag).toBe('keep');
  });

  it('顶层多余键透传不丢，老数据完整 round-trip', () => {
    const legacyWithExtra = { ...legacyDefinitionJson, legacyExtra: { keep: 'yes' } };
    const payload = serializeDraft(loadDefinition(legacyWithExtra));
    expect(payload.legacyExtra).toEqual({ keep: 'yes' });
    // 剥掉编辑键后应与原对象深度一致（原样随行，不增不减）。
    expect(payload.nodeConfig).toEqual(legacyDefinitionJson.nodeConfig);
    expect(payload.flowWidgets).toEqual(legacyDefinitionJson.flowWidgets);

    const roundTrip = serializeDraft(loadDefinition(sampleDefinitionJson));
    expect(roundTrip.nodeConfig).toEqual(sampleDefinitionJson.nodeConfig);
    expect(roundTrip.flowWidgets).toEqual(sampleDefinitionJson.flowWidgets);
    expect(roundTrip.flowPermission).toEqual(sampleDefinitionJson.flowPermission);
    expect(roundTrip.workFlowDef).toEqual(sampleDefinitionJson.workFlowDef);
  });

  it('createDraft 产出可编辑的空草稿', () => {
    const draft = createDraft();
    expect(draft.nodeConfig.type).toBe(0);
    expect(draft.nodeConfig.childNode).toBeNull();
    expect(typeof draft.nodeConfig.__editorKey).toBe('string');
    expect(draft.flowWidgets).toEqual([]);
    expect(draft.flowPermission.type).toBe(1);
    // 序列化后不含编辑键。
    expect(JSON.stringify(serializeDraft(draft))).not.toContain('__editorKey');
  });
});

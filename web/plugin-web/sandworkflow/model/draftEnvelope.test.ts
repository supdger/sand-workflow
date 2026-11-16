import { describe, expect, it } from 'vitest';

import type { Definition } from '../api/types';
import { draftSourceOf } from './draftEnvelope';

function definitionRow(extra: Partial<Definition> = {}): Definition {
  return {
    id: 1,
    group_id: 3,
    name: '已发布流程',
    icon: 'icon-a',
    description: '已发布说明',
    definition_json: {
      flowWidgets: [{ name: 'amount', type: 4 }],
      nodeConfig: { type: 0 },
      flowPermission: { type: 1, flowInitiators: [] },
    },
    permission_type: 1,
    is_cancelable: 1,
    publish_time: '2026-11-10 08:00:00',
    current_version: 2,
    status: 1,
    created_by: null,
    updated_by: null,
    create_time: null,
    update_time: null,
    ...extra,
  };
}

describe('draftSourceOf', () => {
  it('有草稿信封（read 下发的 JSON 字符串）时画布取信封 definition_json，meta 逐项覆盖行字段', () => {
    const source = draftSourceOf(
      definitionRow({
        has_draft: true,
        draft_json: JSON.stringify({
          meta: { name: '草稿名', status: 2, description: '草稿说明' },
          definition_json: {
            flowWidgets: [{ name: 'reason', type: 1 }],
            flowPermission: { type: 2 },
          },
        }),
      }),
    );
    expect(source.draft.flowWidgets[0]?.name).toBe('reason');
    expect(source.draft.flowPermission.type).toBe(2);
    // 信封没给的定义键仍补编辑器默认值。
    expect(source.draft.nodeConfig.type).toBe(0);
    expect(source.meta.name).toBe('草稿名');
    expect(source.meta.status).toBe(2);
    expect(source.meta.description).toBe('草稿说明');
    // 信封 meta 缺省的项回落行字段。
    expect(source.meta.icon).toBe('icon-a');
    expect(source.meta.group_id).toBe(3);
    expect(source.meta.is_cancelable).toBe(1);
  });

  it('信封 meta 里 group_id 显式为 null 时不回落行字段', () => {
    const source = draftSourceOf(
      definitionRow({
        has_draft: true,
        draft_json: JSON.stringify({ meta: { group_id: null }, definition_json: {} }),
      }),
    );
    expect(source.meta.group_id).toBeNull();
  });

  it('信封不是合法 JSON 时按已发布行载入', () => {
    const source = draftSourceOf(
      definitionRow({ has_draft: true, draft_json: '{bad json' }),
    );
    expect(source.draft.flowWidgets[0]?.name).toBe('amount');
    expect(source.meta.name).toBe('已发布流程');
  });

  it('draft_json 为 null 时按已发布行载入', () => {
    const source = draftSourceOf(
      definitionRow({ has_draft: false, draft_json: null }),
    );
    expect(source.draft.flowWidgets[0]?.name).toBe('amount');
    expect(source.meta.name).toBe('已发布流程');
    expect(source.meta.status).toBe(1);
    expect(source.meta.group_id).toBe(3);
  });

  it('草稿字段整体缺省时同样按已发布行载入', () => {
    const source = draftSourceOf(definitionRow());
    expect(source.draft.flowWidgets[0]?.name).toBe('amount');
    expect(source.meta.name).toBe('已发布流程');
  });

  it('信封缺 meta 时 meta 全部回落行字段，画布仍取信封', () => {
    const source = draftSourceOf(
      definitionRow({
        has_draft: true,
        draft_json: { definition_json: { flowWidgets: [{ name: 'memo', type: 1 }] } },
      }),
    );
    expect(source.draft.flowWidgets[0]?.name).toBe('memo');
    expect(source.meta.name).toBe('已发布流程');
    expect(source.meta.group_id).toBe(3);
  });

  it('definition 为 null（新建）给全新草稿和默认 meta', () => {
    const source = draftSourceOf(null);
    expect(source.draft.flowWidgets).toEqual([]);
    expect(source.draft.nodeConfig.type).toBe(0);
    expect(source.meta).toEqual({
      name: '',
      status: 1,
      group_id: null,
      description: '',
      icon: '',
      is_cancelable: 1,
    });
  });
});

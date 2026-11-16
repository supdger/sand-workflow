import { describe, expect, it } from 'vitest';

import type { FlowNode, FlowWidget } from '../api/types';
import { authStateOf, setFieldAuth } from './formAuths';
import { WIDGET_TYPE } from './widgets';

const widgets: FlowWidget[] = [
  { name: 'reason', type: WIDGET_TYPE.TEXT, label: '事由' },
  { name: 'days', type: WIDGET_TYPE.NUMBER, label: '天数' },
  {
    name: 'items',
    type: WIDGET_TYPE.DETAIL,
    label: '明细',
    details: [
      { name: 'quantity', type: WIDGET_TYPE.NUMBER, label: '数量' },
      { name: 'memo', type: WIDGET_TYPE.TEXT, label: '备注' },
    ],
  },
];

function nodeWith(formAuths: FlowNode['formAuths']): FlowNode {
  return { type: 1, formAuths };
}

describe('formAuths', () => {
  it('authStateOf 三态读取：缺条目只读，editable 优先，容忍 1/0/字符串形态', () => {
    expect(authStateOf(undefined)).toBe('readonly');
    expect(authStateOf({ name: 'a' })).toBe('readonly');
    expect(authStateOf({ name: 'a', readable: true, editable: true })).toBe('editable');
    expect(authStateOf({ name: 'a', readable: false })).toBe('hidden');
    expect(authStateOf({ name: 'a', readable: 0 })).toBe('hidden');
    expect(authStateOf({ name: 'a', readable: '0' })).toBe('hidden');
    // editable 为真即可编辑，即便 readable 被老数据写成假。
    expect(authStateOf({ name: 'a', readable: 0, editable: '1' })).toBe('editable');
  });

  it('setFieldAuth 按表单全集展开条目并只改目标字段', () => {
    const node = nodeWith([
      { name: 'reason', type: WIDGET_TYPE.TEXT, readable: false, editable: false },
      { name: 'ghost', type: 0, readable: false },
    ]);
    const next = setFieldAuth(node, widgets, 'days', null, 'editable');
    const byName = new Map(next.map((entry) => [entry.name, entry]));

    expect(byName.get('days')).toMatchObject({ readable: true, editable: true });
    // 没动的沿用已有值：reason 保持隐藏。
    expect(byName.get('reason')).toMatchObject({ readable: false, editable: false });
    // 明细条目展开成 details，子字段默认只读。
    const items = byName.get('items');
    expect(items?.details).toHaveLength(2);
    expect(items?.details?.[0]).toMatchObject({ name: 'quantity', readable: true, editable: false });
    // 表单里已不认识的旧条目原样附加在末尾不丢。
    expect(next[next.length - 1]?.name).toBe('ghost');
  });

  it('setFieldAuth 只改明细里的目标子字段，其余沿用', () => {
    const node = nodeWith([
      {
        name: 'items',
        type: WIDGET_TYPE.DETAIL,
        details: [{ name: 'quantity', readable: false, editable: false }],
      },
    ]);
    const next = setFieldAuth(node, widgets, 'items', 'memo', 'editable');
    const items = next.find((entry) => entry.name === 'items');
    const quantity = items?.details?.find((child) => child.name === 'quantity');
    const memo = items?.details?.find((child) => child.name === 'memo');
    expect(quantity).toMatchObject({ readable: false, editable: false });
    expect(memo).toMatchObject({ readable: true, editable: true });
  });

  it('三态映射天然保证 editable 必带 readable', () => {
    const node = nodeWith([]);
    for (const state of ['editable', 'readonly', 'hidden'] as const) {
      const next = setFieldAuth(node, widgets, 'reason', null, state);
      const entry = next.find((item) => item.name === 'reason');
      if (state === 'editable') {
        expect(entry).toMatchObject({ readable: true, editable: true });
      }
      if (state === 'hidden') {
        expect(entry).toMatchObject({ readable: false, editable: false });
      }
      if (state === 'readonly') {
        expect(entry).toMatchObject({ readable: true, editable: false });
      }
      // 任何产出都不会出现 editable 真而 readable 假。
      if (entry?.editable === true) {
        expect(entry.readable).toBe(true);
      }
    }
  });
});

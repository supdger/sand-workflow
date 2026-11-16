import { describe, expect, it } from 'vitest';

import type { FlowWidget } from '../api/types';
import {
  allFieldNames,
  createSubField,
  createWidget,
  duplicateNames,
  duplicateWidgetAt,
  moveWidgetAt,
  removeWidgetAt,
  updateWidgetAt,
  widgetKeyOf,
  WIDGET_TYPE,
} from './widgets';

function widget(name: string, type: number = WIDGET_TYPE.TEXT, extra: Partial<FlowWidget> = {}): FlowWidget {
  return { name, type, ...extra };
}

describe('widgets', () => {
  it('createWidget 自动取不冲突的字段名并按类型补默认配置', () => {
    const existing = [widget('field_1'), widget('field_3')];
    const created = createWidget(existing, WIDGET_TYPE.TEXT);
    expect(created.name).toBe('field_2');
    expect(typeof created.__editorKey).toBe('string');

    const radio = createWidget([], WIDGET_TYPE.RADIO);
    expect(radio.options).toEqual([]);
    const date = createWidget([], WIDGET_TYPE.DATE);
    expect(date.format).toBe('YYYY-MM-DD');
    const detail = createWidget([], WIDGET_TYPE.DETAIL);
    expect(detail.details).toEqual([]);
  });

  it('createSubField 与全表（含明细子字段）一起查重命名', () => {
    const existing = [
      widget('field_1'),
      widget('items', WIDGET_TYPE.DETAIL, { details: [widget('field_2')] }),
    ];
    const child = createSubField(existing, WIDGET_TYPE.NUMBER);
    expect(child.name).toBe('field_3');
  });

  it('duplicateWidgetAt 复制件换新名新编辑键、插在原位后，明细子字段也换名', () => {
    const list = [
      widget('field_1', WIDGET_TYPE.DETAIL, {
        label: '报销明细',
        details: [widget('quantity', WIDGET_TYPE.NUMBER), widget('memo')],
      }),
      widget('remark'),
    ];
    const next = duplicateWidgetAt(list, 0);
    expect(next).toHaveLength(3);
    const clone = next[1];
    expect(clone?.name).toBe('field_2');
    expect(clone?.label).toBe('报销明细');
    expect(clone?.__editorKey).not.toBe(list[0]?.__editorKey);
    // 子字段换新名：彼此不同、也不与全表既有名字冲突。
    const childNames = clone?.details?.map((child) => child.name) ?? [];
    expect(childNames).toHaveLength(2);
    expect(new Set(childNames).size).toBe(2);
    const taken = allFieldNames(list);
    for (const name of childNames) {
      expect(taken.has(name)).toBe(false);
    }
    // 原数组不动。
    expect(list).toHaveLength(2);
  });

  it('updateWidgetAt/removeWidgetAt/moveWidgetAt 按位操作，越界原样返回', () => {
    const list = [widget('a'), widget('b'), widget('c')];
    const patched = updateWidgetAt(list, 1, { label: '改名' });
    expect(patched[1]?.label).toBe('改名');
    expect(list[1]?.label).toBeUndefined();

    expect(removeWidgetAt(list, 1).map((w) => w.name)).toEqual(['a', 'c']);

    expect(moveWidgetAt(list, 0, 1).map((w) => w.name)).toEqual(['b', 'a', 'c']);
    expect(moveWidgetAt(list, 2, 1).map((w) => w.name)).toEqual(['a', 'b', 'c']);
    expect(moveWidgetAt(list, 0, -1)).toBe(list);
  });

  it('allFieldNames/duplicateNames 把明细子字段一起算进查重', () => {
    const list = [
      widget('title'),
      widget('items', WIDGET_TYPE.DETAIL, {
        details: [widget('quantity'), widget('title')],
      }),
    ];
    expect(allFieldNames(list)).toEqual(new Set(['title', 'items', 'quantity']));
    expect(duplicateNames(list)).toEqual(new Set(['title']));
  });

  it('widgetKeyOf 编辑键优先，老数据回落字段名', () => {
    expect(widgetKeyOf({ name: 'a', type: 0, __editorKey: 'ek1' })).toBe('ek1');
    expect(widgetKeyOf({ name: 'a', type: 0 })).toBe('a');
    expect(widgetKeyOf({ name: 'a', type: 0, __editorKey: '' })).toBe('a');
  });
});

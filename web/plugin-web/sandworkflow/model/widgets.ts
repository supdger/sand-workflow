import type { FlowWidget } from '../api/types';
import { genEditorKey } from './nodeTypes';

/**
 * flowWidgets 控件类型注册表（契约 §2.9，type=14 空缺）与控件数组的
 * 不可变变换。所有函数返回新数组，不改动入参；
 * 控件身份用 widgetKeyOf（__editorKey → name 顺序取），与节点键一样
 * 在序列化时由 definitionCodec 剥掉。
 */

/** 控件 type 枚举（后端 FlowConstant::WIDGET，type=14 永远空缺）。 */
export const WIDGET_TYPE = {
  TEXT: 0,
  TEXTAREA: 1,
  DESC: 2,
  NUMBER: 3,
  MONEY: 4,
  RADIO: 5,
  MULTI: 6,
  DATE: 7,
  DATE_RANGE: 8,
  DETAIL: 9,
  IMAGE: 10,
  FILE: 11,
  DEPT: 12,
  USER: 13,
  RELATION: 15,
  REGION: 16,
  EMAIL: 17,
  PHONE: 18,
  IDCARD: 19,
  URL: 20,
  RATING: 21,
  RICH: 22,
  FORMULA: 23,
} as const;

const WIDGET_TYPE_LABELS: Record<number, string> = {
  [WIDGET_TYPE.TEXT]: '单行文本',
  [WIDGET_TYPE.TEXTAREA]: '多行文本',
  [WIDGET_TYPE.DESC]: '说明文字',
  [WIDGET_TYPE.NUMBER]: '数字',
  [WIDGET_TYPE.MONEY]: '金额',
  [WIDGET_TYPE.RADIO]: '单选',
  [WIDGET_TYPE.MULTI]: '多选',
  [WIDGET_TYPE.DATE]: '日期',
  [WIDGET_TYPE.DATE_RANGE]: '日期区间',
  [WIDGET_TYPE.DETAIL]: '明细',
  [WIDGET_TYPE.IMAGE]: '图片',
  [WIDGET_TYPE.FILE]: '附件',
  [WIDGET_TYPE.DEPT]: '部门选择',
  [WIDGET_TYPE.USER]: '员工选择',
  [WIDGET_TYPE.RELATION]: '关联审批',
  [WIDGET_TYPE.REGION]: '省市区',
  [WIDGET_TYPE.EMAIL]: '邮箱',
  [WIDGET_TYPE.PHONE]: '手机号',
  [WIDGET_TYPE.IDCARD]: '身份证',
  [WIDGET_TYPE.URL]: '网址',
  [WIDGET_TYPE.RATING]: '评分',
  [WIDGET_TYPE.RICH]: '富文本',
  [WIDGET_TYPE.FORMULA]: '公式',
};

/** 控件库展示顺序：与后端枚举顺序一致，type=14 跳过。 */
export const WIDGET_PALETTE: readonly number[] = [
  WIDGET_TYPE.TEXT,
  WIDGET_TYPE.TEXTAREA,
  WIDGET_TYPE.DESC,
  WIDGET_TYPE.NUMBER,
  WIDGET_TYPE.MONEY,
  WIDGET_TYPE.RADIO,
  WIDGET_TYPE.MULTI,
  WIDGET_TYPE.DATE,
  WIDGET_TYPE.DATE_RANGE,
  WIDGET_TYPE.DETAIL,
  WIDGET_TYPE.IMAGE,
  WIDGET_TYPE.FILE,
  WIDGET_TYPE.DEPT,
  WIDGET_TYPE.USER,
  WIDGET_TYPE.RELATION,
  WIDGET_TYPE.REGION,
  WIDGET_TYPE.EMAIL,
  WIDGET_TYPE.PHONE,
  WIDGET_TYPE.IDCARD,
  WIDGET_TYPE.URL,
  WIDGET_TYPE.RATING,
  WIDGET_TYPE.RICH,
  WIDGET_TYPE.FORMULA,
];

/** 发起端当前没接数据的控件（I-07）：给「暂不可用」标记，但保留入口。 */
const UNAVAILABLE_TYPES = new Set<number>([
  WIDGET_TYPE.IMAGE,
  WIDGET_TYPE.FILE,
  WIDGET_TYPE.RELATION,
  WIDGET_TYPE.REGION,
]);

/** 有 options 配置项的控件（单选/多选）。 */
export function hasOptions(type: number): boolean {
  return type === WIDGET_TYPE.RADIO || type === WIDGET_TYPE.MULTI;
}

/** 有 format 配置项的控件（日期/日期区间）。 */
export function hasFormat(type: number): boolean {
  return type === WIDGET_TYPE.DATE || type === WIDGET_TYPE.DATE_RANGE;
}

/** 有提示语的控件：说明文字与明细不录入值，不给提示语。 */
export function hasPlaceholder(type: number): boolean {
  return type !== WIDGET_TYPE.DESC && type !== WIDGET_TYPE.DETAIL;
}

/** 有「必填」开关的控件：说明文字与明细子表本身不校验必填。 */
export function hasRequired(type: number): boolean {
  return type !== WIDGET_TYPE.DESC && type !== WIDGET_TYPE.DETAIL;
}

export function isUnavailableType(type: number): boolean {
  return UNAVAILABLE_TYPES.has(type);
}

export function widgetTypeLabel(type: number): string {
  return WIDGET_TYPE_LABELS[type] ?? `未知控件(${type})`;
}

/** 明细里允许放的子字段类型：不能再嵌明细（后端只认一层）。 */
export function isSubFieldType(type: number): boolean {
  return type !== WIDGET_TYPE.DETAIL && type in WIDGET_TYPE_LABELS;
}

/** 字段名建议的合法标识符形态（form_value 平铺键 + 条件 varName 引用）。 */
export const FIELD_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

/** 控件的编辑态标识：编辑键优先，老数据回落 name。 */
export function widgetKeyOf(widget: FlowWidget): string {
  const key = widget.__editorKey;
  if (typeof key === 'string' && key !== '') {
    return key;
  }
  return widget.name;
}

/** 全表字段名集合（一级 + 明细子字段一起查重，契约 §2.9）。 */
export function allFieldNames(widgets: FlowWidget[]): Set<string> {
  const names = new Set<string>();
  const visit = (widget: FlowWidget) => {
    const name = widget.name.trim();
    if (name !== '') {
      names.add(name);
    }
    for (const child of widget.details ?? []) {
      visit(child);
    }
  };
  for (const widget of widgets) {
    visit(widget);
  }
  return names;
}

/** 出现次数 >1 的字段名集合（界面即时标红，draftCheck 发布前再兜）。 */
export function duplicateNames(widgets: FlowWidget[]): Set<string> {
  const seen = new Set<string>();
  const dup = new Set<string>();
  const visit = (widget: FlowWidget) => {
    const name = widget.name.trim();
    if (name !== '') {
      if (seen.has(name)) {
        dup.add(name);
      }
      seen.add(name);
    }
    for (const child of widget.details ?? []) {
      visit(child);
    }
  };
  for (const widget of widgets) {
    visit(widget);
  }
  return dup;
}

/** 给新控件取一个不与全表冲突的字段名（field_1、field_2…）。 */
function nextFieldName(widgets: FlowWidget[]): string {
  const names = allFieldNames(widgets);
  let index = 1;
  while (names.has(`field_${index}`)) {
    index += 1;
  }
  return `field_${index}`;
}

/** 新建一个一级控件：自动分配不冲突的字段名与编辑键。 */
export function createWidget(widgets: FlowWidget[], type: number): FlowWidget {
  const widget: FlowWidget = {
    name: nextFieldName(widgets),
    type,
    label: widgetTypeLabel(type),
    required: false,
    __editorKey: genEditorKey(),
  };
  if (hasOptions(type)) {
    widget.options = [];
  }
  if (hasFormat(type)) {
    widget.format = 'YYYY-MM-DD';
  }
  if (type === WIDGET_TYPE.DETAIL) {
    widget.details = [];
  }
  return widget;
}

/** 新建一个明细子字段：与全表所有字段名查重（后端含子字段一起查）。 */
export function createSubField(widgets: FlowWidget[], type: number): FlowWidget {
  const field: FlowWidget = {
    name: nextFieldName(widgets),
    type,
    label: widgetTypeLabel(type),
    __editorKey: genEditorKey(),
  };
  if (hasOptions(type)) {
    field.options = [];
  }
  if (hasFormat(type)) {
    field.format = 'YYYY-MM-DD';
  }
  return field;
}

/**
 * 复制一个控件插到原位置后：字段名/子字段名全部换新（全表查重），
 * 编辑键重新分配，其余配置原样克隆。
 */
export function duplicateWidgetAt(widgets: FlowWidget[], index: number): FlowWidget[] {
  const source = widgets[index];
  if (!source) {
    return widgets;
  }
  const clone: FlowWidget = {
    ...source,
    name: nextFieldName(widgets),
    __editorKey: genEditorKey(),
  };
  const children = source.details;
  if (Array.isArray(children)) {
    const pool = [...widgets, clone];
    // 查重池必须放已改名的克隆子字段：用原件会导致兄弟字段拿到同一个新名。
    const renamed: FlowWidget[] = [];
    clone.details = children.map((child) => {
      const next: FlowWidget = {
        ...child,
        name: nextFieldName([...pool, ...renamed]),
        __editorKey: genEditorKey(),
      };
      renamed.push(next);
      return next;
    });
  }
  const next = [...widgets];
  next.splice(index + 1, 0, clone);
  return next;
}

export function updateWidgetAt(
  widgets: FlowWidget[],
  index: number,
  patch: Partial<FlowWidget>,
): FlowWidget[] {
  return widgets.map((widget, i) => (i === index ? { ...widget, ...patch } : widget));
}

export function removeWidgetAt(widgets: FlowWidget[], index: number): FlowWidget[] {
  return widgets.filter((_, i) => i !== index);
}

/** 控件上移/下移一格；越界原样返回。 */
export function moveWidgetAt(
  widgets: FlowWidget[],
  index: number,
  offset: number,
): FlowWidget[] {
  const target = index + offset;
  if (index < 0 || target < 0 || target >= widgets.length) {
    return widgets;
  }
  const next = [...widgets];
  const widget = next[index];
  const swap = next[target];
  if (!widget || !swap) {
    return widgets;
  }
  next[index] = swap;
  next[target] = widget;
  return next;
}

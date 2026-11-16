import type { FlowCondition, FlowWidget } from '../api/types';

/**
 * 条件分支表达式的操作符元数据（契约 §2.8）。
 * operator 白名单固定；按控件类型收敛可选操作符，数值类控件给数值比较，
 * 单值字符串类给等值/包含，数组值控件给集合交集，避免选出运行时
 * 永远不成立的比较方式（条件不命中是静默语义，界面要预防性拦住）。
 */

/** 后端发布校验的操作符白名单。 */
export const CONDITION_OPERATORS = [0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15, 20, 21] as const;

/** 数值比较：两边转 float。 */
export const NUMERIC_OPERATORS = [0, 1, 2, 3, 4, 5] as const;

/** 期望集合：值是数组（或逗号串）。 */
export const SET_OPERATORS = [10, 11] as const;

/** 字符串比较：等值与子串。 */
export const STRING_OPERATORS = [12, 13, 14, 15] as const;

/** 集合交集：两边都当集合。 */
export const INTERSECT_OPERATORS = [20, 21] as const;

export function isNumericOperator(operator: number | undefined): boolean {
  return operator !== undefined && (NUMERIC_OPERATORS as readonly number[]).includes(operator);
}

export function isSetOperator(operator: number | undefined): boolean {
  return (
    operator !== undefined &&
    ([...SET_OPERATORS, ...INTERSECT_OPERATORS] as readonly number[]).includes(operator)
  );
}

export function isAllowedOperator(operator: number | undefined): boolean {
  return operator !== undefined && (CONDITION_OPERATORS as readonly number[]).includes(operator);
}

/**
 * 控件类型分组决定可选操作符（flowWidgets.type，契约 §2.9 枚举）：
 * numeric 数字/金额/评分/公式；string 文本类与日期；choice 单选（按期望集合）；
 * collection 多选/日期区间（数组值按交集）。
 */
type WidgetCompareKind = 'numeric' | 'string' | 'choice' | 'collection' | 'none';

const COMPARE_KINDS: Record<number, WidgetCompareKind> = {
  0: 'string',
  1: 'string',
  3: 'numeric',
  4: 'numeric',
  5: 'choice',
  6: 'collection',
  7: 'string',
  8: 'collection',
  17: 'string',
  18: 'string',
  19: 'string',
  20: 'string',
  21: 'numeric',
  23: 'numeric',
};

export function compareKindOf(widgetType: number): WidgetCompareKind {
  return COMPARE_KINDS[widgetType] ?? 'none';
}

/**
 * 不可比较的控件：说明文字 2、明细 9、图片 10、附件 11、部门选择 12、
 * 员工选择 13、关联审批 15、省市区 16、富文本 22，以及未知类型——
 * 左值下拉里不给这些字段（后端不比对象/文件类值，选中只会误导）。
 */
export function isComparableWidget(widget: FlowWidget): boolean {
  return compareKindOf(widget.type) !== 'none';
}

/** 该控件左值下可选的操作符集合。 */
export function operatorsForWidget(widgetType: number): readonly number[] {
  switch (compareKindOf(widgetType)) {
    case 'numeric':
      return NUMERIC_OPERATORS;
    case 'choice':
      return [...STRING_OPERATORS.slice(0, 2), ...SET_OPERATORS];
    case 'collection':
      return INTERSECT_OPERATORS;
    case 'string':
      return STRING_OPERATORS;
    default:
      return [];
  }
}

/** 条件下拉里能出的字段：flowWidgets 一级可比较字段（明细子字段不参与）。 */
export function comparableWidgets(widgets: FlowWidget[]): FlowWidget[] {
  return widgets.filter(isComparableWidget);
}

/** 新建一条条件：默认取该控件的第一个操作符与空右值。 */
export function createCondition(widget: FlowWidget): FlowCondition {
  const operator = operatorsForWidget(widget.type)[0] ?? 12;
  return { varName: widget.name, operator, val: defaultConditionValue(operator) };
}

/** 新右值：集合类操作符用数组（契约建议统一写数组），数值类给 0，其余空串。 */
export function defaultConditionValue(operator: number): unknown {
  if ((SET_OPERATORS as readonly number[]).includes(operator) ||
      (INTERSECT_OPERATORS as readonly number[]).includes(operator)) {
    return [];
  }
  if ((NUMERIC_OPERATORS as readonly number[]).includes(operator)) {
    return 0;
  }
  return '';
}

/**
 * 操作符切换时改写右值形态：数值↔字符串↔数组之间不保留旧值
 * （类型不复用，避免把 ['a'] 塞给数值比较）。同族内切换保留。
 */
export function retargetCondition(condition: FlowCondition, operator: number): FlowCondition {
  const wasSet = isSetOperator(condition.operator);
  const wasNumeric = isNumericOperator(condition.operator);
  const nextSet = isSetOperator(operator);
  const nextNumeric = isNumericOperator(operator);
  if ((wasSet && nextSet) || (wasNumeric && nextNumeric) || (!wasSet && !wasNumeric && !nextSet && !nextNumeric)) {
    return { ...condition, operator };
  }
  return { ...condition, operator, val: defaultConditionValue(operator) };
}

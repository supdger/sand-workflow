import type { FlowNode, FlowWidget, FormAuthEntry } from '../api/types';
import { WIDGET_TYPE } from './widgets';

/**
 * 节点级字段权限（formAuths，契约 §2.10）的纯函数变换。
 * 界面三态 可编辑/只读/隐藏 与 readable/editable 的互转在这里收口：
 * readable 缺省 true、editable 缺省 false；editable=true 必须 readable=true，
 * 三态映射天然保证这条约束，UI 不会再产出 editable&&!readable 的条目。
 * 明细控件本身不带权限位（后端发布 unset），权限只落在 details 子字段上。
 */

export type FieldAuth = 'editable' | 'readonly' | 'hidden';

function truthy(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

/** 读条目的三态；条目缺失按后端缺省（可读、不可编辑）。 */
export function authStateOf(entry: FormAuthEntry | undefined): FieldAuth {
  if (truthy(entry?.editable)) {
    return 'editable';
  }
  if (entry !== undefined && !truthy(entry.readable ?? true)) {
    return 'hidden';
  }
  return 'readonly';
}

function flagsOf(state: FieldAuth): Pick<FormAuthEntry, 'readable' | 'editable'> {
  switch (state) {
    case 'editable':
      return { readable: true, editable: true };
    case 'hidden':
      return { readable: false, editable: false };
    default:
      return { readable: true, editable: false };
  }
}

/**
 * 改一个字段（或明细子字段）的三态，产出重写后的 formAuths：
 * 按 flowWidgets 全集展开成完整条目（与后端回读同口径），没动过的沿用已有值；
 * 表单里已不认识的旧条目原样附加在末尾不丢，draftCheck 会把它报出来交给用户。
 */
export function setFieldAuth(
  node: FlowNode,
  widgets: FlowWidget[],
  fieldName: string,
  detailName: string | null,
  state: FieldAuth,
): FormAuthEntry[] {
  const existing = node.formAuths ?? [];
  const byName = new Map(existing.map((entry) => [entry.name, entry]));

  const list = widgets.map((widget) => {
    const prev = byName.get(widget.name);
    const base = { name: widget.name, type: widget.type, label: widget.label ?? widget.name };
    if (widget.type === WIDGET_TYPE.DETAIL) {
      const details = (widget.details ?? []).map((child) => {
        const prevChild = (prev?.details ?? []).find((item) => item.name === child.name);
        const flags =
          widget.name === fieldName && detailName === child.name
            ? flagsOf(state)
            : flagsOf(authStateOf(prevChild));
        return {
          name: child.name,
          type: child.type,
          label: child.label ?? child.name,
          ...flags,
        };
      });
      const entry: FormAuthEntry = { ...base, details };
      return entry;
    }
    const flags =
      detailName === null && widget.name === fieldName
        ? flagsOf(state)
        : flagsOf(authStateOf(prev));
    const entry: FormAuthEntry = { ...base, ...flags };
    return entry;
  });

  const known = new Set(widgets.map((widget) => widget.name));
  const extras = existing.filter((entry) => !known.has(entry.name));
  return [...list, ...extras];
}

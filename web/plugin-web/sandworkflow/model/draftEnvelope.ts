import type { Definition, DraftEnvelope, DraftMeta } from '../api/types';
import type { DefinitionDraft } from './definitionCodec';
import { createDraft, loadDefinition } from './definitionCodec';

/**
 * 「保存即存草稿」的载入口径：read 返回草稿信封（draft_json）时优先于已发布行——
 * 画布内容喂信封里的 definition_json，基础信息逐项取信封 meta；
 * 信封缺键回落行字段，没有草稿按已发布行载入，新建（null）给全新草稿。
 */

/** 编辑页基础信息编辑态：键与定义行、SaveDraftBody 同名，序列化时直接摊开。 */
export interface DraftMetaState {
  name: string;
  status: number;
  group_id: number | null;
  description: string;
  icon: string;
  is_cancelable: number;
}

export interface DraftSource {
  draft: DefinitionDraft;
  meta: DraftMetaState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// 后端模型把 draft_json cast 成对象下发；字符串形态仍兼容解析，防直连老库/网关原样透传。
function parseEnvelope(raw: Definition['draft_json']): DraftEnvelope | null {
  if (isRecord(raw)) {
    return raw;
  }
  if (typeof raw !== 'string' || raw === '') {
    return null;
  }
  try {
    const decoded: unknown = JSON.parse(raw);
    return isRecord(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function draftSourceOf(definition: Definition | null): DraftSource {
  const envelope = parseEnvelope(definition?.draft_json);
  const meta: DraftMeta = isRecord(envelope?.meta) ? envelope.meta : {};

  const draft = envelope
    ? loadDefinition(envelope.definition_json)
    : definition
      ? loadDefinition(definition.definition_json)
      : createDraft();

  return {
    draft,
    meta: {
      name: meta.name ?? definition?.name ?? '',
      status: meta.status ?? definition?.status ?? 1,
      // 信封里 group_id 显式为 null 表示草稿把分组清掉了，不能用 ?? 回落行字段。
      group_id: meta.group_id !== undefined ? meta.group_id : (definition?.group_id ?? null),
      description: meta.description ?? definition?.description ?? '',
      icon: meta.icon ?? definition?.icon ?? '',
      is_cancelable: meta.is_cancelable ?? definition?.is_cancelable ?? 1,
    },
  };
}

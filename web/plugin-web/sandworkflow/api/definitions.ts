import { pluginDelete, pluginGet, pluginPost, pluginPut, type PluginQuery } from './pluginClient';
import type { Definition, DefinitionVersion, PluginPage, PublishBody, SaveDraftBody } from './types';

/**
 * 流程定义 CRUD、草稿与发布。路径相对 `/app/sandworkflow/admin`；
 * 编辑页写入走 saveDraft（存草稿）与 publish（落 definition_json 并清草稿），
 * update 只留给列表页启停用行字段。
 */

export interface DefinitionListQuery extends PluginQuery {
  keywords?: string;
  group_id?: number;
  status?: number;
  page?: number;
  limit?: number;
}

export interface DefinitionWriteBody {
  id?: number;
  name: string;
  status: number;
  group_id?: number | null;
  description?: string;
  icon?: string;
  is_cancelable?: number;
  permission_type?: number;
}

export function listDefinitions(query?: DefinitionListQuery): Promise<PluginPage<Definition>> {
  return pluginGet<PluginPage<Definition>>('/definition/index', { query });
}

/** 可发起定义：仅 status=1 且已发布、当前用户在发起范围内。 */
export function listAvailableDefinitions(query?: DefinitionListQuery): Promise<PluginPage<Definition>> {
  return pluginGet<PluginPage<Definition>>('/definition/available', { query });
}

/** 编辑页载入：定义行全字段 + can_manage + 草稿字段（has_draft/draft_json/draft_time/drafted_by）。 */
export function getDefinition(id: number): Promise<Definition> {
  return pluginGet<Definition>('/definition/read', { query: { id } });
}

/** 只写行字段，不写 definition_json；返回 {id}。 */
export function createDefinition(body: DefinitionWriteBody): Promise<{ id: number }> {
  return pluginPost<{ id: number }>('/definition/save', body);
}

/** 只写行字段，不写 definition_json；列表页启停用专用，编辑页不调；返回 '更新成功' 文案。 */
export function updateDefinition(body: DefinitionWriteBody & { id: number }): Promise<string> {
  return pluginPut<string>('/definition/update', body);
}

/** 保存草稿：id 缺省建行并回 {id}，id>0 只写草稿列不动已发布行。 */
export function saveDraftDefinition(body: SaveDraftBody): Promise<{ id: number }> {
  return pluginPost<{ id: number }>('/definition/saveDraft', body);
}

/** 放弃草稿：清掉草稿列，编辑页回到已发布内容；返回后端文案。 */
export function discardDraftDefinition(id: number): Promise<string> {
  return pluginPost<string>('/definition/discardDraft', { id });
}

/** 发布：definition_json 的唯一规范写入口；后端会规范化改写并清草稿，成功后必须 read 回读。 */
export function publishDefinition(body: PublishBody): Promise<{ id: number }> {
  return pluginPost<{ id: number }>('/definition/publish', body);
}

export function deleteDefinitions(ids: number[]): Promise<string> {
  return pluginDelete<string>('/definition/destroy', { ids });
}

export function listDefinitionVersions(id: number): Promise<DefinitionVersion[]> {
  return pluginGet<DefinitionVersion[]>('/definition/versions', { query: { id } });
}

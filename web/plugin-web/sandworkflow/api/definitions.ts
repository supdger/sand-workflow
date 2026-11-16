import { pluginDelete, pluginGet, pluginPost, pluginPut, type PluginQuery } from './pluginClient';
import type { Definition, DefinitionVersion, PluginPage, PublishBody } from './types';

/**
 * 流程定义 CRUD 与发布。路径相对 `/app/sandworkflow/admin`；
 * publish 是 definition_json 的唯一写入口径（save/update 不校验不处理 JSON）。
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

/** 编辑页载入：返回定义行全字段（含 definition_json）+ can_manage。 */
export function getDefinition(id: number): Promise<Definition> {
  return pluginGet<Definition>('/definition/read', { query: { id } });
}

/** 只写行字段，不写 definition_json；返回 {id}。 */
export function createDefinition(body: DefinitionWriteBody): Promise<{ id: number }> {
  return pluginPost<{ id: number }>('/definition/save', body);
}

/** 只写行字段，不写 definition_json；返回 '更新成功' 文案。 */
export function updateDefinition(body: DefinitionWriteBody & { id: number }): Promise<string> {
  return pluginPut<string>('/definition/update', body);
}

/** 发布：definition_json 的唯一规范写入口；后端会规范化改写，成功后必须 read 回读。 */
export function publishDefinition(body: PublishBody): Promise<{ id: number }> {
  return pluginPost<{ id: number }>('/definition/publish', body);
}

export function deleteDefinitions(ids: number[]): Promise<string> {
  return pluginDelete<string>('/definition/destroy', { ids });
}

export function listDefinitionVersions(id: number): Promise<DefinitionVersion[]> {
  return pluginGet<DefinitionVersion[]>('/definition/versions', { query: { id } });
}

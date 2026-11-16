import { pluginGet } from './pluginClient';
import type { OrgDept, OrgRole, OrgUser } from './types';

/**
 * 组织候选源：三个接口都只回启用记录、全量返回、无关键词参数，
 * 需要过滤时前端自行做（后端契约如此）。
 */

export function listOrgUsers(): Promise<OrgUser[]> {
  return pluginGet<OrgUser[]>('/index/listUsers');
}

export function listOrgRoles(): Promise<OrgRole[]> {
  return pluginGet<OrgRole[]>('/index/listRoles');
}

export function listOrgDepts(): Promise<OrgDept[]> {
  return pluginGet<OrgDept[]>('/index/listDepts');
}

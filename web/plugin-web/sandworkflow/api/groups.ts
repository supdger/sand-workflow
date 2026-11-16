import { pluginGet } from './pluginClient';
import type { FlowGroup } from './types';

/** 流程分组：定义页筛选下拉与基础信息的分组选择用启用分组全量。 */

export function listAllGroups(): Promise<FlowGroup[]> {
  return pluginGet<FlowGroup[]>('/group/all');
}

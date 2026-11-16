import { useQuery } from '@tanstack/react-query';

import { listOrgDepts, listOrgRoles, listOrgUsers } from '../api/organization';

/**
 * 组织候选数据：三个接口都是启用记录全量返回、无搜索参数，
 * React Query 缓存共用一份，过滤全部在前端做（契约 §6）。
 */

export function useOrgUsers() {
  return useQuery({
    queryKey: ['sandworkflow', 'org', 'users'],
    queryFn: listOrgUsers,
    staleTime: 60_000,
  });
}

export function useOrgRoles() {
  return useQuery({
    queryKey: ['sandworkflow', 'org', 'roles'],
    queryFn: listOrgRoles,
    staleTime: 60_000,
  });
}

export function useOrgDepts() {
  return useQuery({
    queryKey: ['sandworkflow', 'org', 'depts'],
    queryFn: listOrgDepts,
    staleTime: 60_000,
  });
}

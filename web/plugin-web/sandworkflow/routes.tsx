import type { RouteObject } from 'react-router';

import { DefinitionEditPage } from './pages/DefinitionEditPage';
import { DefinitionListPage } from './pages/DefinitionListPage';

/**
 * 插件页面路由表，格式与宿主 routes/modules/<域>.tsx 一致：
 * 默认导出 RouteObject[]，handle.permission 走宿主 RequirePermission 守卫，
 * handle.title 兼作面包屑兜底。设计器子页不进菜单，靠 handle.title 出面包屑。
 */
const routes: RouteObject[] = [
  {
    path: '/app/sandworkflow/definitions',
    element: <DefinitionListPage />,
    handle: { title: '流程定义', permission: 'sandworkflow:definition:index' },
  },
  {
    path: '/app/sandworkflow/definitions/:definitionId/edit',
    element: <DefinitionEditPage />,
    handle: { title: '设计流程', permission: 'sandworkflow:definition:read' },
  },
];

export default routes;

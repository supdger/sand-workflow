import type { RouteObject } from 'react-router';

import routes from './routes';

/**
 * 插件前端入口声明。草案，宿主收集点未建——构建期编入机制落地前，
 * 字段按 host-conventions.md 的建议落法整理，编入契约出来后按它收敛。
 */

export interface PluginPageEntry {
  /** 页面绝对路径（routePrefix 已含）。 */
  path: string;
  title: string;
  /** handle.permission，页面级守卫；按钮级再按动作权限码控。 */
  permission: string;
  /** 是否进后台菜单（设计器子页不进菜单）。 */
  inMenu: boolean;
}

export interface SandworkflowManifest {
  code: 'sandworkflow';
  /** 前端路由前缀；与后端 API 组 /app/sandworkflow/admin 同域。 */
  routePrefix: string;
  /**
   * 后端 API 前缀：SaiAdmin 风格路由组挂在后端根路径
   * （plugin/sandworkflow/config/route.php），响应壳 {code,message,data}，
   * 与宿主 /admin/v1 契约不同，请求走 api/pluginClient.ts。
   */
  apiPrefix: string;
  /** 权限码/菜单 slug 前缀。 */
  permissionPrefix: string;
  /** 入口路由模块（RouteObject[]，格式同宿主 routes/modules/*.tsx）。 */
  routes: RouteObject[];
  pages: PluginPageEntry[];
  /** 依赖宿主提供的模块与版本基线（host/web/package.json 实测）。 */
  hostDependencies: Record<string, string>;
  /** 依赖宿主注入的共享模块。 */
  hostModules: string[];
  /** 依赖宿主 locales 合并：本文件提供 i18n/zh-CN/workflow.ts（命名空间 workflow）。 */
  localeNamespaces: string[];
}

export const manifest: SandworkflowManifest = {
  code: 'sandworkflow',
  routePrefix: '/app/sandworkflow',
  apiPrefix: '/app/sandworkflow/admin',
  permissionPrefix: 'sandworkflow',
  routes,
  pages: [
    {
      path: '/app/sandworkflow/definitions',
      title: '流程定义',
      permission: 'sandworkflow:definition:index',
      inMenu: true,
    },
    {
      path: '/app/sandworkflow/definitions/:definitionId/edit',
      title: '设计流程',
      permission: 'sandworkflow:definition:read',
      inMenu: false,
    },
  ],
  hostDependencies: {
    react: '19.1.10',
    'react-dom': '19.1.10',
    '@douyinfe/semi-ui': '2.104.0',
    '@douyinfe/semi-icons': '2.104.0',
    '@tanstack/react-query': '5.105.0',
    'react-router': '7.18.5',
    'react-i18next': '17.1.9',
  },
  hostModules: [
    '@/config/env',
    '@/lib/authToken',
    '@/lib/confirmAction',
    '@/lib/format',
    '@/components/Empty',
    '@/components/ErrorState',
    '@/components/ListPage',
    '@/components/Loading',
    '@/hooks/useCan',
    '@/hooks/useUrlQuery',
    '@/i18n/i18n',
  ],
  localeNamespaces: ['workflow'],
};

export default manifest;

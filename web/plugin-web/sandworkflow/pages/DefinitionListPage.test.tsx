import '@douyinfe/semi-ui/react19-adapter';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import i18n from '@/i18n/i18n';
import { clearToken, setToken } from '@/lib/authToken';
import { server } from '@/mocks/server';
import type { Definition } from '../api/types';
import zhCN from '../i18n/zh-CN/workflow';
import { DefinitionListPage } from './DefinitionListPage';

// 宿主 locales 合并机制未建，测试里手动挂插件命名空间。
i18n.addResourceBundle('zh-CN', 'workflow', zhCN, true, true);

const PLUGIN_API = '*/app/sandworkflow/admin';

function definitionRow(id: number, extra: Partial<Definition> = {}): Definition {
  return {
    id,
    group_id: null,
    name: `流程${id}`,
    icon: null,
    description: null,
    definition_json: null,
    permission_type: 1,
    is_cancelable: 0,
    publish_time: null,
    current_version: 0,
    status: 1,
    created_by: null,
    updated_by: null,
    create_time: null,
    update_time: null,
    ...extra,
  };
}

/** 插件端点走 SaiAdmin 信封 {code,message,data}，与宿主 v1 信封不同。 */
function useDefinitionHandlers(rows: Definition[]) {
  server.use(
    http.get(`${PLUGIN_API}/definition/index`, () =>
      HttpResponse.json({
        code: 200,
        message: 'ok',
        data: { data: rows, total: rows.length, per_page: 10, current_page: 1, last_page: 1 },
      }),
    ),
    http.get(`${PLUGIN_API}/group/all`, () =>
      HttpResponse.json({
        code: 200,
        message: 'ok',
        data: [{ id: 1, name: '人事行政', description: '', sort: 0, status: 1 }],
      }),
    ),
  );
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/sandworkflow/definitions']}>
        <Routes>
          <Route path="/app/sandworkflow/definitions" element={<DefinitionListPage />} />
          <Route
            path="/app/sandworkflow/definitions/:id/edit"
            element={<div>编辑页占位</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DefinitionListPage', () => {
  afterEach(() => {
    clearToken();
  });

  it('渲染流程定义列表的名称、状态、版本与分组列', async () => {
    setToken('mock-admin-token');
    useDefinitionHandlers([
      definitionRow(1, {
        name: '请假审批',
        group_name: '人事行政',
        publish_time: '2026-11-10 08:00:00',
        current_version: 3,
      }),
      definitionRow(2, { name: '报销审批', status: 2 }),
    ]);
    renderPage();

    expect(await screen.findByText('请假审批')).toBeInTheDocument();
    expect(screen.getByText('报销审批')).toBeInTheDocument();
    expect(screen.getByText('人事行政')).toBeInTheDocument();
    expect(screen.getByText('未分组')).toBeInTheDocument();
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByText('未发布')).toBeInTheDocument();
    // 启用/停用状态 Tag 各一。
    expect(screen.getByText('启用')).toBeInTheDocument();
    expect(screen.getByText('停用')).toBeInTheDocument();
  });

  it('空列表给空态提示与新增入口（管理员权限）', async () => {
    setToken('mock-admin-token');
    useDefinitionHandlers([]);
    renderPage();

    expect(await screen.findByText('还没有流程定义，先建一个')).toBeInTheDocument();
    // Semi 图标带 aria-label 会拼进按钮可访问名，用正则做包含匹配。
    expect(
      (await screen.findAllByRole('button', { name: /新增流程/ })).length,
    ).toBeGreaterThan(0);
  });

  it('点「设计流程」跳到该定义的编辑路由', async () => {
    setToken('mock-admin-token');
    useDefinitionHandlers([definitionRow(7, { name: '用章申请' })]);
    renderPage();

    await screen.findByText('用章申请');
    const designButtons = await screen.findAllByRole('button', { name: /设计流程/ });
    await userEvent.click(designButtons[0]!);
    expect(await screen.findByText('编辑页占位')).toBeInTheDocument();
  });

  it('列表接口返回业务 403 时显示无权限错误态', async () => {
    setToken('mock-admin-token');
    server.use(
      http.get(`${PLUGIN_API}/definition/index`, () =>
        HttpResponse.json({ code: 403, message: '没有权限访问', data: null }),
      ),
      http.get(`${PLUGIN_API}/group/all`, () =>
        HttpResponse.json({ code: 200, message: 'ok', data: [] }),
      ),
    );
    renderPage();

    expect(await screen.findByText('没有权限')).toBeInTheDocument();
  });
});

import '@douyinfe/semi-ui/react19-adapter';

import { Modal, Toast } from '@douyinfe/semi-ui';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import i18n from '@/i18n/i18n';
import { clearToken, setToken } from '@/lib/authToken';
import { server } from '@/mocks/server';
import type { Definition } from '../api/types';
import { sampleDefinitionJson } from '../components/designer/__fixtures__/sampleDefinition';
import zhCN from '../i18n/zh-CN/workflow';
import { DefinitionEditPage } from './DefinitionEditPage';

// 宿主 locales 合并机制未建，测试里手动挂插件命名空间。
i18n.addResourceBundle('zh-CN', 'workflow', zhCN, true, true);

const PLUGIN_API = '*/app/sandworkflow/admin';
const NETWORK_ERROR_TEXT = '网络好像断了，请检查网络后再试';

/** 带未发布草稿的已发布定义：基础信息走信封 meta，画布内容走信封 definition_json。 */
function draftDefinition(): Definition {
  return {
    id: 5,
    group_id: null,
    name: '请假审批',
    icon: null,
    description: null,
    definition_json: sampleDefinitionJson,
    permission_type: 2,
    is_cancelable: 0,
    publish_time: '2026-11-10 08:00:00',
    current_version: 3,
    status: 1,
    created_by: null,
    updated_by: null,
    create_time: null,
    update_time: null,
    can_manage: true,
    has_draft: true,
    draft_json: {
      meta: { name: '请假审批' },
      definition_json: sampleDefinitionJson,
    },
  };
}

function useEditHandlers(): void {
  server.use(
    http.get(`${PLUGIN_API}/definition/read`, () =>
      HttpResponse.json({ code: 200, message: 'ok', data: draftDefinition() }),
    ),
  );
}

/**
 * /me 覆盖成只有查看码的账号：mock 用户表里没有插件权限组合的现成身份，
 * 测试直接回 v1 信封 {data, request_id}，useCan 只读 permissions。
 */
function useReadOnlyMe(): void {
  server.use(
    http.get('*/api/admin/v1/me', () =>
      HttpResponse.json({
        data: {
          id: 'u-reader',
          username: 'reader',
          nickname: '只读用户',
          permissions: [
            'sandworkflow:definition:index',
            'sandworkflow:definition:read',
            'sandworkflow:group:all',
            'sandworkflow:index:list-users',
            'sandworkflow:index:list-roles',
            'sandworkflow:index:list-depts',
          ],
        },
        request_id: 'test-reader',
      }),
    ),
    http.get(`${PLUGIN_API}/group/all`, () =>
      HttpResponse.json({ code: 200, message: 'ok', data: [] }),
    ),
    http.get(`${PLUGIN_API}/index/listUsers`, () =>
      HttpResponse.json({ code: 200, message: 'ok', data: [] }),
    ),
    http.get(`${PLUGIN_API}/index/listRoles`, () =>
      HttpResponse.json({ code: 200, message: 'ok', data: [] }),
    ),
    http.get(`${PLUGIN_API}/index/listDepts`, () =>
      HttpResponse.json({ code: 200, message: 'ok', data: [] }),
    ),
  );
}

function renderEditPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // useBlocker 需要 data router 上下文，组件式 MemoryRouter 不提供。
  const router = createMemoryRouter(
    [
      {
        path: '/app/sandworkflow/definitions/:definitionId/edit',
        element: <DefinitionEditPage />,
      },
    ],
    { initialEntries: ['/app/sandworkflow/definitions/5/edit'] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

/**
 * Semi 弹窗内置确定/取消按钮的可访问名是 confirm/cancel，
 * 按按钮内的可见文字点击。
 */
async function clickDialogButton(text: string) {
  const dialogs = await screen.findAllByRole('dialog');
  // Modal.confirm 的弹层挂在 React 根之外，最新打开的弹层在 DOM 里最后，取最后一个。
  const modals = dialogs.filter((el) => el.className.includes('semi-modal-content'));
  const modal = modals[modals.length - 1];
  expect(modal, 'modal dialog').toBeTruthy();
  const button = within(modal as HTMLElement)
    .getAllByRole('button')
    .find((el) => el.textContent?.includes(text));
  expect(button, `dialog button "${text}"`).toBeTruthy();
  await userEvent.click(button as HTMLElement);
}

describe('DefinitionEditPage', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
    clearToken();
    Toast.destroyAll();
    Modal.destroyAll();
  });

  it('断网点发布立即提示网络错误，请求真实发出不挂起', async () => {
    setToken('mock-admin-token');
    let publishCalls = 0;
    useEditHandlers();
    server.use(
      http.post(`${PLUGIN_API}/definition/publish`, () => {
        publishCalls += 1;
        return HttpResponse.error();
      }),
    );
    renderEditPage();

    // 等画布和权限都回来再断网：页面初始查询本身也走 online 口径。
    expect(await screen.findByText('直属主管审批')).toBeInTheDocument();
    const publishButton = await screen.findByRole('button', { name: '发布' });
    onlineManager.setOnline(false);
    await userEvent.click(publishButton);
    await clickDialogButton('确定');

    expect(await screen.findByText(NETWORK_ERROR_TEXT)).toBeInTheDocument();
    // fetch 真发出（networkMode 'always'）而不是被 React Query 暂停，画布内容不丢。
    expect(publishCalls).toBe(1);
    expect(screen.getByText('直属主管审批')).toBeInTheDocument();
  });

  it('断网点放弃草稿立即提示网络错误，请求真实发出不挂起', async () => {
    setToken('mock-admin-token');
    let discardCalls = 0;
    useEditHandlers();
    server.use(
      http.post(`${PLUGIN_API}/definition/discardDraft`, () => {
        discardCalls += 1;
        return HttpResponse.error();
      }),
    );
    renderEditPage();

    const discardButton = await screen.findByRole('button', { name: '放弃草稿' });
    onlineManager.setOnline(false);
    await userEvent.click(discardButton);
    await clickDialogButton('确定');

    expect(await screen.findByText(NETWORK_ERROR_TEXT)).toBeInTheDocument();
    expect(discardCalls).toBe(1);
    expect(screen.getByText('直属主管审批')).toBeInTheDocument();
  });

  it('只有查看码的用户进设计器：只读横幅、控件禁用、画布无增删改入口', async () => {
    setToken('mock-reader-token');
    useEditHandlers();
    useReadOnlyMe();
    renderEditPage();

    // 顶部「只读，无编辑权限」标识；画布节点照常可看。
    expect(await screen.findByText('只读，无编辑权限')).toBeInTheDocument();
    expect(await screen.findByText('直属主管审批')).toBeInTheDocument();
    // 顶栏流程名/状态禁用，保存/发布入口不出现。
    expect(screen.getByPlaceholderText('流程名称')).toBeDisabled();
    expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '发布' })).not.toBeInTheDocument();
    // 画布增删改入口全部不收：插节点、删节点、加分支。
    expect(screen.queryAllByRole('button', { name: '插入节点' })).toHaveLength(0);
    expect(screen.queryAllByRole('button', { name: '删除节点' })).toHaveLength(0);
    expect(screen.queryAllByRole('button', { name: '添加分支' })).toHaveLength(0);
    // 点选节点仍可查看配置，但属性面板全部禁用。
    await userEvent.click(screen.getByText('直属主管审批'));
    expect(await screen.findByDisplayValue('直属主管审批')).toBeDisabled();
    expect(screen.getByRole('button', { name: /添加处理方式/ })).toBeDisabled();
    // 流程设置面板同样全部禁用。
    await userEvent.click(screen.getByRole('button', { name: '流程设置' }));
    expect(
      await screen.findByPlaceholderText('给使用人看看这个流程是干什么的'),
    ).toBeDisabled();
  });

  it('保存草稿后端回 HTTP 403 时提示透传后端 message', async () => {
    setToken('mock-admin-token');
    useEditHandlers();
    server.use(
      http.post(`${PLUGIN_API}/definition/saveDraft`, () =>
        HttpResponse.json(
          { code: 403, message: '权限不足，无法访问或操作', data: null },
          { status: 403 },
        ),
      ),
    );
    renderEditPage();

    await screen.findByText('直属主管审批');
    await userEvent.click(await screen.findByRole('button', { name: '保存' }));

    expect(await screen.findByText('权限不足，无法访问或操作')).toBeInTheDocument();
    expect(screen.queryByText('系统出了点问题，请稍后再试')).not.toBeInTheDocument();
  });
});

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
});

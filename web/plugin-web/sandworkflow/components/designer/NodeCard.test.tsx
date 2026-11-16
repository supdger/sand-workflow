import '@douyinfe/semi-ui/react19-adapter';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import i18n from '@/i18n/i18n';
import type { FlowNode } from '../../api/types';
import { NODE_TYPE } from '../../api/types';
import zhCN from '../../i18n/zh-CN/workflow';
import { NodeCard } from './NodeCard';

// 宿主 locales 合并机制未建，测试里手动挂插件命名空间。
i18n.addResourceBundle('zh-CN', 'workflow', zhCN, true, true);

function approveNode(extra: Partial<FlowNode> = {}): FlowNode {
  return {
    type: NODE_TYPE.APPROVE,
    id: 'node_a1',
    name: '主管审批',
    assignees: [{ assigneeType: 3, roles: [2] }],
    multiInstanceApprovalType: 0,
    childNode: null,
    ...extra,
  };
}

describe('NodeCard', () => {
  it('渲染类型标签、节点名与处理人摘要', () => {
    render(
      <NodeCard node={approveNode()} selected={false} onSelect={() => {}} />,
    );
    expect(screen.getByText('审批人')).toBeInTheDocument();
    expect(screen.getByText('主管审批')).toBeInTheDocument();
    expect(screen.getByText('指定角色（1） · 或签')).toBeInTheDocument();
  });

  it('未知节点类型标红但仍渲染，名字缺失给「未命名」兜底', () => {
    render(
      <NodeCard
        node={{ type: 6, id: 'node_old', name: '旧触发器', childNode: null }}
        selected={false}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('不支持节点(6)')).toBeInTheDocument();
    expect(screen.getByText('当前版本不支持的节点')).toBeInTheDocument();

    render(
      <NodeCard
        node={{ type: NODE_TYPE.COPY, id: 'node_cc', childNode: null, ccs: [] }}
        selected={false}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('未命名')).toBeInTheDocument();
    expect(screen.getByText('未配置抄送人')).toBeInTheDocument();
  });

  it('点卡片回调 onSelect，发起节点不给删除按钮', async () => {
    const onSelect = vi.fn();
    render(
      <NodeCard
        node={{ type: NODE_TYPE.START, id: 'node_start', name: '发起', childNode: null }}
        selected={false}
        onSelect={onSelect}
        onRemove={() => {}}
      />,
    );
    // 发起节点不可删，卡片本身是页面上唯一的 button 角色。
    await userEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('node_start');
    // 发起节点不可删，即使传了 onRemove 也不出删除按钮。
    expect(screen.queryByRole('button', { name: '删除节点' })).toBeNull();
  });

  it('可删节点点删除按钮回调 onRemove 且不触发选中', async () => {
    const onSelect = vi.fn();
    const onRemove = vi.fn();
    render(
      <NodeCard node={approveNode()} selected={false} onSelect={onSelect} onRemove={onRemove} />,
    );
    await userEvent.click(screen.getByRole('button', { name: '删除节点' }));
    expect(onRemove).toHaveBeenCalledWith('node_a1');
    expect(onSelect).not.toHaveBeenCalled();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import i18n from '@/i18n/i18n';
import zhCN from '../i18n/zh-CN/workflow';
import { FlowStatusStamp } from './FlowStatusStamp';

// 宿主 locales 合并机制未建，测试里手动挂插件命名空间。
i18n.addResourceBundle('zh-CN', 'workflow', zhCN, true, true);

describe('FlowStatusStamp', () => {
  it('按 flow_status 0-3 渲染对应状态文字', () => {
    const cases: [number, string][] = [
      [0, '审批中'],
      [1, '已通过'],
      [2, '已拒绝'],
      [3, '已撤销'],
    ];
    for (const [status, text] of cases) {
      const { unmount } = render(<FlowStatusStamp status={status} />);
      expect(screen.getByRole('img', { name: text })).toBeInTheDocument();
      unmount();
    }
  });

  it('未知状态回落为「未知」灰章', () => {
    render(<FlowStatusStamp status={99} />);
    expect(screen.getByRole('img', { name: '未知' })).toBeInTheDocument();
  });
});

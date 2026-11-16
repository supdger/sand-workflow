import type { MouseEvent } from 'react';

import { Button, Tag, Typography } from '@douyinfe/semi-ui';
import { IconChevronLeft, IconChevronRight, IconClose } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';

import type { FlowNode } from '../../api/types';
import { isDefaultBranch, nodeKeyOf } from '../../model/nodeTypes';
import { summarizeNode } from '../../model/nodeSummary';
import type { CanvasHandlers } from './canvasHandlers';
import { NodeChain } from './NodeChain';
import { NodeInsertButton } from './NodeInsertButton';

export interface BranchColumnProps extends CanvasHandlers {
  branch: FlowNode;
  /** 所属网关的标识，增删/调序回调都要带上。 */
  gatewayKey: string;
  canRemove: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
}

const STUB_STYLE = { width: 1, height: 12, backgroundColor: 'var(--semi-color-border)' };

/**
 * 单条条件分支列：分支头（名称/默认标记/条件摘要/调序与删除按钮）
 * + 分支内的节点链。分支头是 type=3 节点本体，点选后由设置面板配条件。
 */
export function BranchColumn({
  branch,
  gatewayKey,
  canRemove,
  canMoveLeft,
  canMoveRight,
  ...handlers
}: BranchColumnProps) {
  const { t } = useTranslation('workflow');
  const branchKey = nodeKeyOf(branch);
  const isDefault = isDefaultBranch(branch);

  const stop = (event: MouseEvent, action: () => void) => {
    event.stopPropagation();
    action();
  };

  return (
    <div className="flex w-56 flex-col items-center">
      <div
        role="button"
        tabIndex={0}
        className="w-full cursor-pointer rounded-lg border px-3 py-2"
        style={{
          backgroundColor: 'var(--semi-color-bg-1)',
          borderColor:
            handlers.selectedKey === branchKey
              ? 'var(--semi-color-primary)'
              : 'var(--semi-color-border)',
        }}
        onClick={() => handlers.onSelect(branchKey)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handlers.onSelect(branchKey);
          }
        }}
      >
        <div className="flex items-center justify-between gap-1">
          <Typography.Text strong ellipsis={{ showTooltip: true }}>
            {branch.name || t('designer.branch.unnamed')}
          </Typography.Text>
          <div className="flex items-center">
            {canMoveLeft ? (
              <Button
                icon={<IconChevronLeft />}
                size="small"
                theme="borderless"
                aria-label={t('designer.branch.moveLeft')}
                onClick={(event) => stop(event, () => handlers.onMoveBranch(gatewayKey, branchKey, -1))}
              />
            ) : null}
            {canMoveRight ? (
              <Button
                icon={<IconChevronRight />}
                size="small"
                theme="borderless"
                aria-label={t('designer.branch.moveRight')}
                onClick={(event) => stop(event, () => handlers.onMoveBranch(gatewayKey, branchKey, 1))}
              />
            ) : null}
            {canRemove ? (
              <Button
                icon={<IconClose />}
                size="small"
                theme="borderless"
                type="danger"
                aria-label={t('designer.branch.delete')}
                onClick={(event) => stop(event, () => handlers.onRemoveBranch(gatewayKey, branchKey))}
              />
            ) : null}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1">
          {isDefault ? (
            <Tag size="small" color="grey">
              {t('designer.branch.default')}
            </Tag>
          ) : null}
          <Typography.Text type="secondary" size="small">
            {summarizeNode(branch)}
          </Typography.Text>
        </div>
      </div>
      <div style={STUB_STYLE} />
      {branch.childNode ? (
        <NodeChain node={branch.childNode} {...handlers} />
      ) : handlers.readOnly ? null : (
        <NodeInsertButton onInsert={(type) => handlers.onInsert(branchKey, type)} />
      )}
    </div>
  );
}

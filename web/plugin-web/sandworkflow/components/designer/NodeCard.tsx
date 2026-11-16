import type { ComponentProps, MouseEvent } from 'react';

import { Button, Tag, Typography } from '@douyinfe/semi-ui';
import { IconClose } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';

import type { FlowNode } from '../../api/types';
import { NODE_TYPE } from '../../api/types';
import { isRemovableNode, isSupportedNodeType, nodeKeyOf, nodeTypeLabel } from '../../model/nodeTypes';
import { summarizeNode } from '../../model/nodeSummary';

export interface NodeCardProps {
  node: FlowNode;
  selected: boolean;
  onSelect: (key: string) => void;
  onRemove?: (key: string) => void;
}

type TagColor = ComponentProps<typeof Tag>['color'];

const NODE_TAG_COLORS: Record<number, TagColor> = {
  [NODE_TYPE.START]: 'blue',
  [NODE_TYPE.APPROVE]: 'orange',
  [NODE_TYPE.TRANSACT]: 'violet',
  [NODE_TYPE.COPY]: 'cyan',
  [NODE_TYPE.EXCLUSIVE_GATEWAY]: 'indigo',
  [NODE_TYPE.CONDITION]: 'light-blue',
  [NODE_TYPE.END]: 'grey',
};

/**
 * 单个节点卡片：类型 Tag + 节点名 + 摘要行（谁在什么规则下干活）。
 * 不展示 id/nodeId；老数据的未知类型标红但保留在画布上（F-09）。
 */
export function NodeCard({ node, selected, onSelect, onRemove }: NodeCardProps) {
  const { t } = useTranslation('workflow');
  const key = nodeKeyOf(node);
  const supported = isSupportedNodeType(node.type);
  const tagColor = supported ? (NODE_TAG_COLORS[node.type] ?? 'red') : 'red';
  const removable = isRemovableNode(node) && onRemove !== undefined;

  const handleRemove = (event: MouseEvent) => {
    event.stopPropagation();
    onRemove?.(key);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="w-64 cursor-pointer rounded-lg border px-3 py-2 text-left"
      style={{
        backgroundColor: 'var(--semi-color-bg-1)',
        borderColor: selected ? 'var(--semi-color-primary)' : 'var(--semi-color-border)',
        boxShadow: selected ? '0 0 0 1px var(--semi-color-primary)' : 'var(--semi-shadow-elevated)',
      }}
      onClick={() => onSelect(key)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(key);
        }
      }}
    >
      <div className="flex items-center justify-between">
        <Tag color={tagColor} size="small">
          {supported
            ? nodeTypeLabel(node.type)
            : t('designer.node.unsupported', { type: node.type })}
        </Tag>
        {removable ? (
          <Button
            icon={<IconClose />}
            size="small"
            theme="borderless"
            aria-label={t('designer.node.delete')}
            onClick={handleRemove}
          />
        ) : null}
      </div>
      <div className="mt-1">
        <Typography.Text strong ellipsis={{ showTooltip: true }}>
          {node.name || t('designer.node.unnamed')}
        </Typography.Text>
      </div>
      <Typography.Text type="secondary" size="small">
        {summarizeNode(node)}
      </Typography.Text>
    </div>
  );
}

import type { Dispatch } from 'react';

import { Typography } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

import type { FlowNode } from '../../../api/types';
import type { DraftAction } from '../../../hooks/useDefinitionDraft';
import { NodeNameField } from './NodeNameField';

export interface GatewayPanelProps {
  /** 排他网关节点（type=4）或结束节点（type=9）等无专属配置的节点。 */
  node: FlowNode;
  dispatch: Dispatch<DraftAction>;
}

/**
 * 网关/结束等无专属配置的节点面板：只给节点名。
 * 分支的增删与排序在画布上操作（GatewayBranches）。
 */
export function GatewayPanel({ node, dispatch }: GatewayPanelProps) {
  const { t } = useTranslation('workflow');
  return (
    <div className="flex flex-col gap-3">
      <NodeNameField node={node} dispatch={dispatch} />
      <Typography.Text size="small" type="tertiary">
        {t('designer.panels.gatewayHint')}
      </Typography.Text>
    </div>
  );
}

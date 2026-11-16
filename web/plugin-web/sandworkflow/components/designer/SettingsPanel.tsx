import type { Dispatch } from 'react';

import { Tag, Typography } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

import type { FlowNode, FlowWidget } from '../../api/types';
import { NODE_TYPE } from '../../api/types';
import type { DraftAction } from '../../hooks/useDefinitionDraft';
import { isSupportedNodeType, nodeTypeLabel } from '../../model/nodeTypes';
import { summarizeNode } from '../../model/nodeSummary';
import { AssigneePanel } from './panels/AssigneePanel';
import { ConditionPanel } from './panels/ConditionPanel';
import { CopyPanel } from './panels/CopyPanel';
import { GatewayPanel } from './panels/GatewayPanel';
import { StartPanel } from './panels/StartPanel';

export interface SettingsPanelProps {
  node: FlowNode | null;
  dispatch: Dispatch<DraftAction>;
  /** 草稿的 flowWidgets，条件面板取左值候选、字段权限区取字段全集。 */
  widgets: FlowWidget[];
  /** 全树被条件引用的字段名，字段权限区据此禁掉可编辑项。 */
  conditionVars: Set<string>;
}

/**
 * 右侧设置面板容器：头部展示节点类型/名称/摘要，
 * 主体按节点类型分发到 panels/ 下的专属面板；所有改动经 dispatch
 * 走 useDefinitionDraft 的 action，不直接摸树。
 */
export function SettingsPanel({ node, dispatch, widgets, conditionVars }: SettingsPanelProps) {
  const { t } = useTranslation('workflow');

  const body = (() => {
    if (!node) {
      return null;
    }
    switch (node.type) {
      case NODE_TYPE.START:
        return <StartPanel node={node} dispatch={dispatch} />;
      case NODE_TYPE.APPROVE:
      case NODE_TYPE.TRANSACT:
        return (
          <AssigneePanel node={node} dispatch={dispatch} widgets={widgets} conditionVars={conditionVars} />
        );
      case NODE_TYPE.COPY:
        return (
          <CopyPanel node={node} dispatch={dispatch} widgets={widgets} conditionVars={conditionVars} />
        );
      case NODE_TYPE.CONDITION:
        return <ConditionPanel node={node} dispatch={dispatch} widgets={widgets} />;
      case NODE_TYPE.EXCLUSIVE_GATEWAY:
      case NODE_TYPE.END:
        return <GatewayPanel node={node} dispatch={dispatch} />;
      default:
        // 未知类型节点（老数据）：不给编辑入口，JSON 层原样保留（F-09）。
        return (
          <Typography.Text size="small" type="tertiary">
            {t('designer.panels.unsupportedHint')}
          </Typography.Text>
        );
    }
  })();

  return (
    <div
      className="flex h-full w-96 flex-col gap-3 overflow-auto px-4 py-4"
      style={{ borderLeft: '1px solid var(--semi-color-border)' }}
    >
      <Typography.Title heading={6} style={{ margin: 0 }}>
        {t('designer.settings.title')}
      </Typography.Title>
      {node ? (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Tag size="small" color={isSupportedNodeType(node.type) ? 'blue' : 'red'}>
                {isSupportedNodeType(node.type)
                  ? nodeTypeLabel(node.type)
                  : t('designer.node.unsupported', { type: node.type })}
              </Tag>
              <Typography.Text strong>{node.name || t('designer.node.unnamed')}</Typography.Text>
            </div>
            <Typography.Text type="secondary" size="small">
              {summarizeNode(node)}
            </Typography.Text>
          </div>
          {body}
        </>
      ) : (
        <Typography.Text type="secondary" size="small">
          {t('designer.settings.empty')}
        </Typography.Text>
      )}
    </div>
  );
}

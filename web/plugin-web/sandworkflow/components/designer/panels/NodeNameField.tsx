import type { Dispatch } from 'react';

import { Input, Typography } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

import type { FlowNode } from '../../../api/types';
import type { DraftAction } from '../../../hooks/useDefinitionDraft';
import { nodeKeyOf } from '../../../model/nodeTypes';

export interface NodeNameFieldProps {
  node: FlowNode;
  dispatch: Dispatch<DraftAction>;
  /** 只读展示当前值，不给改。 */
  disabled?: boolean;
}

/** 各节点面板共用的节点名编辑：直接 updateNode 写 name。 */
export function NodeNameField({ node, dispatch, disabled }: NodeNameFieldProps) {
  const { t } = useTranslation('workflow');
  return (
    <div className="flex flex-col gap-1">
      <Typography.Text size="small" type="secondary">
        {t('designer.panels.nodeName')}
      </Typography.Text>
      <Input
        value={node.name ?? ''}
        maxLength={60}
        placeholder={t('designer.node.unnamed')}
        disabled={disabled}
        onChange={(value) =>
          dispatch({ type: 'updateNode', nodeKey: nodeKeyOf(node), patch: { name: value } })
        }
      />
    </div>
  );
}

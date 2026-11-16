import type { Dispatch } from 'react';

import { Typography } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

import type { FlowNode } from '../../../api/types';
import type { DraftAction } from '../../../hooks/useDefinitionDraft';
import { NodeNameField } from './NodeNameField';

export interface StartPanelProps {
  node: FlowNode;
  dispatch: Dispatch<DraftAction>;
  readOnly?: boolean;
}

/**
 * 发起节点面板：只改节点名；「谁能发起」归流程级设置面板管，
 * 这里只指过去，两处不重复配置。
 */
export function StartPanel({ node, dispatch, readOnly }: StartPanelProps) {
  const { t } = useTranslation('workflow');
  return (
    <div className="flex flex-col gap-3">
      <NodeNameField node={node} dispatch={dispatch} disabled={readOnly} />
      <Typography.Text size="small" type="tertiary">
        {t('designer.panels.startHint')}
      </Typography.Text>
    </div>
  );
}

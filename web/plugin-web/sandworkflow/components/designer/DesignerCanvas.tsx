import { Typography } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

import type { FlowNode } from '../../api/types';
import { NODE_TYPE } from '../../api/types';
import { chainTail } from '../../model/nodeTree';
import type { CanvasHandlers } from './canvasHandlers';
import { NodeChain } from './NodeChain';

export interface DesignerCanvasProps extends CanvasHandlers {
  root: FlowNode;
}

/**
 * 设计器画布：自研线性节点链竖向渲染（ADR-2），不引图库。
 * 发起节点卡片 → 节点卡片链 → 「流程结束」展示标记；链尾已有
 * type=9 结束节点时不重复画标记。
 */
export function DesignerCanvas({ root, ...handlers }: DesignerCanvasProps) {
  const { t } = useTranslation('workflow');
  const tailIsEnd = chainTail(root).type === NODE_TYPE.END;
  return (
    <div
      className="flex flex-col items-center overflow-auto py-8"
      style={handlers.readOnly ? { opacity: 0.85 } : undefined}
    >
      <NodeChain node={root} {...handlers} />
      {tailIsEnd ? null : (
        <div
          className="w-64 rounded-lg border px-3 py-2 text-center"
          style={{
            borderColor: 'var(--semi-color-border)',
            backgroundColor: 'var(--semi-color-fill-0)',
          }}
        >
          <Typography.Text type="secondary">{t('designer.chainEnd')}</Typography.Text>
        </div>
      )}
    </div>
  );
}

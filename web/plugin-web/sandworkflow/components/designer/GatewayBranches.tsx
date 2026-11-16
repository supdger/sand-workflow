import { Button, Tooltip } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';

import type { FlowNode } from '../../api/types';
import { isDefaultBranch, nodeKeyOf } from '../../model/nodeTypes';
import { BranchColumn } from './BranchColumn';
import type { CanvasHandlers } from './canvasHandlers';

export interface GatewayBranchesProps extends CanvasHandlers {
  gateway: FlowNode;
}

/**
 * 排他网关的分支容器：conditionNodes 渲染成并排分支列。
 * 默认分支（conditionGroups 为空）必须排最后，它的左右移动与
 * 「别的分支越过它」的移动都不给按钮。
 */
export function GatewayBranches({ gateway, ...handlers }: GatewayBranchesProps) {
  const { t } = useTranslation('workflow');
  const branches = gateway.conditionNodes ?? [];
  const gatewayKey = nodeKeyOf(gateway);
  return (
    <div
      className="flex items-start gap-4 rounded-lg border px-4 pt-4 pb-2"
      style={{
        borderColor: 'var(--semi-color-border)',
        backgroundColor: 'var(--semi-color-fill-0)',
      }}
    >
      {branches.map((branch, index) => {
        const isDefault = isDefaultBranch(branch);
        const next = branches[index + 1];
        const writable = !handlers.readOnly;
        return (
          <BranchColumn
            key={nodeKeyOf(branch)}
            branch={branch}
            gatewayKey={gatewayKey}
            canRemove={writable && branches.length > 2}
            canMoveLeft={writable && !isDefault && index > 0}
            canMoveRight={writable && !isDefault && next !== undefined && !isDefaultBranch(next)}
            {...handlers}
          />
        );
      })}
      {handlers.readOnly ? null : (
        <div className="flex flex-col items-center self-stretch pt-2">
          <Tooltip content={t('designer.branch.add')} position="top">
            <Button
              icon={<IconPlus />}
              size="small"
              theme="light"
              aria-label={t('designer.branch.add')}
              onClick={() => handlers.onAddBranch(gatewayKey)}
            />
          </Tooltip>
        </div>
      )}
    </div>
  );
}

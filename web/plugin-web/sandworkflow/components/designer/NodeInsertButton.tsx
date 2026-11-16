import { Button, Dropdown } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';

import { INSERTABLE_NODE_TYPES, nodeTypeLabel } from '../../model/nodeTypes';

export interface NodeInsertButtonProps {
  onInsert: (type: number) => void;
}

/**
 * 链上插入点：Dropdown 选节点类型。只列后端能发布的类型
 * （审批/办理/抄送/排他网关），触发器与未知类型不给入口（F-09）。
 */
export function NodeInsertButton({ onInsert }: NodeInsertButtonProps) {
  const { t } = useTranslation('workflow');
  return (
    <Dropdown
      trigger="click"
      position="bottom"
      render={
        <Dropdown.Menu>
          {INSERTABLE_NODE_TYPES.map((type) => (
            <Dropdown.Item key={type} onClick={() => onInsert(type)}>
              {nodeTypeLabel(type)}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      }
    >
      <Button icon={<IconPlus />} size="small" theme="solid" aria-label={t('designer.insertNode')} />
    </Dropdown>
  );
}

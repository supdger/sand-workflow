import { useMemo } from 'react';

import { TreeSelect } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

import { useOrgDepts } from '../../hooks/useOrgData';
import { buildDeptTree } from './deptTree';

export interface DeptPickerProps {
  /** 已选部门 id 列表。 */
  value: (number | string)[];
  onChange: (ids: (number | string)[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * 部门树多选：listDepts 平铺数据自组树。
 * checkRelation 取 unRelated——发起范围里「部门」的语义本来就是
 * 本部门及下属成员（后端按祖先链判定），勾选父级不需要把子级全写进配置。
 */
export function DeptPicker({ value, onChange, placeholder, disabled }: DeptPickerProps) {
  const { t } = useTranslation('workflow');
  const depts = useOrgDepts();
  const tree = useMemo(() => buildDeptTree(depts.data ?? []), [depts.data]);
  return (
    <TreeSelect
      multiple
      checkRelation="unRelated"
      filterTreeNode
      treeData={tree}
      value={value}
      placeholder={placeholder ?? t('org.deptPlaceholder')}
      emptyContent={depts.isPending ? t('org.loading') : t('org.emptyDepts')}
      maxTagCount={3}
      showClear
      disabled={disabled}
      style={{ width: '100%' }}
      onChange={(next) => {
        const ids = Array.isArray(next) ? next : [];
        onChange(ids.map((id) => Number(id)));
      }}
    />
  );
}

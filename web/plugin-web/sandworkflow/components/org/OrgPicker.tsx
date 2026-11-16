import { Typography } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

import type { FlowInitiator, OrgDept, OrgRole, OrgUser } from '../../api/types';
import { useOrgDepts, useOrgRoles, useOrgUsers } from '../../hooks/useOrgData';
import { initiatorIds, replaceInitiators } from '../../model/initiators';
import { DeptPicker } from './DeptPicker';
import { RolePicker } from './RolePicker';
import { UserPicker, userDisplayName } from './UserPicker';

export interface OrgPickerProps {
  /** flowInitiators 条目数组：三个维度并存的扁平并集。 */
  value: FlowInitiator[];
  onChange: (items: FlowInitiator[]) => void;
  disabled?: boolean;
}

/**
 * 发起范围三维度选人：按成员 / 按部门 / 按角色各一条多选，
 * 合并输出 {type,id,name} 条目数组（name 仅展示用，后端只比 type/id）。
 * 契约缺口：用户角色/部门链无端点，选人只按三个候选列表，不做归属预览。
 */
export function OrgPicker({ value, onChange, disabled }: OrgPickerProps) {
  const { t } = useTranslation('workflow');
  const users = useOrgUsers();
  const roles = useOrgRoles();
  const depts = useOrgDepts();

  const userNameOf = (id: number | string) => {
    const user = (users.data ?? []).find((item: OrgUser) => String(item.id) === String(id));
    return user ? userDisplayName(user) : undefined;
  };
  const roleNameOf = (id: number | string) =>
    (roles.data ?? []).find((item: OrgRole) => String(item.id) === String(id))?.name;
  const deptNameOf = (id: number | string) =>
    (depts.data ?? []).find((item: OrgDept) => String(item.id) === String(id))?.name;

  const entriesOf = (type: 'user' | 'dept' | 'role', ids: (number | string)[]): FlowInitiator[] => {
    const nameOf = type === 'user' ? userNameOf : type === 'dept' ? deptNameOf : roleNameOf;
    return ids.map((id) => ({ type, id, ...(nameOf(id) !== undefined ? { name: nameOf(id) } : {}) }));
  };

  const rows: {
    type: 'user' | 'dept' | 'role';
    label: string;
    picker: React.ReactNode;
  }[] = [
    {
      type: 'user',
      label: t('org.byUser'),
      picker: (
        <UserPicker
          value={initiatorIds(value, 'user')}
          disabled={disabled}
          onChange={(ids) => onChange(replaceInitiators(value, 'user', entriesOf('user', ids)))}
        />
      ),
    },
    {
      type: 'dept',
      label: t('org.byDept'),
      picker: (
        <DeptPicker
          value={initiatorIds(value, 'dept')}
          disabled={disabled}
          onChange={(ids) => onChange(replaceInitiators(value, 'dept', entriesOf('dept', ids)))}
        />
      ),
    },
    {
      type: 'role',
      label: t('org.byRole'),
      picker: (
        <RolePicker
          value={initiatorIds(value, 'role')}
          disabled={disabled}
          onChange={(ids) => onChange(replaceInitiators(value, 'role', entriesOf('role', ids)))}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.type} className="flex items-center gap-2">
          <Typography.Text size="small" className="w-14 shrink-0">
            {row.label}
          </Typography.Text>
          <div className="min-w-0 flex-1">{row.picker}</div>
        </div>
      ))}
    </div>
  );
}

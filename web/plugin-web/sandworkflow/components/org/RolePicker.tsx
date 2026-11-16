import { Select } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

import { useOrgRoles } from '../../hooks/useOrgData';

export interface RolePickerProps {
  /** 已选角色 id 列表。 */
  value: (number | string)[];
  onChange: (ids: (number | string)[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * 启用角色多选：listRoles 全量返回，本地 filter 过滤；
 * label 带 code，与后端 roles: int[] 形态对应。
 */
export function RolePicker({ value, onChange, placeholder, disabled }: RolePickerProps) {
  const { t } = useTranslation('workflow');
  const roles = useOrgRoles();
  const options = (roles.data ?? []).map((role) => ({
    value: role.id,
    label: `${role.name}（${role.code}）`,
  }));
  const known = new Set(options.map((option) => String(option.value)));
  const missing = value
    .filter((id) => !known.has(String(id)))
    .map((id) => ({ value: id, label: t('org.missingRole', { id }) }));
  return (
    <Select
      multiple
      filter
      value={value}
      optionList={[...options, ...missing]}
      placeholder={placeholder ?? t('org.rolePlaceholder')}
      emptyContent={roles.isPending ? t('org.loading') : t('org.emptyRoles')}
      loading={roles.isPending}
      maxTagCount={3}
      showClear
      disabled={disabled}
      style={{ width: '100%' }}
      onChange={(next) => onChange(Array.isArray(next) ? (next as (number | string)[]) : [])}
    />
  );
}

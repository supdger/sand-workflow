import { Select } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

import type { OrgUser } from '../../api/types';
import { useOrgUsers } from '../../hooks/useOrgData';

export interface UserPickerProps {
  /** 已选用户 id 列表（原值类型随行，user 条目按字符串比对）。 */
  value: (number | string)[];
  onChange: (ids: (number | string)[]) => void;
  placeholder?: string;
  disabled?: boolean;
  /** 已选数量上限（如发起人自选槽位 1-25）；缺省不限。 */
  max?: number;
}

export function userDisplayName(user: OrgUser): string {
  return user.nickname || user.username;
}

/**
 * 启用用户多选：listUsers 全量返回、无搜索参数，
 * 用 Select 本地 filter 过滤（契约 §6 缺口的既定做法）。
 */
export function UserPicker({ value, onChange, placeholder, disabled, max }: UserPickerProps) {
  const { t } = useTranslation('workflow');
  const users = useOrgUsers();
  const options = (users.data ?? []).map((user) => ({
    value: user.id,
    label: `${userDisplayName(user)}（${user.username}）`,
  }));
  // 已选 id 不在候选里（停用/老数据）时补一个占位项，保证回显不丢值。
  const known = new Set(options.map((option) => String(option.value)));
  const missing = value
    .filter((id) => !known.has(String(id)))
    .map((id) => ({ value: id, label: t('org.missingUser', { id }) }));
  return (
    <Select
      multiple
      filter
      value={value}
      optionList={[...options, ...missing]}
      placeholder={placeholder ?? t('org.userPlaceholder')}
      emptyContent={users.isPending ? t('org.loading') : t('org.emptyUsers')}
      loading={users.isPending}
      maxTagCount={3}
      showClear
      disabled={disabled}
      {...(max !== undefined ? { max } : {})}
      style={{ width: '100%' }}
      onChange={(next) => onChange(Array.isArray(next) ? (next as (number | string)[]) : [])}
    />
  );
}

import type { Dispatch } from 'react';

import { Banner, Input, Radio, RadioGroup, Select, Switch, TextArea, Typography } from '@douyinfe/semi-ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { listAllGroups } from '../../api/groups';
import type { FlowPermission, WorkFlowDef } from '../../api/types';
import type { DraftAction } from '../../hooks/useDefinitionDraft';
import { OrgPicker } from '../org/OrgPicker';
import { UserPicker } from '../org/UserPicker';

/** 定义行上的基础信息字段（与发布入参同名），由编辑页 meta 状态持有。 */
export interface FlowSettingsMeta {
  group_id: number | null;
  description: string;
  icon: string;
  is_cancelable: number;
}

export interface FlowSettingsPanelProps {
  flowPermission: FlowPermission;
  workFlowDef: WorkFlowDef;
  meta: FlowSettingsMeta;
  onMetaChange: (patch: Partial<FlowSettingsMeta>) => void;
  dispatch: Dispatch<DraftAction>;
  /** 页面只读（无 RBAC 写权限码）：全部配置控件禁用，值照常回显。 */
  readOnly?: boolean;
}

/**
 * 流程级设置面板：基础信息（分组/说明/图标/撤销开关）、
 * 「谁能发起」（flowPermission）、流程管理员（workFlowDef.flowAdminIds）。
 * 发起范围只在这里配，发起节点面板不重复给入口。
 */
export function FlowSettingsPanel({
  flowPermission,
  workFlowDef,
  meta,
  onMetaChange,
  dispatch,
  readOnly,
}: FlowSettingsPanelProps) {
  const { t } = useTranslation('workflow');
  const groups = useQuery({ queryKey: ['sandworkflow', 'groups', 'all'], queryFn: listAllGroups });

  const permissionType = flowPermission.type === 2 ? 2 : 1;
  const initiators = Array.isArray(flowPermission.flowInitiators)
    ? flowPermission.flowInitiators
    : [];

  const setPermission = (patch: Partial<FlowPermission>) =>
    dispatch({ type: 'setPermission', flowPermission: { ...flowPermission, ...patch } });
  const setWorkFlowDef = (patch: Partial<WorkFlowDef>) =>
    dispatch({ type: 'setWorkFlowDef', workFlowDef: { ...workFlowDef, ...patch } });

  return (
    <div
      className="flex h-full w-96 flex-col gap-4 overflow-auto px-4 py-4"
      style={{ borderLeft: '1px solid var(--semi-color-border)' }}
    >
      <Typography.Title heading={6} style={{ margin: 0 }}>
        {t('designer.flow.title')}
      </Typography.Title>

      <div className="flex flex-col gap-2">
        <Typography.Text strong size="small">
          {t('designer.flow.basic')}
        </Typography.Text>
        <div className="flex flex-col gap-1">
          <Typography.Text size="small" type="secondary">
            {t('designer.flow.group')}
          </Typography.Text>
          <Select
            value={meta.group_id ?? undefined}
            placeholder={t('designer.flow.groupPlaceholder')}
            loading={groups.isPending}
            disabled={readOnly}
            showClear
            style={{ width: '100%' }}
            onChange={(value) => onMetaChange({ group_id: value === undefined ? null : Number(value) })}
          >
            {(groups.data ?? []).map((group) => (
              <Select.Option key={group.id} value={group.id}>
                {group.name}
              </Select.Option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Typography.Text size="small" type="secondary">
            {t('designer.flow.description')}
          </Typography.Text>
          <TextArea
            value={meta.description}
            maxCount={500}
            rows={3}
            disabled={readOnly}
            placeholder={t('designer.flow.descriptionPlaceholder')}
            onChange={(value) => onMetaChange({ description: value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Typography.Text size="small" type="secondary">
            {t('designer.flow.icon')}
          </Typography.Text>
          <Input
            value={meta.icon}
            maxLength={1000}
            disabled={readOnly}
            placeholder={t('designer.flow.iconPlaceholder')}
            onChange={(value) => onMetaChange({ icon: value })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Typography.Text size="small">{t('designer.flow.cancelable')}</Typography.Text>
          <Switch
            size="small"
            checked={meta.is_cancelable === 1}
            disabled={readOnly}
            onChange={(checked) => onMetaChange({ is_cancelable: checked ? 1 : 0 })}
          />
        </div>
        <Typography.Text size="small" type="tertiary">
          {t('designer.flow.cancelableHint')}
        </Typography.Text>
      </div>

      <div className="flex flex-col gap-2">
        <Typography.Text strong size="small">
          {t('designer.flow.permission')}
        </Typography.Text>
        <RadioGroup
          value={permissionType}
          disabled={readOnly}
          onChange={(event) => setPermission({ type: Number(event.target.value) })}
        >
          <Radio value={1}>{t('designer.flow.permissionAll')}</Radio>
          <Radio value={2}>{t('designer.flow.permissionScoped')}</Radio>
        </RadioGroup>
        {permissionType === 2 ? (
          <>
            <OrgPicker
              value={initiators}
              disabled={readOnly}
              onChange={(items) => setPermission({ flowInitiators: items })}
            />
            {initiators.length === 0 ? (
              <Banner type="warning" description={t('designer.flow.permissionEmpty')} />
            ) : null}
          </>
        ) : null}
        <Typography.Text size="small" type="tertiary">
          {t('designer.flow.permissionHint')}
        </Typography.Text>
      </div>

      <div className="flex flex-col gap-2">
        <Typography.Text strong size="small">
          {t('designer.flow.admins')}
        </Typography.Text>
        <UserPicker
          value={workFlowDef.flowAdminIds ?? []}
          placeholder={t('designer.flow.adminsPlaceholder')}
          disabled={readOnly}
          onChange={(ids) => setWorkFlowDef({ flowAdminIds: ids })}
        />
        <Typography.Text size="small" type="tertiary">
          {t('designer.flow.adminsHint')}
        </Typography.Text>
      </div>
    </div>
  );
}

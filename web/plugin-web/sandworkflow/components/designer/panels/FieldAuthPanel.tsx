import type { Dispatch } from 'react';

import { Radio, RadioGroup, Tag, Typography } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

import type { FieldAuth } from '../../../model/formAuths';
import { authStateOf, setFieldAuth } from '../../../model/formAuths';
import type { FlowNode, FlowWidget } from '../../../api/types';
import type { DraftAction } from '../../../hooks/useDefinitionDraft';
import { nodeKeyOf } from '../../../model/nodeTypes';
import { WIDGET_TYPE, widgetTypeLabel } from '../../../model/widgets';

export interface FieldAuthPanelProps {
  /** 审批（1）/办理（5）/抄送（2）节点。 */
  node: FlowNode;
  /** 草稿 flowWidgets 一级字段全集。 */
  widgets: FlowWidget[];
  /** 全树被条件引用的字段名：这些字段任何节点都禁 editable（契约 §2.10）。 */
  conditionVars: Set<string>;
  /** 抄送节点传 false：抄送人只能看，不给可编辑（F-07）。 */
  canEdit: boolean;
  /** 页面只读：三态全部禁用，值照常回显。 */
  readOnly?: boolean;
  dispatch: Dispatch<DraftAction>;
}

interface AuthRowProps {
  node: FlowNode;
  widgets: FlowWidget[];
  /** 一级字段名；detailName 非空表示改明细子字段。 */
  fieldName: string;
  detailName: string | null;
  label: string;
  type: number;
  disabledEdit: boolean;
  canEdit: boolean;
  readOnly?: boolean;
  dispatch: Dispatch<DraftAction>;
  indent?: boolean;
}

function AuthRow(props: AuthRowProps) {
  const { t } = useTranslation('workflow');
  const { node, widgets, fieldName, detailName, label, type, disabledEdit, canEdit, readOnly, dispatch, indent } = props;

  const top = (node.formAuths ?? []).find((entry) => entry.name === fieldName);
  const entry =
    detailName === null
      ? top
      : (top?.details ?? []).find((item) => item.name === detailName);
  const state = authStateOf(entry);

  const denyReason = !disabledEdit
    ? null
    : type === WIDGET_TYPE.FORMULA
      ? t('designer.auth.lockedFormula')
      : type === WIDGET_TYPE.DESC
        ? t('designer.auth.lockedDesc')
        : !canEdit
          ? t('designer.auth.copyOnly')
          : t('designer.auth.lockedCondition');

  return (
    <div className="flex flex-col gap-1" style={indent ? { paddingLeft: 16 } : undefined}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <Typography.Text size="small" ellipsis className="min-w-0">
            {label}
          </Typography.Text>
          <Tag size="small" color="grey">
            {widgetTypeLabel(type)}
          </Tag>
        </div>
        <RadioGroup
          type="button"
          value={state}
          disabled={readOnly}
          onChange={(event) => {
            const next = event.target.value as FieldAuth;
            dispatch({
              type: 'updateNode',
              nodeKey: nodeKeyOf(node),
              patch: {
                formAuths: setFieldAuth(node, widgets, fieldName, detailName, next),
              },
            });
          }}
        >
          <Radio value="editable" disabled={disabledEdit}>
            {t('designer.auth.editable')}
          </Radio>
          <Radio value="readonly">{t('designer.auth.readonly')}</Radio>
          <Radio value="hidden">{t('designer.auth.hidden')}</Radio>
        </RadioGroup>
      </div>
      {denyReason ? (
        <Typography.Text size="small" type="tertiary" style={indent ? { paddingLeft: 0 } : undefined}>
          {denyReason}
        </Typography.Text>
      ) : null}
    </div>
  );
}

/**
 * 节点级字段权限区（F-25）：按 flowWidgets 列出每个字段的三态写进 formAuths，
 * 明细按子字段逐个配；editable⇒readable 由三态映射保证，公式/条件引用/
 * 说明文字与抄送节点的可编辑项在 UI 层就禁掉。
 */
export function FieldAuthPanel({
  node,
  widgets,
  conditionVars,
  canEdit,
  readOnly,
  dispatch,
}: FieldAuthPanelProps) {
  const { t } = useTranslation('workflow');

  return (
    <div className="flex flex-col gap-2">
      <Typography.Text strong size="small">
        {t('designer.auth.title')}
      </Typography.Text>
      {widgets.length === 0 ? (
        <Typography.Text size="small" type="tertiary">
          {t('designer.auth.empty')}
        </Typography.Text>
      ) : (
        widgets.map((widget) => {
          const locked =
            !canEdit ||
            widget.type === WIDGET_TYPE.FORMULA ||
            widget.type === WIDGET_TYPE.DESC ||
            conditionVars.has(widget.name);
          if (widget.type === WIDGET_TYPE.DETAIL) {
            const children = widget.details ?? [];
            return (
              <div key={widget.name} className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <Typography.Text size="small" strong>
                    {widget.label ?? widget.name}
                  </Typography.Text>
                  <Tag size="small" color="grey">
                    {widgetTypeLabel(widget.type)}
                  </Tag>
                </div>
                {children.map((child) => (
                  <AuthRow
                    key={child.name}
                    node={node}
                    widgets={widgets}
                    fieldName={widget.name}
                    detailName={child.name}
                    label={child.label ?? child.name}
                    type={child.type}
                    disabledEdit={
                      !canEdit ||
                      child.type === WIDGET_TYPE.FORMULA ||
                      child.type === WIDGET_TYPE.DESC ||
                      conditionVars.has(child.name)
                    }
                    canEdit={canEdit}
                    readOnly={readOnly}
                    dispatch={dispatch}
                    indent
                  />
                ))}
              </div>
            );
          }
          return (
            <AuthRow
              key={widget.name}
              node={node}
              widgets={widgets}
              fieldName={widget.name}
              detailName={null}
              label={widget.label ?? widget.name}
              type={widget.type}
              disabledEdit={locked}
              canEdit={canEdit}
              readOnly={readOnly}
              dispatch={dispatch}
            />
          );
        })
      )}
    </div>
  );
}

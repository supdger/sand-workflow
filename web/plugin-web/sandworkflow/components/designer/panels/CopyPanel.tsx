import type { Dispatch } from 'react';

import { Banner, Button, Dropdown, Select, Tag, Typography } from '@douyinfe/semi-ui';
import { IconDelete, IconPlus } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';

import type { CcRule, FlowNode, FlowWidget } from '../../../api/types';
import { ASSIGNEE_TYPE } from '../../../api/types';
import type { DraftAction } from '../../../hooks/useDefinitionDraft';
import {
  CC_RULE_CHOICES,
  createCcRule,
  isDirectRule,
  memberIds,
} from '../../../model/assignee';
import { nodeKeyOf } from '../../../model/nodeTypes';
import { RolePicker } from '../../org/RolePicker';
import { UserPicker } from '../../org/UserPicker';
import { FieldAuthPanel } from './FieldAuthPanel';
import { NodeNameField } from './NodeNameField';

export interface CopyPanelProps {
  /** 抄送节点（type=2）。 */
  node: FlowNode;
  dispatch: Dispatch<DraftAction>;
  /** 草稿 flowWidgets，字段权限区列字段用。 */
  widgets: FlowWidget[];
  /** 全树被条件引用的字段名。 */
  conditionVars: Set<string>;
  readOnly?: boolean;
}

function ccTypeLabel(ccType: number | undefined, t: (key: string) => string): string {
  switch (ccType) {
    case ASSIGNEE_TYPE.SELF:
      return t('designer.panels.ccSelf');
    case ASSIGNEE_TYPE.ROLE:
      return t('designer.panels.ruleRole');
    case ASSIGNEE_TYPE.ASSIGNEE:
      return t('designer.panels.ruleMember');
    default:
      return t('designer.panels.ruleUnsupported');
  }
}

/**
 * 抄送节点的抄送人设置：契约只放行 ccType 0/3/4 与 {id} 直通
 * （§2.5），直通形态与非法 ccType 的老数据只读展示不产出。
 */
export function CopyPanel({ node, dispatch, widgets, conditionVars, readOnly }: CopyPanelProps) {
  const { t } = useTranslation('workflow');
  const nodeKey = nodeKeyOf(node);
  const rules = node.ccs ?? [];

  const setRules = (next: CcRule[]) =>
    dispatch({ type: 'updateNode', nodeKey, patch: { ccs: next } });
  const setRule = (index: number, rule: CcRule) => {
    const next = [...rules];
    next[index] = rule;
    setRules(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <NodeNameField node={node} dispatch={dispatch} disabled={readOnly} />

      <div className="flex items-center justify-between">
        <Typography.Text strong size="small">
          {t('designer.panels.ccs')}
        </Typography.Text>
        <Dropdown
          trigger="click"
          position="bottomRight"
          render={
            <Dropdown.Menu>
              {CC_RULE_CHOICES.map((choice) => (
                <Dropdown.Item key={choice} onClick={() => setRules([...rules, createCcRule(choice)])}>
                  {ccTypeLabel(choice, t)}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          }
        >
          <Button
            icon={<IconPlus />}
            size="small"
            theme="light"
            disabled={readOnly}
            aria-label={t('designer.panels.ruleAdd')}
          >
            {t('designer.panels.ruleAdd')}
          </Button>
        </Dropdown>
      </div>

      {rules.length === 0 ? (
        <Banner type="warning" description={t('designer.panels.ccsEmpty')} />
      ) : (
        rules.map((rule, index) => {
          const locked = isDirectRule(rule) ||
            (rule.ccType !== undefined && !CC_RULE_CHOICES.includes(rule.ccType as 0 | 3 | 4));
          return (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-md border p-2"
              style={{ borderColor: 'var(--semi-color-border)' }}
            >
              <div className="flex items-center justify-between gap-2">
                {locked ? (
                  <Tag size="small" color={isDirectRule(rule) ? 'grey' : 'red'}>
                    {isDirectRule(rule)
                      ? t('designer.panels.ruleDirect')
                      : t('designer.panels.ruleUnsupported')}
                  </Tag>
                ) : (
                  <Select
                    size="small"
                    value={rule.ccType}
                    disabled={readOnly}
                    style={{ width: 190 }}
                    onChange={(next) => setRule(index, createCcRule(Number(next)))}
                  >
                    {CC_RULE_CHOICES.map((choice) => (
                      <Select.Option key={choice} value={choice}>
                        {ccTypeLabel(choice, t)}
                      </Select.Option>
                    ))}
                  </Select>
                )}
                <Button
                  icon={<IconDelete />}
                  size="small"
                  theme="borderless"
                  type="danger"
                  aria-label={t('designer.panels.ruleDelete')}
                  disabled={readOnly}
                  onClick={() => setRules(rules.filter((_, i) => i !== index))}
                />
              </div>
              {locked ? (
                <Typography.Text size="small" type="secondary">
                  {isDirectRule(rule)
                    ? t('designer.panels.ruleDirectHint')
                    : t('designer.panels.ccUnsupportedHint')}
                </Typography.Text>
              ) : null}
              {rule.ccType === ASSIGNEE_TYPE.ASSIGNEE ? (
                <UserPicker
                  value={memberIds(rule.assignees)}
                  disabled={readOnly}
                  onChange={(ids) => setRule(index, { ...rule, assignees: ids.map((id) => ({ id })) })}
                />
              ) : null}
              {rule.ccType === ASSIGNEE_TYPE.ROLE ? (
                <RolePicker
                  value={rule.roles ?? []}
                  disabled={readOnly}
                  onChange={(ids) => setRule(index, { ...rule, roles: ids.map(Number) })}
                />
              ) : null}
              {rule.ccType === ASSIGNEE_TYPE.SELF ? (
                <Typography.Text size="small" type="tertiary">
                  {t('designer.panels.selfHint')}
                </Typography.Text>
              ) : null}
            </div>
          );
        })
      )}

      <FieldAuthPanel
        node={node}
        widgets={widgets}
        conditionVars={conditionVars}
        canEdit={false}
        readOnly={readOnly}
        dispatch={dispatch}
      />
    </div>
  );
}

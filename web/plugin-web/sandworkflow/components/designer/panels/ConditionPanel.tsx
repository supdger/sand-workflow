import type { Dispatch } from 'react';

import { Banner, Button, Input, InputNumber, Select, TagInput, Typography } from '@douyinfe/semi-ui';
import { IconDelete, IconPlus } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';

import type { ConditionGroup, FlowCondition, FlowNode, FlowWidget } from '../../../api/types';
import type { DraftAction } from '../../../hooks/useDefinitionDraft';
import {
  comparableWidgets,
  createCondition,
  isNumericOperator,
  isSetOperator,
  operatorsForWidget,
  retargetCondition,
} from '../../../model/conditions';
import { isDefaultBranch, nodeKeyOf } from '../../../model/nodeTypes';
import { NodeNameField } from './NodeNameField';

export interface ConditionPanelProps {
  /** 条件分支节点（type=3，挂网关 conditionNodes 里）。 */
  node: FlowNode;
  dispatch: Dispatch<DraftAction>;
  /** 草稿的 flowWidgets，条件左值从这里取可比较字段。 */
  widgets: FlowWidget[];
  readOnly?: boolean;
}

interface ConditionRowProps {
  condition: FlowCondition;
  widgets: FlowWidget[];
  readOnly?: boolean;
  onChange: (condition: FlowCondition) => void;
  onRemove: () => void;
}

const OPERATOR_LABEL_KEYS: Record<number, string> = {
  0: 'designer.panels.opEq',
  1: 'designer.panels.opNe',
  2: 'designer.panels.opLt',
  3: 'designer.panels.opLe',
  4: 'designer.panels.opGt',
  5: 'designer.panels.opGe',
  10: 'designer.panels.opIn',
  11: 'designer.panels.opNotIn',
  12: 'designer.panels.opStrEq',
  13: 'designer.panels.opStrNe',
  14: 'designer.panels.opContains',
  15: 'designer.panels.opNotContains',
  20: 'designer.panels.opIntersect',
  21: 'designer.panels.opNoIntersect',
};

function toTextList(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map(String);
  }
  if (typeof val === 'string' && val !== '') {
    return val.split(',').map((item) => item.trim());
  }
  return [];
}

function ConditionRow({ condition, widgets, readOnly, onChange, onRemove }: ConditionRowProps) {
  const { t } = useTranslation('workflow');
  const widget = widgets.find((item) => item.name === condition.varName);
  const operators = widget ? operatorsForWidget(widget.type) : [];
  // 老数据里 operator 可能不在该控件的可选集里，补进选项保持可见。
  const operatorOptions =
    condition.operator !== undefined && !operators.includes(condition.operator)
      ? [...operators, condition.operator]
      : operators;
  const widgetMissing = condition.varName !== undefined && condition.varName !== '' && !widget;

  const fieldOptions = widgets.map((item) => ({
    value: item.name,
    label: `${item.label ?? item.name}（${item.name}）`,
  }));
  if (widgetMissing && condition.varName !== undefined) {
    fieldOptions.push({
      value: condition.varName,
      label: t('designer.panels.fieldMissing', { name: condition.varName }),
    });
  }

  const options = widget?.options ?? [];
  const setValue = (patch: Partial<FlowCondition>) => onChange({ ...condition, ...patch });

  const valueEditor = (() => {
    const operator = condition.operator;
    if (operator === undefined) {
      return null;
    }
    if (isNumericOperator(operator)) {
      return (
        <InputNumber
          size="small"
          value={typeof condition.val === 'number' ? condition.val : undefined}
          disabled={readOnly}
          style={{ width: '100%' }}
          onChange={(next) => setValue({ val: typeof next === 'number' ? next : 0 })}
        />
      );
    }
    if (isSetOperator(operator)) {
      if (options.length > 0) {
        return (
          <Select
            multiple
            size="small"
            value={toTextList(condition.val)}
            optionList={options.map((option) => ({ value: option, label: option }))}
            disabled={readOnly}
            style={{ width: '100%' }}
            onChange={(next) => setValue({ val: Array.isArray(next) ? next : [] })}
          />
        );
      }
      return (
        <TagInput
          size="small"
          value={toTextList(condition.val)}
          placeholder={t('designer.panels.setValueHint')}
          disabled={readOnly}
          onChange={(next) => setValue({ val: next })}
        />
      );
    }
    // 字符串比较：有 options 的控件（单选等）给下拉单选，其余自由输入。
    if (options.length > 0) {
      return (
        <Select
          size="small"
          value={typeof condition.val === 'string' ? condition.val : String(condition.val ?? '')}
          optionList={options.map((option) => ({ value: option, label: option }))}
          disabled={readOnly}
          style={{ width: '100%' }}
          onChange={(next) => setValue({ val: next })}
        />
      );
    }
    return (
      <Input
        size="small"
        value={typeof condition.val === 'string' ? condition.val : String(condition.val ?? '')}
        disabled={readOnly}
        onChange={(next) => setValue({ val: next })}
      />
    );
  })();

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Select
          size="small"
          value={condition.varName}
          optionList={fieldOptions}
          validateStatus={widgetMissing || !condition.varName ? 'warning' : 'default'}
          disabled={readOnly}
          style={{ width: '40%', minWidth: 0 }}
          onChange={(next) => {
            const name = String(next);
            const target = widgets.find((item) => item.name === name);
            if (target) {
              onChange(createCondition(target));
            } else {
              setValue({ varName: name });
            }
          }}
        />
        <Select
          size="small"
          value={condition.operator}
          disabled={readOnly}
          style={{ width: '30%', minWidth: 0 }}
          onChange={(next) => onChange(retargetCondition(condition, Number(next)))}
        >
          {operatorOptions.map((operator) => (
            <Select.Option key={operator} value={operator}>
              {t(OPERATOR_LABEL_KEYS[operator] ?? 'designer.panels.ruleUnsupported')}
            </Select.Option>
          ))}
        </Select>
        <div className="min-w-0 flex-1">{valueEditor}</div>
        <Button
          icon={<IconDelete />}
          size="small"
          theme="borderless"
          type="danger"
          aria-label={t('designer.panels.conditionDelete')}
          disabled={readOnly}
          onClick={onRemove}
        />
      </div>
      {widgetMissing ? (
        <Typography.Text size="small" type="warning">
          {t('designer.panels.fieldMissingHint')}
        </Typography.Text>
      ) : null}
    </div>
  );
}

/**
 * 条件分支（type=3）的条件表达式编辑器：conditionGroups 组间 OR、
 * 组内 AND（契约 §2.8）；空 conditionGroups = 默认分支，不给条件编辑。
 */
export function ConditionPanel({ node, dispatch, widgets, readOnly }: ConditionPanelProps) {
  const { t } = useTranslation('workflow');
  const nodeKey = nodeKeyOf(node);
  const groups = node.conditionGroups ?? [];
  const fields = comparableWidgets(widgets);

  const setGroups = (next: ConditionGroup[]) =>
    dispatch({ type: 'updateNode', nodeKey, patch: { conditionGroups: next } });

  const setGroup = (index: number, group: ConditionGroup) => {
    const next = [...groups];
    next[index] = group;
    setGroups(next);
  };

  const setCondition = (groupIndex: number, index: number, condition: FlowCondition) => {
    const group = groups[groupIndex];
    if (!group) {
      return;
    }
    const conditions = [...(group.conditions ?? [])];
    conditions[index] = condition;
    setGroup(groupIndex, { ...group, conditions });
  };

  const addCondition = (groupIndex: number) => {
    const group = groups[groupIndex];
    const first = fields[0];
    if (!group || !first) {
      return;
    }
    setGroup(groupIndex, {
      ...group,
      conditions: [...(group.conditions ?? []), createCondition(first)],
    });
  };

  if (isDefaultBranch(node)) {
    return (
      <div className="flex flex-col gap-3">
        <NodeNameField node={node} dispatch={dispatch} disabled={readOnly} />
        <Banner type="info" description={t('designer.panels.defaultBranchHint')} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <NodeNameField node={node} dispatch={dispatch} disabled={readOnly} />
      <div className="flex items-center justify-between">
        <Typography.Text strong size="small">
          {t('designer.panels.conditionGroups')}
        </Typography.Text>
        <Button
          icon={<IconPlus />}
          size="small"
          theme="light"
          disabled={fields.length === 0 || readOnly}
          onClick={() => {
            const first = fields[0];
            if (first) {
              setGroups([...groups, { conditions: [createCondition(first)] }]);
            }
          }}
        >
          {t('designer.panels.groupAdd')}
        </Button>
      </div>
      <Typography.Text size="small" type="tertiary">
        {t('designer.panels.groupsHint')}
      </Typography.Text>

      {fields.length === 0 ? (
        <Banner type="warning" description={t('designer.panels.noFields')} />
      ) : null}

      {groups.map((group, groupIndex) => (
        <div key={groupIndex} className="flex flex-col gap-2">
          {groupIndex > 0 ? (
            <Typography.Text size="small" type="primary" className="text-center">
              {t('designer.panels.groupOr')}
            </Typography.Text>
          ) : null}
          <div
            className="flex flex-col gap-2 rounded-md border p-2"
            style={{ borderColor: 'var(--semi-color-border)' }}
          >
            <div className="flex items-center justify-between">
              <Typography.Text size="small" type="secondary">
                {t('designer.panels.groupTitle', { index: groupIndex + 1 })}
              </Typography.Text>
              <Button
                icon={<IconDelete />}
                size="small"
                theme="borderless"
                type="danger"
                aria-label={t('designer.panels.groupDelete')}
                disabled={readOnly}
                onClick={() => setGroups(groups.filter((_, i) => i !== groupIndex))}
              />
            </div>
            {(group.conditions ?? []).map((condition, index) => (
              <ConditionRow
                key={index}
                condition={condition}
                widgets={fields}
                readOnly={readOnly}
                onChange={(next) => setCondition(groupIndex, index, next)}
                onRemove={() =>
                  setGroup(groupIndex, {
                    ...group,
                    conditions: (group.conditions ?? []).filter((_, i) => i !== index),
                  })
                }
              />
            ))}
            <Button
              icon={<IconPlus />}
              size="small"
              theme="borderless"
              disabled={fields.length === 0 || readOnly}
              onClick={() => addCondition(groupIndex)}
            >
              {t('designer.panels.conditionAdd')}
            </Button>
            {(group.conditions ?? []).length > 1 ? (
              <Typography.Text size="small" type="tertiary">
                {t('designer.panels.conditionAnd')}
              </Typography.Text>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

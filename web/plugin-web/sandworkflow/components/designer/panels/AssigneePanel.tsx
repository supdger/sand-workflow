import type { Dispatch } from 'react';

import {
  Banner,
  Button,
  Dropdown,
  InputNumber,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import { IconDelete, IconPlus } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';

import type { AssigneeRule, FlowNode, FlowWidget } from '../../../api/types';
import { ASSIGNEE_TYPE, NODE_TYPE } from '../../../api/types';
import type { DraftAction } from '../../../hooks/useDefinitionDraft';
import {
  ASSIGNEE_RULE_CHOICES,
  assigneeFields,
  createAssigneeRule,
  encodeMultiInstance,
  hasInitiatorChoice,
  hasMultistepLeader,
  isDirectRule,
  memberIds,
  multiInstanceChoice,
  ruleTypeOf,
} from '../../../model/assignee';
import { nodeKeyOf } from '../../../model/nodeTypes';
import { RolePicker } from '../../org/RolePicker';
import { UserPicker } from '../../org/UserPicker';
import { FieldAuthPanel } from './FieldAuthPanel';
import { NodeNameField } from './NodeNameField';

export interface AssigneePanelProps {
  /** 审批（type=1）或办理（type=5）节点。 */
  node: FlowNode;
  dispatch: Dispatch<DraftAction>;
  /** 草稿 flowWidgets，字段权限区列字段用。 */
  widgets: FlowWidget[];
  /** 全树被条件引用的字段名。 */
  conditionVars: Set<string>;
}

interface RuleRowProps {
  node: FlowNode;
  rule: AssigneeRule;
  /** 该节点当前规则总数：发起人自选必须独占节点，多于 1 条时不给选。 */
  ruleCount: number;
  dispatch: Dispatch<DraftAction>;
  onChange: (rule: AssigneeRule) => void;
  onRemove: () => void;
}

function ruleTypeLabel(ruleType: number, t: (key: string) => string): string {
  switch (ruleType) {
    case ASSIGNEE_TYPE.SELF:
      return t('designer.panels.ruleSelf');
    case ASSIGNEE_TYPE.DEPARTMENT_LEADER:
      return t('designer.panels.ruleDeptLeader');
    case ASSIGNEE_TYPE.ROLE:
      return t('designer.panels.ruleRole');
    case ASSIGNEE_TYPE.ASSIGNEE:
      return t('designer.panels.ruleMember');
    case ASSIGNEE_TYPE.MULTISTEP_DEPARTMENT_LEADER:
      return t('designer.panels.ruleMultistep');
    case ASSIGNEE_TYPE.INITIATOR_CHOICE:
      return t('designer.panels.ruleChoice');
    default:
      return t('designer.panels.ruleUnsupported');
  }
}

function RuleRow({ node, rule, ruleCount, dispatch, onChange, onRemove }: RuleRowProps) {
  const { t } = useTranslation('workflow');
  const fields = assigneeFields(node.type);
  const ruleType = ruleTypeOf(rule);
  const direct = ruleType === undefined || isDirectRule(rule);
  const nodeKey = nodeKeyOf(node);
  // 老数据里 1/5 这类后端拒收的类型也要能回显，给下拉补一个占位项。
  const typeOptions: readonly number[] =
    ruleType !== undefined && !(ASSIGNEE_RULE_CHOICES as readonly number[]).includes(ruleType)
      ? [...ASSIGNEE_RULE_CHOICES, ruleType]
      : ASSIGNEE_RULE_CHOICES;

  const setRule = (patch: Partial<AssigneeRule>) => onChange({ ...rule, ...patch });

  /** 换规则方式 = 整条重建，不把上一种方式的字段带进新规则。 */
  const changeType = (nextType: number) => {
    const fresh = createAssigneeRule(node.type, nextType);
    if (nextType === ASSIGNEE_TYPE.MULTISTEP_DEPARTMENT_LEADER) {
      dispatch({
        type: 'updateNode',
        nodeKey,
        patch: { multiInstanceApprovalType: 3 },
      });
    }
    onChange(fresh);
  };

  return (
    <div
      className="flex flex-col gap-2 rounded-md border p-2"
      style={{ borderColor: 'var(--semi-color-border)' }}
    >
      <div className="flex items-center justify-between gap-2">
        {direct ? (
          <Tag size="small" color="grey">
            {t('designer.panels.ruleDirect')}
          </Tag>
        ) : (
          <Select
            size="small"
            value={ruleType}
            style={{ width: 190 }}
            onChange={(next) => changeType(Number(next))}
          >
            {typeOptions.map((choice) => (
              <Select.Option
                key={choice}
                value={choice}
                // 发起人自选必须独占节点（契约 §2.4）：不是唯一一条时不给选。
                disabled={choice === ASSIGNEE_TYPE.INITIATOR_CHOICE && ruleCount > 1}
              >
                {ruleTypeLabel(choice, t)}
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
          onClick={onRemove}
        />
      </div>
      {direct ? (
        <Typography.Text size="small" type="secondary">
          {t('designer.panels.ruleDirectHint')}
        </Typography.Text>
      ) : null}
      {ruleType === ASSIGNEE_TYPE.ASSIGNEE ? (
        <UserPicker
          value={memberIds(rule[fields.membersKey] as AssigneeRule['assignees'])}
          onChange={(ids) => setRule({ [fields.membersKey]: ids.map((id) => ({ id })) })}
        />
      ) : null}
      {ruleType === ASSIGNEE_TYPE.ROLE ? (
        <RolePicker
          value={rule.roles ?? []}
          onChange={(ids) => setRule({ roles: ids.map(Number) })}
        />
      ) : null}
      {ruleType === ASSIGNEE_TYPE.DEPARTMENT_LEADER ||
      ruleType === ASSIGNEE_TYPE.MULTISTEP_DEPARTMENT_LEADER ? (
        <div className="flex flex-col gap-2">
          <RadioGroup
            type="button"
            value={rule.layerType ?? 0}
            onChange={(event) => setRule({ layerType: Number(event.target.value) })}
          >
            <Radio value={0}>{t('designer.panels.layerUp')}</Radio>
            <Radio value={1}>{t('designer.panels.layerDown')}</Radio>
          </RadioGroup>
          <div className="flex items-center gap-2">
            <Typography.Text size="small" type="secondary">
              {t('designer.panels.layerCount')}
            </Typography.Text>
            <InputNumber
              size="small"
              min={0}
              max={20}
              value={rule.layer ?? 1}
              style={{ width: 90 }}
              onChange={(next) => setRule({ layer: Number(next) || 0 })}
            />
          </div>
          <Typography.Text size="small" type="tertiary">
            {t('designer.panels.leaderHint')}
          </Typography.Text>
        </div>
      ) : null}
      {ruleType === ASSIGNEE_TYPE.SELF ? (
        <Typography.Text size="small" type="tertiary">
          {t('designer.panels.selfHint')}
        </Typography.Text>
      ) : null}
      {ruleType === ASSIGNEE_TYPE.INITIATOR_CHOICE ? (
        <Typography.Text size="small" type="tertiary">
          {t('designer.panels.choiceHint')}
        </Typography.Text>
      ) : null}
    </div>
  );
}

/**
 * 审批/办理节点的处理人设置：规则列表（契约 §2.4 可提供的 6 种方式
 * + 老数据直通形态只读）、多人处理方式三档（0/2 合并展示为或签，
 * 含自选规则时落 2）、signable/backable 能力开关。
 */
export function AssigneePanel({ node, dispatch, widgets, conditionVars }: AssigneePanelProps) {
  const { t } = useTranslation('workflow');
  const nodeKey = nodeKeyOf(node);
  const fields = assigneeFields(node.type);
  const rules = ((node[fields.rulesKey] as AssigneeRule[] | undefined) ?? []);
  const hasChoice = hasInitiatorChoice(rules);
  const hasMultistep = hasMultistepLeader(rules);
  const multi = multiInstanceChoice(node.multiInstanceApprovalType);
  const isTransact = node.type === NODE_TYPE.TRANSACT;

  const setRules = (next: AssigneeRule[]) =>
    dispatch({ type: 'updateNode', nodeKey, patch: { [fields.rulesKey]: next } });

  const addRule = (ruleType: number) => {
    const fresh = createAssigneeRule(node.type, ruleType);
    const patch: Partial<FlowNode> = { [fields.rulesKey]: [...rules, fresh] };
    // 连续多级部门负责人后端强制依次审批，前端加规则时直接锁定。
    if (ruleType === ASSIGNEE_TYPE.MULTISTEP_DEPARTMENT_LEADER) {
      patch.multiInstanceApprovalType = 3;
    }
    dispatch({ type: 'updateNode', nodeKey, patch });
  };

  const setRule = (index: number, rule: AssigneeRule) => {
    const next = [...rules];
    next[index] = rule;
    setRules(next);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-3">
      <NodeNameField node={node} dispatch={dispatch} />

      <div className="flex items-center justify-between">
        <Typography.Text strong size="small">
          {isTransact ? t('designer.panels.transactors') : t('designer.panels.assignees')}
        </Typography.Text>
        <Dropdown
          trigger="click"
          position="bottomRight"
          render={
            <Dropdown.Menu>
              {ASSIGNEE_RULE_CHOICES.map((choice) => (
                <Dropdown.Item
                  key={choice}
                  // 自选独占：已有自选规则时整菜单禁用，有别的规则时禁掉自选项。
                  disabled={
                    hasChoice || (choice === ASSIGNEE_TYPE.INITIATOR_CHOICE && rules.length > 0)
                  }
                  onClick={() => addRule(choice)}
                >
                  {ruleTypeLabel(choice, t)}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          }
        >
          <Button
            icon={<IconPlus />}
            size="small"
            theme="light"
            disabled={hasChoice}
            aria-label={t('designer.panels.ruleAdd')}
          >
            {t('designer.panels.ruleAdd')}
          </Button>
        </Dropdown>
      </div>

      {rules.length === 0 ? (
        <Banner type="warning" description={t('designer.panels.rulesEmpty')} />
      ) : (
        rules.map((rule, index) => (
          <RuleRow
            key={index}
            node={node}
            rule={rule}
            ruleCount={rules.length}
            dispatch={dispatch}
            onChange={(next) => setRule(index, next)}
            onRemove={() => removeRule(index)}
          />
        ))
      )}

      <div className="flex flex-col gap-1">
        <Typography.Text strong size="small">
          {t('designer.panels.multiType')}
        </Typography.Text>
        <Select
          value={multi}
          disabled={hasMultistep}
          style={{ width: '100%' }}
          onChange={(next) =>
            dispatch({
              type: 'updateNode',
              nodeKey,
              patch: { multiInstanceApprovalType: encodeMultiInstance(Number(next), hasChoice) },
            })
          }
        >
          <Select.Option value={0}>{t('designer.panels.multiAny')}</Select.Option>
          <Select.Option value={1}>{t('designer.panels.multiAll')}</Select.Option>
          <Select.Option value={3}>{t('designer.panels.multiSequence')}</Select.Option>
        </Select>
        {hasMultistep ? (
          <Typography.Text size="small" type="tertiary">
            {t('designer.panels.multiLocked')}
          </Typography.Text>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Typography.Text size="small">{t('designer.panels.signable')}</Typography.Text>
          <Switch
            size="small"
            checked={node.signable === 1}
            disabled={multi === 3}
            onChange={(checked) =>
              dispatch({ type: 'updateNode', nodeKey, patch: { signable: checked ? 1 : 0 } })
            }
          />
        </div>
        {multi === 3 ? (
          <Typography.Text size="small" type="tertiary">
            {t('designer.panels.signableDisabled')}
          </Typography.Text>
        ) : null}
        <div className="flex items-center justify-between">
          <Typography.Text size="small">{t('designer.panels.backable')}</Typography.Text>
          <Switch
            size="small"
            checked={node.backable === 1}
            onChange={(checked) =>
              dispatch({ type: 'updateNode', nodeKey, patch: { backable: checked ? 1 : 0 } })
            }
          />
        </div>
      </div>

      <FieldAuthPanel
        node={node}
        widgets={widgets}
        conditionVars={conditionVars}
        canEdit
        dispatch={dispatch}
      />
    </div>
  );
}

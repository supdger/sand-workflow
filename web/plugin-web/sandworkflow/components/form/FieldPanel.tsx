import type { ReactNode } from 'react';

import {
  Button,
  Input,
  Select,
  Switch,
  TagInput,
  TextArea,
  Typography,
} from '@douyinfe/semi-ui';
import { IconArrowDown, IconArrowUp, IconDelete, IconPlus } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';

import type { FlowWidget } from '../../api/types';
import {
  createSubField,
  duplicateNames,
  FIELD_NAME_PATTERN,
  hasFormat,
  hasOptions,
  hasPlaceholder,
  hasRequired,
  isSubFieldType,
  moveWidgetAt,
  removeWidgetAt,
  updateWidgetAt,
  WIDGET_PALETTE,
  WIDGET_TYPE,
  widgetTypeLabel,
} from '../../model/widgets';

export interface FieldPanelProps {
  /** 当前选中的控件；null 时显示空态提示。 */
  widget: FlowWidget | null;
  /** 全表控件，给字段名查重提示用。 */
  widgets: FlowWidget[];
  /** 合并补丁写回选中控件。 */
  onPatch: (patch: Partial<FlowWidget>) => void;
  /** 页面只读（无 RBAC 写权限码）：全部配置控件禁用，值照常回显。 */
  readOnly?: boolean;
}

const SUB_FIELD_TYPES = WIDGET_PALETTE.filter(isSubFieldType);

interface LabelledProps {
  label: string;
  children: ReactNode;
}

function Labelled({ label, children }: LabelledProps) {
  return (
    <div className="flex flex-col gap-1">
      <Typography.Text size="small" type="secondary">
        {label}
      </Typography.Text>
      {children}
    </div>
  );
}

/**
 * 表单设计器右侧字段属性面板：公共项（字段名/显示名/提示语/必填）
 * + 按类型的可配置项（F-23）：单选多选 options、日期 format、
 * 明细 details 子字段、公式表达式（编辑器私有键，后端不消费）。
 */
export function FieldPanel({ widget, widgets, onPatch, readOnly }: FieldPanelProps) {
  const { t } = useTranslation('workflow');

  if (!widget) {
    return (
      <div
        className="flex h-full w-80 shrink-0 flex-col gap-3 overflow-auto px-4 py-4"
        style={{ borderLeft: '1px solid var(--semi-color-border)' }}
      >
        <Typography.Title heading={6} style={{ margin: 0 }}>
          {t('designer.form.settings')}
        </Typography.Title>
        <Typography.Text type="secondary" size="small">
          {t('designer.form.settingsEmpty')}
        </Typography.Text>
      </div>
    );
  }

  const details = widget.details ?? [];
  const dupNames = duplicateNames(widgets);
  const trimmed = widget.name.trim();
  const nameDup = dupNames.has(trimmed);
  const nameWarning =
    trimmed === ''
      ? t('designer.form.nameEmpty')
      : nameDup
        ? t('designer.form.nameDup')
        : FIELD_NAME_PATTERN.test(trimmed)
          ? null
          : t('designer.form.namePattern');

  const setDetails = (next: FlowWidget[]) => onPatch({ details: next });
  const setDetail = (index: number, patch: Partial<FlowWidget>) =>
    setDetails(updateWidgetAt(details, index, patch));

  return (
    <div
      className="flex h-full w-80 shrink-0 flex-col gap-3 overflow-auto px-4 py-4"
      style={{ borderLeft: '1px solid var(--semi-color-border)' }}
    >
      <Typography.Title heading={6} style={{ margin: 0 }}>
        {t('designer.form.settings')}
      </Typography.Title>

      <Labelled label={t('designer.form.fieldLabel')}>
        <Input
          value={widget.label ?? ''}
          maxLength={60}
          disabled={readOnly}
          onChange={(value) => onPatch({ label: value })}
        />
      </Labelled>

      <Labelled label={t('designer.form.fieldName')}>
        <Input
          value={widget.name}
          maxLength={64}
          validateStatus={nameWarning ? 'warning' : 'default'}
          disabled={readOnly}
          onChange={(value) => onPatch({ name: value })}
        />
        {nameWarning ? (
          <Typography.Text size="small" type="warning">
            {nameWarning}
          </Typography.Text>
        ) : null}
      </Labelled>

      {hasPlaceholder(widget.type) ? (
        <Labelled label={t('designer.form.fieldPlaceholder')}>
          <Input
            value={widget.placeholder ?? ''}
            maxLength={120}
            disabled={readOnly}
            onChange={(value) => onPatch({ placeholder: value })}
          />
        </Labelled>
      ) : null}

      {hasRequired(widget.type) ? (
        <div className="flex items-center justify-between">
          <Typography.Text size="small">{t('designer.form.fieldRequired')}</Typography.Text>
          <Switch
            size="small"
            checked={widget.required === true}
            disabled={readOnly}
            onChange={(checked) => onPatch({ required: checked })}
          />
        </div>
      ) : null}

      {hasFormat(widget.type) ? (
        <Labelled label={t('designer.form.fieldFormat')}>
          <Select
            value={widget.format ?? 'YYYY-MM-DD'}
            disabled={readOnly}
            style={{ width: '100%' }}
            onChange={(value) => onPatch({ format: String(value) })}
          >
            <Select.Option value="YYYY-MM-DD">YYYY-MM-DD</Select.Option>
            <Select.Option value="YYYY-MM-DD HH:mm">YYYY-MM-DD HH:mm</Select.Option>
          </Select>
        </Labelled>
      ) : null}

      {hasOptions(widget.type) ? (
        <Labelled label={t('designer.form.fieldOptions')}>
          <TagInput
            size="small"
            value={widget.options ?? []}
            placeholder={t('designer.form.optionsHint')}
            disabled={readOnly}
            onChange={(next) => onPatch({ options: next })}
          />
        </Labelled>
      ) : null}

      {widget.type === WIDGET_TYPE.FORMULA ? (
        <Labelled label={t('designer.form.formula')}>
          <TextArea
            value={typeof widget.expression === 'string' ? widget.expression : ''}
            rows={3}
            disabled={readOnly}
            placeholder={t('designer.form.formulaPlaceholder')}
            onChange={(value) => onPatch({ expression: value })}
          />
          <Typography.Text size="small" type="tertiary">
            {t('designer.form.formulaHint')}
          </Typography.Text>
        </Labelled>
      ) : null}

      {widget.type === WIDGET_TYPE.DETAIL ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Typography.Text size="small" type="secondary">
              {t('designer.form.details')}
            </Typography.Text>
            <Button
              icon={<IconPlus />}
              size="small"
              theme="light"
              disabled={readOnly}
              onClick={() => setDetails([...details, createSubField(widgets, WIDGET_TYPE.TEXT)])}
            >
              {t('designer.form.detailAdd')}
            </Button>
          </div>
          <Typography.Text size="small" type="tertiary">
            {t('designer.form.detailsHint')}
          </Typography.Text>
          {details.map((child, index) => (
            <div
              key={typeof child.__editorKey === 'string' ? child.__editorKey : index}
              className="flex flex-col gap-1 rounded-md border p-2"
              style={{ borderColor: 'var(--semi-color-border)' }}
            >
              <div className="flex items-center justify-between gap-1">
                <Select
                  size="small"
                  value={child.type}
                  disabled={readOnly}
                  style={{ width: 130 }}
                  onChange={(value) => setDetail(index, { type: Number(value) })}
                >
                  {SUB_FIELD_TYPES.map((type) => (
                    <Select.Option key={type} value={type}>
                      {widgetTypeLabel(type)}
                    </Select.Option>
                  ))}
                </Select>
                <div className="flex items-center">
                  <Button
                    icon={<IconArrowUp />}
                    size="small"
                    theme="borderless"
                    disabled={index === 0 || readOnly}
                    aria-label={t('designer.form.moveUp')}
                    onClick={() => setDetails(moveWidgetAt(details, index, -1))}
                  />
                  <Button
                    icon={<IconArrowDown />}
                    size="small"
                    theme="borderless"
                    disabled={index === details.length - 1 || readOnly}
                    aria-label={t('designer.form.moveDown')}
                    onClick={() => setDetails(moveWidgetAt(details, index, 1))}
                  />
                  <Button
                    icon={<IconDelete />}
                    size="small"
                    theme="borderless"
                    type="danger"
                    disabled={readOnly}
                    aria-label={t('designer.form.detailDelete')}
                    onClick={() => setDetails(removeWidgetAt(details, index))}
                  />
                </div>
              </div>
              <Input
                size="small"
                value={child.name}
                maxLength={64}
                placeholder={t('designer.form.fieldName')}
                validateStatus={dupNames.has(child.name.trim()) ? 'warning' : 'default'}
                disabled={readOnly}
                onChange={(value) => setDetail(index, { name: value })}
              />
              <Input
                size="small"
                value={child.label ?? ''}
                maxLength={60}
                placeholder={t('designer.form.fieldLabel')}
                disabled={readOnly}
                onChange={(value) => setDetail(index, { label: value })}
              />
              {hasOptions(child.type) ? (
                <TagInput
                  size="small"
                  value={child.options ?? []}
                  placeholder={t('designer.form.optionsHint')}
                  disabled={readOnly}
                  onChange={(next) => setDetail(index, { options: next })}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

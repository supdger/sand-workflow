import type { Dispatch } from 'react';

import {
  Button,
  Input,
  InputNumber,
  Rating,
  Select,
  Tag,
  TextArea,
  Typography,
} from '@douyinfe/semi-ui';
import { IconArrowDown, IconArrowUp, IconCopy, IconDelete } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';

import { Empty } from '@/components/Empty';

import type { FlowWidget } from '../../api/types';
import type { DraftAction } from '../../hooks/useDefinitionDraft';
import {
  createWidget,
  duplicateNames,
  duplicateWidgetAt,
  isUnavailableType,
  moveWidgetAt,
  removeWidgetAt,
  updateWidgetAt,
  WIDGET_TYPE,
  widgetKeyOf,
  widgetTypeLabel,
} from '../../model/widgets';
import { FieldPanel } from './FieldPanel';
import { WidgetPalette } from './WidgetPalette';

export interface FormDesignerProps {
  widgets: FlowWidget[];
  dispatch: Dispatch<DraftAction>;
  /** 选中控件的编辑键（widgetKeyOf）；null 未选中。 */
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  /** 页面只读（无 RBAC 写权限码）：控件库与字段操作收起，仅可点选查看。 */
  readOnly?: boolean;
}

/**
 * 字段卡片内的只读预览：按发起页口径渲染输入控件的样子（禁用态），
 * 发起端没接数据的控件给「暂不可用」占位（F-26、I-07）。
 */
function FieldPreview({ widget }: { widget: FlowWidget }) {
  const { t } = useTranslation('workflow');
  const placeholder = widget.placeholder || t('designer.form.previewEmpty');
  const disabledHint = t('designer.form.unavailableHint');
  switch (widget.type) {
    case WIDGET_TYPE.TEXTAREA:
      return <TextArea value="" disabled rows={2} placeholder={placeholder} />;
    case WIDGET_TYPE.DESC:
      return (
        <Typography.Text type="tertiary" size="small">
          {widget.placeholder || widget.label || t('designer.form.previewDesc')}
        </Typography.Text>
      );
    case WIDGET_TYPE.NUMBER:
    case WIDGET_TYPE.MONEY:
    case WIDGET_TYPE.RATING:
      return widget.type === WIDGET_TYPE.RATING ? (
        <Rating value={0} disabled />
      ) : (
        <InputNumber value={undefined} disabled placeholder={placeholder} style={{ width: '100%' }} />
      );
    case WIDGET_TYPE.RADIO:
    case WIDGET_TYPE.MULTI:
      return (
        <Select
          multiple={widget.type === WIDGET_TYPE.MULTI}
          disabled
          placeholder={placeholder}
          optionList={(widget.options ?? []).map((option) => ({ value: option, label: option }))}
          style={{ width: '100%' }}
        />
      );
    case WIDGET_TYPE.DATE:
      return (
        <Input value="" disabled placeholder={widget.format ?? 'YYYY-MM-DD'} style={{ width: '100%' }} />
      );
    case WIDGET_TYPE.DATE_RANGE:
      return (
        <Input
          value=""
          disabled
          placeholder={t('designer.form.previewRange')}
          style={{ width: '100%' }}
        />
      );
    case WIDGET_TYPE.DETAIL: {
      const children = widget.details ?? [];
      return (
        <div
          className="w-full rounded-md border px-2 py-1"
          style={{ borderColor: 'var(--semi-color-border)' }}
        >
          {children.length === 0 ? (
            <Typography.Text type="tertiary" size="small">
              {t('designer.form.detailsEmpty')}
            </Typography.Text>
          ) : (
            <div className="flex flex-wrap gap-1">
              {children.map((child, index) => (
                <Tag key={index} size="small">
                  {child.label ?? child.name}
                </Tag>
              ))}
            </div>
          )}
        </div>
      );
    }
    case WIDGET_TYPE.IMAGE:
    case WIDGET_TYPE.FILE:
    case WIDGET_TYPE.RELATION:
    case WIDGET_TYPE.REGION:
      return <Input value="" disabled placeholder={disabledHint} style={{ width: '100%' }} />;
    case WIDGET_TYPE.RICH:
      return (
        <div
          className="w-full rounded-md border px-2 py-4 text-center"
          style={{ borderColor: 'var(--semi-color-border)' }}
        >
          <Typography.Text type="tertiary" size="small">
            {t('designer.form.previewRich')}
          </Typography.Text>
        </div>
      );
    default:
      return <Input value="" disabled placeholder={placeholder} style={{ width: '100%' }} />;
  }
}

/**
 * 表单设计器：左控件面板 / 中字段预览列表 / 右字段属性面板（F-21）。
 * 字段变换全部走 model/widgets 纯函数经 dispatch 写回草稿。
 */
export function FormDesigner({ widgets, dispatch, selectedKey, onSelect, readOnly }: FormDesignerProps) {
  const { t } = useTranslation('workflow');
  const dupNames = duplicateNames(widgets);
  const selectedIndex = widgets.findIndex((widget) => widgetKeyOf(widget) === selectedKey);
  const selected = selectedIndex >= 0 ? widgets[selectedIndex] : null;

  const setWidgets = (next: FlowWidget[]) =>
    dispatch({ type: 'setWidgets', flowWidgets: next });

  const handleAdd = (type: number) => {
    const widget = createWidget(widgets, type);
    setWidgets([...widgets, widget]);
    onSelect(widgetKeyOf(widget));
  };

  const handleRemove = (index: number) => {
    setWidgets(removeWidgetAt(widgets, index));
    if (index === selectedIndex) {
      onSelect(null);
    }
  };

  return (
    <div className="flex w-full items-stretch gap-0">
      <WidgetPalette onAdd={handleAdd} disabled={readOnly} />
      <div className="flex-1 overflow-auto px-6 py-4">
        {widgets.length === 0 ? (
          <Empty title={t('designer.form.empty')} />
        ) : (
          <div className="mx-auto flex max-w-xl flex-col gap-3">
            {widgets.map((widget, index) => {
              const key = widgetKeyOf(widget) || String(index);
              const active = key === selectedKey;
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer rounded-md border px-3 py-2"
                  style={{
                    borderColor: active
                      ? 'var(--semi-color-primary)'
                      : 'var(--semi-color-border)',
                    backgroundColor: active
                      ? 'var(--semi-color-primary-light-default)'
                      : undefined,
                  }}
                  onClick={() => onSelect(active ? null : key)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      onSelect(active ? null : key);
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Typography.Text strong ellipsis className="min-w-0">
                        {widget.label ?? widget.name}
                      </Typography.Text>
                      <Typography.Text type="tertiary" size="small">
                        {widget.name}
                      </Typography.Text>
                      <Tag size="small">{widgetTypeLabel(widget.type)}</Tag>
                      {widget.required === true ? (
                        <Tag size="small" color="red">
                          {t('designer.form.requiredTag')}
                        </Tag>
                      ) : null}
                      {isUnavailableType(widget.type) ? (
                        <Tag size="small" color="orange">
                          {t('designer.form.unavailable')}
                        </Tag>
                      ) : null}
                      {dupNames.has(widget.name.trim()) ? (
                        <Tag size="small" color="red">
                          {t('designer.form.nameDupTag')}
                        </Tag>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center">
                      <Button
                        icon={<IconArrowUp />}
                        size="small"
                        theme="borderless"
                        disabled={index === 0 || readOnly}
                        aria-label={t('designer.form.moveUp')}
                        onClick={(event) => {
                          event.stopPropagation();
                          setWidgets(moveWidgetAt(widgets, index, -1));
                        }}
                      />
                      <Button
                        icon={<IconArrowDown />}
                        size="small"
                        theme="borderless"
                        disabled={index === widgets.length - 1 || readOnly}
                        aria-label={t('designer.form.moveDown')}
                        onClick={(event) => {
                          event.stopPropagation();
                          setWidgets(moveWidgetAt(widgets, index, 1));
                        }}
                      />
                      <Button
                        icon={<IconCopy />}
                        size="small"
                        theme="borderless"
                        disabled={readOnly}
                        aria-label={t('designer.form.fieldDuplicate')}
                        onClick={(event) => {
                          event.stopPropagation();
                          const next = duplicateWidgetAt(widgets, index);
                          setWidgets(next);
                          const clone = next[index + 1];
                          if (clone) {
                            onSelect(widgetKeyOf(clone));
                          }
                        }}
                      />
                      <Button
                        icon={<IconDelete />}
                        size="small"
                        theme="borderless"
                        type="danger"
                        disabled={readOnly}
                        aria-label={t('designer.form.fieldDelete')}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemove(index);
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <FieldPreview widget={widget} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <FieldPanel
        widget={selected ?? null}
        widgets={widgets}
        readOnly={readOnly}
        onPatch={(patch) => {
          if (selectedIndex >= 0) {
            setWidgets(updateWidgetAt(widgets, selectedIndex, patch));
          }
        }}
      />
    </div>
  );
}

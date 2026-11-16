import { Button, Tag, Typography } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

import { isUnavailableType, WIDGET_PALETTE, widgetTypeLabel } from '../../model/widgets';

export interface WidgetPaletteProps {
  /** 点中某个控件类型时回调；控件由上层创建并插到列表尾。 */
  onAdd: (type: number) => void;
}

/**
 * 表单设计器左侧控件面板：按契约 §2.9 枚举顺序列出 23 种控件
 * （type=14 空缺跳过）；发起端没接数据的控件带「暂不可用」标记
 * （I-07），仍允许加进表单，由发起页的禁用占位兜住。
 */
export function WidgetPalette({ onAdd }: WidgetPaletteProps) {
  const { t } = useTranslation('workflow');
  return (
    <div
      className="flex h-full w-44 shrink-0 flex-col gap-2 overflow-auto px-3 py-3"
      style={{ borderRight: '1px solid var(--semi-color-border)' }}
    >
      <Typography.Text strong size="small">
        {t('designer.form.palette')}
      </Typography.Text>
      {WIDGET_PALETTE.map((type) => (
        <Button
          key={type}
          theme="light"
          size="small"
          className="justify-start"
          onClick={() => onAdd(type)}
        >
          <span className="flex w-full items-center justify-between gap-1">
            <span>{widgetTypeLabel(type)}</span>
            {isUnavailableType(type) ? (
              <Tag size="small" color="orange">
                {t('designer.form.unavailable')}
              </Tag>
            ) : null}
          </span>
        </Button>
      ))}
      <Typography.Text size="small" type="tertiary">
        {t('designer.form.paletteHint')}
      </Typography.Text>
    </div>
  );
}

import { useTranslation } from 'react-i18next';

export interface FlowStatusStampProps {
  /** 实例 flow_status：0 审批中 / 1 已通过 / 2 已拒绝 / 3 已撤销（契约 §4）。 */
  status: number;
  /** 印章直径（px），默认 96。 */
  size?: number;
  /** 整枚印章的倾斜角度（度），默认 -14。 */
  rotate?: number;
}

/** 状态语义色：通过绿 / 审批中蓝 / 驳回红 / 撤销灰，全部取 Semi token。 */
const STAMP_COLORS: Record<number, string> = {
  0: 'var(--semi-color-primary)',
  1: 'var(--semi-color-success)',
  2: 'var(--semi-color-danger)',
  3: 'var(--semi-color-text-2)',
};

const STAMP_TEXT_KEYS: Record<number, string> = {
  0: 'stamp.underway',
  1: 'stamp.approved',
  2: 'stamp.rejected',
  3: 'stamp.cancelled',
};

/**
 * 流程实例状态印章（F-38）：SVG 自绘双圈圆章 + 居中状态字 +
 * 整体倾斜，颜色按流转状态语义。未知状态回落灰色「未知」，
 * 供实例详情、打印预览等右上角叠加展示。
 */
export function FlowStatusStamp({ status, size = 96, rotate = -14 }: FlowStatusStampProps) {
  const { t } = useTranslation('workflow');
  const color = STAMP_COLORS[status] ?? 'var(--semi-color-text-2)';
  const text = t(STAMP_TEXT_KEYS[status] ?? 'stamp.unknown');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={text}
      style={{ transform: `rotate(${rotate}deg)`, flexShrink: 0 }}
    >
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke={color}
        strokeWidth="4"
        opacity="0.9"
      />
      <circle
        cx="50"
        cy="50"
        r="37"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.75"
      />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize="21"
        fontWeight="bold"
        letterSpacing="2"
      >
        {text}
      </text>
    </svg>
  );
}

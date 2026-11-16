<?php
declare(strict_types=1);

namespace plugin\sandworkflow\app\service;

/**
 * 实例快照优先规则：运行时的定义形态与实例级开关一律读发起时冻结的值，
 * 保证「改设置只影响改完之后发起的单」。快照为空仅出现在升级前的存量实例上，
 * 此时回落到活定义，与旧行为一致。
 */
final class InstanceSnapshotPolicy
{
    public static function definitionJson(?array $snapshot, ?array $live): array
    {
        if (is_array($snapshot) && $snapshot !== []) {
            return $snapshot;
        }
        return is_array($live) ? $live : [];
    }

    public static function cancelable(mixed $snapshotValue, mixed $liveValue): bool
    {
        return (int) ($snapshotValue ?? $liveValue ?? 0) === 1;
    }
}

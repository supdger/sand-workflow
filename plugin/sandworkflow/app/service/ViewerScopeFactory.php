<?php
declare(strict_types=1);

namespace plugin\sandworkflow\app\service;

use plugin\sandadmin\app\model\system\SystemDept;
use plugin\sandadmin\app\model\system\SystemUser;
use plugin\sandadmin\app\model\system\SystemUserRole;
use plugin\sandworkflow\app\contract\ActorRef;

/**
 * SandAdmin 宿主侧：组装发起范围 / 流程管理员判定用的当前用户视图。
 * dept_ids = 主部门 + level 物化路径里的全部祖先，即发起范围选中部门
 * 按「本部门及下属部门成员」命中；宿主只有 dept_id 一个归属字段，无多部门。
 */
final class ViewerScopeFactory
{
    /**
     * @return array{account_id:string,dept_ids:list<int>,role_ids:list<int>,is_super:bool}
     */
    public static function build(ActorRef $actor): array
    {
        $viewer = [
            'account_id' => $actor->accountId,
            'dept_ids' => [],
            'role_ids' => [],
            'is_super' => false,
        ];
        if ($actor->accountSpace !== 'sandadmin' || !ctype_digit($actor->accountId)) {
            return $viewer;
        }
        $userId = (int) $actor->accountId;
        $user = SystemUser::where('id', $userId)->where('status', 1)->findOrEmpty();
        if ($user->isEmpty()) {
            return $viewer;
        }
        $viewer['is_super'] = $userId === 1 || (int) ($user->getAttr('is_super') ?? 0) === 1;

        $deptId = (int) ($user->getAttr('dept_id') ?? 0);
        $level = '';
        if ($deptId > 0) {
            $dept = SystemDept::where('id', $deptId)->where('status', 1)->findOrEmpty();
            $level = $dept->isEmpty() ? '' : (string) ($dept->getAttr('level') ?? '');
        }
        $viewer['dept_ids'] = self::deptIds($deptId, $level);

        $viewer['role_ids'] = array_values(array_map(
            'intval',
            SystemUserRole::where('user_id', $userId)->column('role_id')
        ));
        return $viewer;
    }

    /**
     * @return list<int>
     */
    public static function deptIds(int $deptId, string $level): array
    {
        if ($deptId <= 0) {
            return [];
        }
        $ids = [$deptId];
        foreach (explode(',', $level) as $segment) {
            if (ctype_digit($segment) && (int) $segment > 0) {
                $ids[] = (int) $segment;
            }
        }
        return array_values(array_unique($ids));
    }
}

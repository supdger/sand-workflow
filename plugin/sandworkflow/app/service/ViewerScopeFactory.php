<?php
declare(strict_types=1);

namespace plugin\sandworkflow\app\service;

use plugin\sandworkflow\app\contract\ActorRef;
use plugin\sandworkflow\app\support\HostOrg;

/**
 * SandAdmin 1.x 宿主侧：组装发起范围 / 流程管理员判定用的当前用户视图。
 * dept_ids = 主部门 + parent_id 链上的全部祖先，即发起范围选中部门
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
        $user = HostOrg::findUser($userId);
        if ($user === null || (int) ($user['status'] ?? 0) !== 1) {
            return $viewer;
        }
        $viewer['is_super'] = HostOrg::isSuper($user, $userId);
        $viewer['dept_ids'] = HostOrg::deptAncestorIds((int) ($user['dept_id'] ?? 0));
        $viewer['role_ids'] = HostOrg::userRoleIds($userId);
        return $viewer;
    }
}

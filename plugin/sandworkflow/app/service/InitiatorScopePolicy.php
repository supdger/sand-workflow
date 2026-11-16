<?php
declare(strict_types=1);

namespace plugin\sandworkflow\app\service;

/**
 * 「谁能发起」判定：读取 definition_json.flowPermission。
 * type 不为 2（指定的人）一律视为所有人可发起，兼容老数据里的 0/缺失值；
 * type=2 时按 flowInitiators 的 user/dept/role 三类条目求并集。
 * 本类不查库，dept_ids 要求调用方已展开成「主部门 + 祖先部门」。
 */
final class InitiatorScopePolicy
{
    public const TYPE_ALL = 1;
    public const TYPE_LIMITED = 2;

    /**
     * @param array{account_id?:string,dept_ids?:list<int>,role_ids?:list<int>} $viewer
     */
    public static function canInitiate(array $definitionJson, array $viewer): bool
    {
        if (self::permissionType($definitionJson) !== self::TYPE_LIMITED) {
            return true;
        }
        $initiators = $definitionJson['flowPermission']['flowInitiators'] ?? [];
        if (!is_array($initiators)) {
            return false;
        }
        foreach ($initiators as $initiator) {
            if (!is_array($initiator)) {
                continue;
            }
            if (self::initiatorMatches($initiator, $viewer)) {
                return true;
            }
        }
        return false;
    }

    public static function permissionType(array $definitionJson, int $default = self::TYPE_ALL): int
    {
        $permission = $definitionJson['flowPermission'] ?? null;
        if (is_array($permission) && isset($permission['type']) && is_numeric($permission['type'])) {
            return (int) $permission['type'];
        }
        return $default;
    }

    /**
     * @param array{account_id?:string,dept_ids?:list<int>,role_ids?:list<int>} $viewer
     */
    private static function initiatorMatches(array $initiator, array $viewer): bool
    {
        $type = (string) ($initiator['type'] ?? '');
        $id = $initiator['id'] ?? null;
        if ($type === 'user') {
            return (string) $id !== '' && (string) $id === (string) ($viewer['account_id'] ?? '');
        }
        if (($type === 'dept' || $type === 'role') && is_numeric($id) && (int) $id > 0) {
            $key = $type === 'dept' ? 'dept_ids' : 'role_ids';
            return in_array((int) $id, array_map('intval', (array) ($viewer[$key] ?? [])), true);
        }
        return false;
    }
}

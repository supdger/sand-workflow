<?php
declare(strict_types=1);

namespace plugin\sandworkflow\app\service;

/**
 * 流程管理员判定：读取 definition_json.workFlowDef.flowAdminIds（account_id 数组）。
 * 名单为空 = 未启用管理员机制，维持「有菜单权限即可管理」；
 * 名单非空时只有名单内成员与宿主超级管理员可写操作。
 * 管理员身份不附带任何任务处理权（代审/加签等在引擎侧按任务处理人单独拦截）。
 */
final class DefinitionAdminPolicy
{
    /**
     * @return list<string>
     */
    public static function adminIds(array $definitionJson): array
    {
        $ids = $definitionJson['workFlowDef']['flowAdminIds'] ?? null;
        if (!is_array($ids)) {
            return [];
        }
        $result = [];
        foreach ($ids as $id) {
            if (!is_int($id) && !is_string($id)) {
                continue;
            }
            $value = trim((string) $id);
            // 数字字符串不能当数组键去重（会被转成 int），改用列表 + in_array 严格比较
            if ($value !== '' && $value !== '0' && !in_array($value, $result, true)) {
                $result[] = $value;
            }
        }
        return $result;
    }

    /**
     * @param array{account_id?:string,is_super?:bool} $viewer
     */
    public static function canManage(array $definitionJson, array $viewer): bool
    {
        $adminIds = self::adminIds($definitionJson);
        if ($adminIds === [] || !empty($viewer['is_super'])) {
            return true;
        }
        return in_array((string) ($viewer['account_id'] ?? ''), $adminIds, true);
    }
}

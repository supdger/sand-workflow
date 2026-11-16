<?php
declare(strict_types=1);

namespace plugin\sandworkflow\app\support;

use think\facade\Db;

/**
 * SandAdmin 宿主组织/授权表只读查询，按 0.2.4 安装器实际落库口径写死列名：
 * user 有 realname（无 nickname）、is_super smallint、delete_time 软删；
 * dept/role 保留 delete_time；授权存在 sand_system_menu.slug +
 * sand_system_role_menu。不经过 0.x 模型层的 SoftDelete/缓存包装。
 */
final class HostOrg
{
    /** 单个用户：按 id 取未软删行。 @return array<string,mixed>|null */
    public static function findUser(int $userId): ?array
    {
        $row = Db::table('sand_system_user')
            ->where('id', $userId)
            ->whereNull('delete_time')
            ->find();

        return is_array($row) ? $row : null;
    }

    /** 启用中的用户列表（选人器）；realname 别名成 nickname 给前端。 @return list<array<string,mixed>> */
    public static function listUsers(): array
    {
        return Db::table('sand_system_user')
            ->field('id,username,realname as nickname,dept_id')
            ->where('status', 1)
            ->whereNull('delete_time')
            ->select()
            ->toArray();
    }

    /** 启用中的角色列表（选角色器）。 @return list<array<string,mixed>> */
    public static function listRoles(): array
    {
        return Db::table('sand_system_role')
            ->field('id,name,code')
            ->where('status', 1)
            ->whereNull('delete_time')
            ->select()
            ->toArray();
    }

    /** 启用中的部门列表（选部门器）。 @return list<array<string,mixed>> */
    public static function listDepts(): array
    {
        return Db::table('sand_system_dept')
            ->field('id,parent_id,name')
            ->where('status', 1)
            ->whereNull('delete_time')
            ->select()
            ->toArray();
    }

    /** 单个部门：按 id 取未软删行。 @return array<string,mixed>|null */
    public static function findDept(int $deptId): ?array
    {
        $row = Db::table('sand_system_dept')
            ->where('id', $deptId)
            ->whereNull('delete_time')
            ->find();

        return is_array($row) ? $row : null;
    }

    /**
     * 本部门及全部祖先 id（含自身），内部一次取全表行走链。
     *
     * @return list<int>
     */
    public static function deptAncestorIds(int $deptId): array
    {
        return self::deptAncestorsInRows($deptId, self::deptRows());
    }

    /**
     * 在给定部门行上沿 parent_id 上溯祖先。0.x 用 level 物化路径表达同一
     * 条祖先集合；宿主新领域层只维护 parent_id，level 已不可靠。叶部门
     * 缺失或已停用时只回自身（与旧逻辑 level 取不到时一致）；祖先按链
     * 全收，含停用节点，父指针悬空或成环时截断。
     *
     * @param list<array<string,mixed>> $deptRows 至少含 id/parent_id/status
     * @return list<int>
     */
    public static function deptAncestorsInRows(int $deptId, array $deptRows): array
    {
        if ($deptId <= 0) {
            return [];
        }
        $byId = [];
        foreach ($deptRows as $row) {
            $byId[(int) ($row['id'] ?? 0)] = $row;
        }
        $leaf = $byId[$deptId] ?? null;
        if ($leaf === null || (int) ($leaf['status'] ?? 0) !== 1) {
            return [$deptId];
        }
        $ids = [$deptId];
        $visited = [$deptId => true];
        $deptId = self::parentIdOf($leaf);
        while ($deptId > 0 && !isset($visited[$deptId])) {
            $visited[$deptId] = true;
            $ids[] = $deptId;
            $row = $byId[$deptId] ?? null;
            if ($row === null) {
                break;
            }
            $deptId = self::parentIdOf($row);
        }

        return $ids;
    }

    /** @return list<array<string,mixed>> */
    private static function deptRows(): array
    {
        return Db::table('sand_system_dept')
            ->field('id,parent_id,status')
            ->whereNull('delete_time')
            ->select()
            ->toArray();
    }

    /** @param array<string,mixed> $row */
    private static function parentIdOf(array $row): int
    {
        $parent = $row['parent_id'] ?? null;

        return $parent === null ? 0 : (int) $parent;
    }

    /** 用户持有的角色 id 列表。 @return list<int> */
    public static function userRoleIds(int $userId): array
    {
        return array_values(array_map(
            'intval',
            Db::table('sand_system_user_role')->where('user_id', $userId)->column('role_id')
        ));
    }

    /**
     * 持有任一角色的用户 id 列表。
     *
     * @param list<int> $roleIds
     * @return list<int>
     */
    public static function roleUserIds(array $roleIds): array
    {
        if ($roleIds === []) {
            return [];
        }

        return array_values(array_map(
            'intval',
            Db::table('sand_system_user_role')->whereIn('role_id', $roleIds)->column('user_id')
        ));
    }

    /** 展示名：宿主用户表是 realname，取不到回退 username。 */
    public static function displayName(array $user, int|string $fallbackId): string
    {
        $name = (string) ($user['realname'] ?? '');

        return $name !== '' ? $name : (string) ($user['username'] ?? $fallbackId);
    }

    /** is_super 在 0.2.4 落库为 smallint；id=1 的系统管理员按超管处理。 */
    public static function isSuper(array $user, int $userId): bool
    {
        if ($userId === 1) {
            return true;
        }
        $flag = $user['is_super'] ?? 0;

        return $flag === true || $flag === 1 || $flag === '1' || $flag === 't';
    }

    /**
     * 用户经角色持有的权限码集合：0.2.4 授权落在 sand_system_menu.slug +
     * sand_system_role_menu（启用菜单且未软删），这是本版宿主唯一存在的
     * 授权存储；新契约的 sand_system_role_permission 尚无 DDL。
     *
     * @return list<string>
     */
    public static function userMenuSlugs(int $userId): array
    {
        $roleIds = self::userRoleIds($userId);
        if ($roleIds === []) {
            return [];
        }

        return array_values(array_filter(array_map(
            'strval',
            Db::table('sand_system_menu')
                ->alias('m')
                ->join('sand_system_role_menu rm', 'rm.menu_id = m.id')
                ->whereIn('rm.role_id', $roleIds)
                ->where('m.status', 1)
                ->whereNull('m.delete_time')
                ->column('m.slug')
        ), static fn (string $slug): bool => $slug !== ''));
    }
}

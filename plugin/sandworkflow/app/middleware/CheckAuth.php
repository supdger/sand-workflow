<?php
declare(strict_types=1);

namespace plugin\sandworkflow\app\middleware;

use Webman\Http\Request;
use Webman\Http\Response;
use Webman\MiddlewareInterface;
use plugin\sandadmin\app\cache\ReflectionCache;
use plugin\sandadmin\exception\SystemException;
use plugin\sandworkflow\app\support\HostOrg;

/**
 * 按 0.2.4 宿主实际授权存储鉴权：sand_system_user_role + sand_system_role_menu
 * + sand_system_menu.slug（宿主唯一存在的授权表；新契约 role_permission 无 DDL）。
 * 无 #[Permission] slug 的方法只要求登录；超管与用户 id=1 放行。
 */
final class CheckAuth implements MiddlewareInterface
{
    public function process(Request $request, callable $handler): Response
    {
        $controller = $request->controller;
        $action = $request->action;

        $noNeedLogin = ReflectionCache::getNoNeedLogin($controller);
        if (in_array($action, $noNeedLogin)) {
            return $handler($request);
        }

        $token = getCurrentInfo();
        if ($token === false) {
            throw new SystemException('用户信息读取失败，无法访问或操作');
        }

        $permissions = ReflectionCache::getPermissionAttributes($controller, $action);
        $slug = $permissions['slug'] ?? null;
        if (!is_string($slug) || $slug === '') {
            return $handler($request);
        }

        $userId = (int) ($token['id'] ?? 0);
        $user = $userId > 0 ? HostOrg::findUser($userId) : null;
        if ($user !== null && HostOrg::isSuper($user, $userId)) {
            return $handler($request);
        }
        if ($user !== null && in_array($slug, HostOrg::userMenuSlugs($userId), true)) {
            return $handler($request);
        }

        throw new SystemException('权限不足，无法访问或操作', 403, null, 403);
    }
}

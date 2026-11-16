<?php
declare(strict_types=1);

namespace plugin\sandworkflow\app\controller;

use plugin\sandadmin\basic\BaseController;
use plugin\sandadmin\service\Permission;
use plugin\sandworkflow\app\support\HostOrg;
use support\Response;

class IndexController extends BaseController
{
    #[Permission('工作流用户列表', 'sandworkflow:index:list-users')]
    public function listUsers(): Response
    {
        return $this->success(HostOrg::listUsers());
    }

    #[Permission('工作流角色列表', 'sandworkflow:index:list-roles')]
    public function listRoles(): Response
    {
        return $this->success(HostOrg::listRoles());
    }

    #[Permission('工作流部门列表', 'sandworkflow:index:list-depts')]
    public function listDepts(): Response
    {
        return $this->success(HostOrg::listDepts());
    }
}

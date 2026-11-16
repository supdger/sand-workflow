<?php
declare(strict_types=1);

use plugin\sandworkflow\app\service\InitiatorScopePolicy;
use plugin\sandworkflow\app\service\ViewerScopeFactory;

final class InitiatorScopePolicyTest
{
    private function viewer(array $overrides = []): array
    {
        return $overrides + [
            'account_id' => '1001',
            'dept_ids' => [10, 1],
            'role_ids' => [3],
            'is_super' => false,
        ];
    }

    private function definition(mixed $flowPermission): array
    {
        return ['flowPermission' => $flowPermission];
    }

    public function testDefaultAll(TestContext $t): void
    {
        $t->check(
            InitiatorScopePolicy::canInitiate($this->definition(['type' => 1]), $this->viewer()),
            'type=1 所有人可发起'
        );
        $t->check(
            InitiatorScopePolicy::canInitiate($this->definition(['type' => 0]), $this->viewer()),
            '老数据 type=0 视为所有人'
        );
        $t->check(
            InitiatorScopePolicy::canInitiate([], $this->viewer()),
            'flowPermission 缺失视为所有人'
        );
        $t->check(
            InitiatorScopePolicy::canInitiate($this->definition(['type' => 1, 'flowInitiators' => []]), $this->viewer(['account_id' => '9'])),
            'type=1 带空名单仍是所有人'
        );
    }

    public function testUserMatch(TestContext $t): void
    {
        $json = $this->definition([
            'type' => 2,
            'flowInitiators' => [['type' => 'user', 'id' => '1001', 'name' => '张三']],
        ]);
        $t->check(InitiatorScopePolicy::canInitiate($json, $this->viewer()), 'user id 命中');
        $t->check(
            !InitiatorScopePolicy::canInitiate($json, $this->viewer(['account_id' => '2002'])),
            'user id 不命中'
        );
    }

    public function testDeptAndRoleMatch(TestContext $t): void
    {
        $json = $this->definition([
            'type' => 2,
            'flowInitiators' => [
                ['type' => 'dept', 'id' => 1, 'name' => '总公司'],
                ['type' => 'role', 'id' => 8, 'name' => '财务'],
            ],
        ]);
        // dept_ids 含祖先链：配置选祖先部门 1 可命中成员（含下属部门语义）
        $t->check(InitiatorScopePolicy::canInitiate($json, $this->viewer()), 'dept 祖先链命中');
        $t->check(
            InitiatorScopePolicy::canInitiate($json, $this->viewer(['dept_ids' => [10], 'role_ids' => [8]])),
            'dept 不命中但 role 命中（并集）'
        );
        $t->check(
            !InitiatorScopePolicy::canInitiate($json, $this->viewer(['dept_ids' => [10], 'role_ids' => [3]])),
            'dept/role 都不命中'
        );
    }

    public function testLimitedWithEmptyListDenied(TestContext $t): void
    {
        // 「指定的人」名单为空时按拒绝处理，不能回落成所有人可发起
        $t->check(
            !InitiatorScopePolicy::canInitiate(
                $this->definition(['type' => 2]),
                $this->viewer()
            ),
            'type=2 无 flowInitiators 拒绝发起'
        );
        $t->check(
            !InitiatorScopePolicy::canInitiate(
                $this->definition(['type' => 2, 'flowInitiators' => []]),
                $this->viewer()
            ),
            'type=2 空名单拒绝发起'
        );
        $t->check(
            !InitiatorScopePolicy::canInitiate(
                $this->definition(['type' => 2, 'flowInitiators' => 'garbage']),
                $this->viewer()
            ),
            'type=2 名单非数组拒绝发起'
        );
    }

    public function testMalformedEntriesSkipped(TestContext $t): void
    {
        $json = $this->definition([
            'type' => 2,
            'flowInitiators' => [
                ['type' => 'user', 'id' => '', 'name' => ''],
                ['type' => 'dept', 'id' => 'abc'],
                'garbage',
            ],
        ]);
        $t->check(
            !InitiatorScopePolicy::canInitiate($json, $this->viewer()),
            '畸形条目不造成误命中'
        );
    }

    public function testPermissionTypeSync(TestContext $t): void
    {
        $t->check(InitiatorScopePolicy::permissionType($this->definition(['type' => 2])) === 2, 'JSON type=2 读出 2');
        $t->check(InitiatorScopePolicy::permissionType([], 1) === 1, '缺失回落默认');
        $t->check(InitiatorScopePolicy::permissionType($this->definition(['type' => '2']), 1) === 2, '字符串数字也认');
    }

    public function testDeptIdsExpansion(TestContext $t): void
    {
        $t->check(ViewerScopeFactory::deptIds(5, '1,3,5') === [5, 1, 3], 'level 展开祖先链');
        $t->check(ViewerScopeFactory::deptIds(0, '1,3') === [], '无部门返回空');
        $t->check(ViewerScopeFactory::deptIds(5, '5') === [5], '重复去重');
        $t->check(ViewerScopeFactory::deptIds(5, '') === [5], 'level 缺失保留主部门');
    }
}

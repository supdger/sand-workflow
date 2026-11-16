<?php
declare(strict_types=1);

use plugin\sandworkflow\app\service\InitiatorScopePolicy;

/**
 * 覆盖验收 b：越界用户不出现在可发起列表、且发起入口同一判定谓词为 false。
 * available 过滤与 /admin/instance/start 前置检查共用 InitiatorScopePolicy::canInitiate，
 * 这里按控制器同样的「遍历定义→按谓词收集 id」路径做断言。
 */
final class InitiationGuardTest
{
    private function definitions(): array
    {
        return [
            ['id' => 1, 'definition_json' => ['flowPermission' => ['type' => 1]]],
            ['id' => 2, 'definition_json' => ['flowPermission' => [
                'type' => 2,
                'flowInitiators' => [['type' => 'user', 'id' => '1001', 'name' => '张三']],
            ]]],
            ['id' => 3, 'definition_json' => ['flowPermission' => [
                'type' => 2,
                'flowInitiators' => [['type' => 'role', 'id' => 7, 'name' => '法务']],
            ]]],
        ];
    }

    /**
     * 与 DefinitionController::initiableDefinitionIds 等价的过滤路径。
     * @return list<int>
     */
    private function availableIds(array $viewer): array
    {
        $ids = [];
        foreach ($this->definitions() as $definition) {
            if (InitiatorScopePolicy::canInitiate($definition['definition_json'], $viewer)) {
                $ids[] = $definition['id'];
            }
        }
        return $ids;
    }

    public function testInScopeViewerSeesAll(TestContext $t): void
    {
        $viewer = ['account_id' => '1001', 'dept_ids' => [], 'role_ids' => [7]];
        $t->check($this->availableIds($viewer) === [1, 2, 3], '范围内用户看到全部三条');
    }

    public function testOutOfScopeViewerFiltered(TestContext $t): void
    {
        $viewer = ['account_id' => '9999', 'dept_ids' => [42], 'role_ids' => []];
        $t->check($this->availableIds($viewer) === [1], '越界用户只剩 type=1 的定义');
    }

    public function testStartRejectsOutOfScopeActor(TestContext $t): void
    {
        $viewer = ['account_id' => '9999', 'dept_ids' => [], 'role_ids' => []];
        // 发起入口谓词与列表谓词是同一个：false 即抛 ApiException('当前用户不在该流程的发起范围内')
        $t->check(
            !InitiatorScopePolicy::canInitiate($this->definitions()[1]['definition_json'], $viewer),
            'start 谓词拒绝越界 user 限定定义'
        );
        $t->check(
            !InitiatorScopePolicy::canInitiate($this->definitions()[2]['definition_json'], $viewer),
            'start 谓词拒绝越界 role 限定定义'
        );
        $t->check(
            InitiatorScopePolicy::canInitiate($this->definitions()[0]['definition_json'], $viewer),
            'start 谓词仍放行 type=1 定义'
        );
    }
}

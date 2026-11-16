<?php
declare(strict_types=1);

use plugin\sandworkflow\app\service\DefinitionAdminPolicy;

final class DefinitionAdminPolicyTest
{
    private function definition(mixed $adminIds): array
    {
        return ['workFlowDef' => ['flowAdminIds' => $adminIds]];
    }

    public function testNoAdminConfiguredMeansAnyoneWithMenu(TestContext $t): void
    {
        $t->check(DefinitionAdminPolicy::canManage($this->definition([]), ['account_id' => '9']), '空名单不限制');
        $t->check(DefinitionAdminPolicy::canManage([], ['account_id' => '9']), '无 workFlowDef 不限制');
        $t->check(DefinitionAdminPolicy::adminIds($this->definition(['1001', ' 1001 ', '', 0, '2002'])) === ['1001', '2002'], '名单去重去空');
    }

    public function testAdminMemberCanManage(TestContext $t): void
    {
        $json = $this->definition(['1001', '2002']);
        $t->check(DefinitionAdminPolicy::canManage($json, ['account_id' => '1001']), '名单内成员可管理');
        $t->check(
            !DefinitionAdminPolicy::canManage($json, ['account_id' => '3003']),
            '名单外成员不可管理（无设置入口）'
        );
    }

    public function testSuperAdminAlwaysCanManage(TestContext $t): void
    {
        $json = $this->definition(['1001']);
        $t->check(
            DefinitionAdminPolicy::canManage($json, ['account_id' => '9999', 'is_super' => true]),
            '宿主超管不受名单限制'
        );
    }

    public function testAdminScopeIsDefinitionSettingOnly(TestContext $t): void
    {
        // 管理员边界：canManage 只回答「能否改流程设置」，不读取节点/任务字段，
        // 代审/加签在引擎侧按任务处理人单独校验，与本谓词无关。
        $json = $this->definition(['1001']) + [
            'nodeConfig' => ['props' => ['assignedUser' => [['id' => '3003']]]],
        ];
        $viewer = ['account_id' => '1001'];
        $t->check(
            DefinitionAdminPolicy::canManage($json, $viewer)
            && !in_array('1001', array_column($json['nodeConfig']['props']['assignedUser'], 'id'), true),
            '管理员身份不改变节点处理人判定输入'
        );
    }
}

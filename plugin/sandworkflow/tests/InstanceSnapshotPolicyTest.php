<?php
declare(strict_types=1);

use plugin\sandworkflow\app\service\InstanceSnapshotPolicy;

/**
 * 覆盖验收 d：改配置只影响改动后发起的实例，进行中实例用发起时快照。
 */
final class InstanceSnapshotPolicyTest
{
    private function frozenJson(): array
    {
        return [
            'workFlowDef' => ['flowAdminIds' => ['1001']],
            'flowPermission' => ['type' => 1],
            'nodeConfig' => ['nodeId' => 'root-old'],
        ];
    }

    private function changedJson(): array
    {
        return [
            'workFlowDef' => ['flowAdminIds' => ['2002']],
            'flowPermission' => ['type' => 2, 'flowInitiators' => [['type' => 'user', 'id' => '9']]],
            'nodeConfig' => ['nodeId' => 'root-new'],
        ];
    }

    public function testSnapshotWinsOverLive(TestContext $t): void
    {
        $resolved = InstanceSnapshotPolicy::definitionJson($this->frozenJson(), $this->changedJson());
        $t->check($resolved['nodeConfig']['nodeId'] === 'root-old', '有快照时用快照 nodeConfig');
        $t->check($resolved['flowPermission']['type'] === 1, '有快照时发起范围也是冻结值');
        $t->check(
            $resolved['workFlowDef']['flowAdminIds'] === ['1001'],
            '有快照时管理员名单是冻结值'
        );
    }

    public function testEmptySnapshotFallsBackToLive(TestContext $t): void
    {
        $resolved = InstanceSnapshotPolicy::definitionJson([], $this->changedJson());
        $t->check($resolved['nodeConfig']['nodeId'] === 'root-new', '存量空快照实例回落活定义');
        $resolved = InstanceSnapshotPolicy::definitionJson(null, $this->changedJson());
        $t->check($resolved['nodeConfig']['nodeId'] === 'root-new', 'NULL 快照同样回落');
    }

    public function testCancelableFreeze(TestContext $t): void
    {
        // 发起时 is_cancelable=1，后来定义改成 0：旧实例仍可撤销
        $t->check(InstanceSnapshotPolicy::cancelable(1, 0), '冻结值 1 覆盖活定义 0');
        // 发起时 0，后来改成 1：旧实例仍不可撤销
        $t->check(!InstanceSnapshotPolicy::cancelable(0, 1), '冻结值 0 覆盖活定义 1');
        // 存量实例列值为 NULL：回落活定义，行为与升级前一致
        $t->check(InstanceSnapshotPolicy::cancelable(null, 1), 'NULL 回落活定义 1');
        $t->check(!InstanceSnapshotPolicy::cancelable(null, 0), 'NULL 回落活定义 0');
        $t->check(!InstanceSnapshotPolicy::cancelable(null, null), '全无数据默认不可撤销');
    }
}

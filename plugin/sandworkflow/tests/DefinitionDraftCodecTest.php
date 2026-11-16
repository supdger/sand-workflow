<?php
declare(strict_types=1);

use plugin\sandworkflow\app\service\DefinitionDraftCodec;

final class DefinitionDraftCodecTest
{
    public function testPackKeepsOnlyMetaKeys(TestContext $t): void
    {
        $envelope = DefinitionDraftCodec::pack(
            ['name' => '请假', 'status' => '2', 'group_id' => '7', 'extra' => 'x', 'id' => 9],
            ['nodeConfig' => ['type' => 0]]
        );
        $t->check($envelope['meta'] === [
            'name' => '请假',
            'status' => 2,
            'group_id' => 7,
            'description' => '',
            'icon' => '',
            'is_cancelable' => 1,
        ], 'meta 只保留六个行字段并补齐缺省');
        $t->check(
            $envelope['definition_json'] === ['nodeConfig' => ['type' => 0]],
            '定义内容原样进入信封'
        );
    }

    public function testPackUnpackRoundTrip(TestContext $t): void
    {
        $envelope = DefinitionDraftCodec::pack(['name' => '报销'], ['k' => 'v']);
        $unpacked = DefinitionDraftCodec::unpack($envelope);
        $t->check($unpacked['meta'] === $envelope['meta'], '往返 meta 一致');
        $t->check($unpacked['definition'] === ['k' => 'v'], '往返 definition 一致');
        $t->check(
            DefinitionDraftCodec::unpack(json_encode($envelope)) === $unpacked,
            'JSON 字符串形态解包一致'
        );
    }

    public function testUnpackToleratesBadInput(TestContext $t): void
    {
        $empty = ['meta' => [], 'definition' => []];
        $t->check(DefinitionDraftCodec::unpack(null) === $empty, 'null 兜底为空');
        $t->check(DefinitionDraftCodec::unpack(42) === $empty, '标量兜底为空');
        $t->check(DefinitionDraftCodec::unpack('not json') === $empty, '非法 JSON 兜底为空');
        $t->check(DefinitionDraftCodec::unpack('[]') === $empty, '空 JSON 数组兜底为空');
        $t->check(
            DefinitionDraftCodec::unpack(['meta' => 'x', 'definition_json' => 1]) === $empty,
            '键值非数组兜底为空'
        );
    }

    public function testHasDraft(TestContext $t): void
    {
        $envelope = DefinitionDraftCodec::pack([], ['n' => 1]);
        $t->check(
            DefinitionDraftCodec::hasDraft(['draft_json' => $envelope]),
            '信封数组视为有草稿'
        );
        $t->check(
            DefinitionDraftCodec::hasDraft(['draft_json' => json_encode($envelope)]),
            '信封 JSON 字符串视为有草稿'
        );
        $t->check(!DefinitionDraftCodec::hasDraft(['draft_json' => null]), 'NULL 无草稿');
        $t->check(!DefinitionDraftCodec::hasDraft(['draft_json' => '']), '空串无草稿');
        $t->check(!DefinitionDraftCodec::hasDraft(['draft_json' => '[]']), '空 JSON 数组无草稿');
        $t->check(!DefinitionDraftCodec::hasDraft(['draft_json' => 'broken']), '坏 JSON 无草稿');
        $t->check(!DefinitionDraftCodec::hasDraft([]), '列缺失无草稿');
    }
}

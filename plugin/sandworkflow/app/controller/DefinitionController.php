<?php
declare(strict_types=1);

namespace plugin\sandworkflow\app\controller;

use plugin\sandadmin\basic\BaseController;
use plugin\sandadmin\service\Permission;
use plugin\sandworkflow\app\logic\DefinitionLogic;
use plugin\sandworkflow\app\model\FlowDefinition;
use plugin\sandworkflow\app\service\DefinitionAdminPolicy;
use plugin\sandworkflow\app\service\DefinitionDraftCodec;
use plugin\sandworkflow\app\service\InitiatorScopePolicy;
use plugin\sandworkflow\app\service\ViewerScopeFactory;
use plugin\sandworkflow\app\service\SandAdminWorkflowContextFactory;
use plugin\sandworkflow\app\validate\DefinitionValidate;
use support\Request;
use support\Response;

class DefinitionController extends BaseController
{
    public function __construct()
    {
        $this->logic = new DefinitionLogic();
        $this->validate = new DefinitionValidate();
        parent::__construct();
    }

    #[Permission('流程定义列表', 'sandworkflow:definition:index')]
    public function index(Request $request): Response
    {
        $where = $request->more([
            ['keywords', ''],
            ['group_id', ''],
            ['status', ''],
        ]);
        return $this->success(
            $this->withManageFlags($this->logic->getList($this->logic->search($where)))
        );
    }

    #[Permission('可发起流程列表', 'sandworkflow:definition:available')]
    public function available(Request $request): Response
    {
        $query = $this->logic->search($request->more([
            ['keywords', ''],
            ['group_id', ''],
        ]));
        $query->where('status', 1)->whereNotNull('publish_time');
        $ids = $this->initiableDefinitionIds();
        $query->whereIn('id', $ids === [] ? [-1] : $ids);
        return $this->success($this->logic->getList($query));
    }

    #[Permission('流程定义版本', 'sandworkflow:definition:versions')]
    public function versions(Request $request): Response
    {
        return $this->success($this->logic->versions((int) $request->get('id', 0)));
    }

    #[Permission('流程定义读取', 'sandworkflow:definition:read')]
    public function read(Request $request): Response
    {
        $row = $this->logic->read($request->input('id', 0))->toArray();
        $row['can_manage'] = $this->canManageRow($row, $this->viewerScope());
        $row['has_draft'] = DefinitionDraftCodec::hasDraft($row);
        return $this->success($row);
    }

    #[Permission('流程定义保存', 'sandworkflow:definition:save')]
    public function save(Request $request): Response
    {
        $data = $request->post();
        $this->validate('save', $data);
        return $this->success(['id' => $this->logic->add($data)], '保存成功');
    }

    #[Permission('流程定义更新', 'sandworkflow:definition:update')]
    public function update(Request $request): Response
    {
        $data = $request->post();
        $this->validate('update', $data);
        $this->logic->edit($data['id'] ?? 0, $data);
        return $this->success('更新成功');
    }

    #[Permission('流程定义发布', 'sandworkflow:definition:publish')]
    public function publish(Request $request): Response
    {
        $data = $request->post();
        $this->validate('publish', $data);
        return $this->success(['id' => $this->logic->publish($data)], '发布成功');
    }

    #[Permission('保存草稿', 'sandworkflow:definition:saveDraft')]
    public function saveDraft(Request $request): Response
    {
        $data = $request->post();
        $this->validate('saveDraft', $data);
        return $this->success(['id' => $this->logic->saveDraft($data)], '保存成功');
    }

    #[Permission('放弃草稿', 'sandworkflow:definition:discardDraft')]
    public function discardDraft(Request $request): Response
    {
        $this->logic->discardDraft((int) $request->post('id', 0));
        return $this->success('已放弃草稿');
    }

    #[Permission('流程定义删除', 'sandworkflow:definition:destroy')]
    public function destroy(Request $request): Response
    {
        $this->logic->destroy($request->post('ids', ''));
        return $this->success('删除成功');
    }

    private function viewerScope(): array
    {
        return ViewerScopeFactory::build(SandAdminWorkflowContextFactory::actor());
    }

    /**
     * 发起范围是定义 JSON 内的私有键，无法在 SQL 侧过滤；
     * 定义量级小，先在 PHP 侧算出发起范围命中的 id 再回灌查询，保证分页正确。
     * @return list<int>
     */
    private function initiableDefinitionIds(): array
    {
        $viewer = $this->viewerScope();
        $ids = [];
        $definitions = FlowDefinition::where('status', 1)
            ->whereNotNull('publish_time')
            ->field('id,definition_json')
            ->select();
        foreach ($definitions as $definition) {
            $json = $definition->getAttr('definition_json');
            if (InitiatorScopePolicy::canInitiate(is_array($json) ? $json : [], $viewer)) {
                $ids[] = (int) $definition->getAttr('id');
            }
        }
        return $ids;
    }

    private function withManageFlags(mixed $result): mixed
    {
        if (!is_array($result)) {
            return $result;
        }
        $viewer = $this->viewerScope();
        if (isset($result['data']) && is_array($result['data'])) {
            foreach ($result['data'] as $index => $row) {
                if (is_array($row)) {
                    $result['data'][$index] = $this->withDraftFlag($row, $viewer);
                }
            }
            return $result;
        }
        if (array_is_list($result)) {
            foreach ($result as $index => $row) {
                if (is_array($row)) {
                    $result[$index] = $this->withDraftFlag($row, $viewer);
                }
            }
        }
        return $result;
    }

    /**
     * 列表行补 can_manage / has_draft；draft_json 是大字段，不随列表下发。
     */
    private function withDraftFlag(array $row, array $viewer): array
    {
        $row['can_manage'] = $this->canManageRow($row, $viewer);
        $row['has_draft'] = DefinitionDraftCodec::hasDraft($row);
        unset($row['draft_json']);
        return $row;
    }

    private function canManageRow(array $row, array $viewer): bool
    {
        $json = $row['definition_json'] ?? null;
        return DefinitionAdminPolicy::canManage(is_array($json) ? $json : [], $viewer);
    }
}

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  Banner,
  Button,
  Input,
  Modal,
  Radio,
  RadioGroup,
  Select,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import { IconArrowLeft } from '@douyinfe/semi-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

import { ErrorState } from '@/components/ErrorState';
import { Loading } from '@/components/Loading';
import { useCan } from '@/hooks/useCan';
import { confirmAction } from '@/lib/confirmAction';

import {
  createDefinition,
  getDefinition,
  publishDefinition,
  updateDefinition,
} from '../api/definitions';
import { pluginErrorMessage } from '../api/pluginClient';
import type { Definition } from '../api/types';
import { DesignerCanvas } from '../components/designer/DesignerCanvas';
import { FlowSettingsPanel } from '../components/designer/FlowSettingsPanel';
import { SettingsPanel } from '../components/designer/SettingsPanel';
import { FormDesigner } from '../components/form/FormDesigner';
import { useDefinitionDraft } from '../hooks/useDefinitionDraft';
import { createDraft, loadDefinition, serializeDraft } from '../model/definitionCodec';
import { checkDraft, collectConditionVars, type DraftIssue } from '../model/draftCheck';
import { findNode } from '../model/nodeTree';
import { createBranch, createNode, nodeKeyOf } from '../model/nodeTypes';
import { widgetKeyOf } from '../model/widgets';

const NAME_MAX = 120;

/**
 * 流程编辑页壳：顶部基础信息与操作按钮，左侧画布、右侧设置面板占位。
 * 保存只写定义行字段（save/update 不落 definition_json）；发布走 publish——
 * 它是 definition_json 唯一写入口径，成功后按服务端规范化结果重置草稿（ADR-5）。
 */
export function DefinitionEditPage() {
  const { definitionId } = useParams();
  const isCreate = definitionId === 'new';
  const id = isCreate ? 0 : Number(definitionId);

  const definition = useQuery({
    queryKey: ['sandworkflow', 'definition', id],
    queryFn: () => getDefinition(id),
    enabled: !isCreate && Number.isFinite(id) && id > 0,
  });

  if (isCreate) {
    return <DesignerBody definition={null} />;
  }
  if (!Number.isFinite(id) || id <= 0) {
    return <ErrorState kind="404" />;
  }
  if (definition.isPending) {
    return <Loading />;
  }
  if (definition.isError || !definition.data) {
    return (
      <ErrorState
        kind="error"
        error={definition.error}
        onRetry={() => void definition.refetch()}
      />
    );
  }
  return (
    <DesignerBody
      key={`${definition.data.id}:${definition.data.current_version ?? 0}`}
      definition={definition.data}
    />
  );
}

interface DesignerBodyProps {
  definition: Definition | null;
}

interface MetaState {
  name: string;
  status: number;
  group_id: number | null;
  description: string;
  icon: string;
  is_cancelable: number;
}

function metaFromRow(definition: Definition | null): MetaState {
  return {
    name: definition?.name ?? '',
    status: definition?.status ?? 1,
    group_id: definition?.group_id ?? null,
    description: definition?.description ?? '',
    icon: definition?.icon ?? '',
    is_cancelable: definition?.is_cancelable ?? 1,
  };
}

function DesignerBody({ definition }: DesignerBodyProps) {
  const { t } = useTranslation('workflow');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const canManage = definition === null || definition.can_manage !== false;
  const canSaveRow = useCan(
    definition === null ? 'sandworkflow:definition:save' : 'sandworkflow:definition:update',
  );
  const canPublish = useCan('sandworkflow:definition:publish');

  const { draft, dispatch } = useDefinitionDraft(
    definition ? loadDefinition(definition.definition_json) : createDraft(),
  );
  const [meta, setMeta] = useState<MetaState>(() => metaFromRow(definition));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [issues, setIssues] = useState<DraftIssue[] | null>(null);
  // 右侧面板双态：节点设置 / 流程设置；点选节点时自动切回节点设置。
  const [flowSettingsOpen, setFlowSettingsOpen] = useState(false);
  // 主区双态：流程画布 / 表单设计（F-21 三步合一的布局取舍）。
  const [view, setView] = useState<'flow' | 'form'>('flow');
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);

  // 全树被条件引用的字段名；字段权限区据此禁掉可编辑项。
  const conditionVars = useMemo(() => collectConditionVars(draft.nodeConfig), [draft.nodeConfig]);

  // 未保存离开提醒：草稿/reducer 是引用替换，与初始基准做引用比较即脏标记；
  // 发布后 current_version 变化触发整页重挂载，基准自然重置。
  const baseDraftRef = useRef(draft);
  const baseMetaRef = useRef(meta);
  const dirty = draft !== baseDraftRef.current || meta !== baseMetaRef.current;
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // 删除节点/分支后选中的可能是子树里的节点，树里查不到就清掉选中态。
  const selectedNode = selectedKey ? findNode(draft.nodeConfig, selectedKey) : null;
  useEffect(() => {
    if (selectedKey && !findNode(draft.nodeConfig, selectedKey)) {
      setSelectedKey(null);
    }
  }, [draft, selectedKey]);
  useEffect(() => {
    if (
      selectedFieldKey &&
      !draft.flowWidgets.some((widget) => widgetKeyOf(widget) === selectedFieldKey)
    ) {
      setSelectedFieldKey(null);
    }
  }, [draft, selectedFieldKey]);

  const trimmedName = meta.name.trim();
  const canWrite = canManage && trimmedName !== '' && trimmedName.length <= NAME_MAX;

  const saveMutation = useMutation({
    mutationFn: (): Promise<{ id: number }> =>
      definition
        ? updateDefinition({
            id: definition.id,
            ...meta,
            name: trimmedName,
            permission_type: draft.flowPermission.type === 2 ? 2 : 1,
          }).then(() => ({ id: definition.id }))
        : createDefinition({
            ...meta,
            name: trimmedName,
            permission_type: draft.flowPermission.type === 2 ? 2 : 1,
          }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['sandworkflow'] });
      if (definition === null) {
        Toast.success(t('designer.toast.created'));
        navigate(`/app/sandworkflow/definitions/${result.id}/edit`, { replace: true });
        return;
      }
      // 行字段已落库，把脏标记基准对齐到刚保存的 meta（画布内容仍待发布）。
      baseMetaRef.current = meta;
      Toast.success(t('designer.toast.saved'));
    },
    onError: (error) => {
      Toast.error(pluginErrorMessage(error, t('designer.toast.loadFailed')));
    },
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      publishDefinition({
        id: definition?.id,
        name: trimmedName,
        status: meta.status,
        definition_json: serializeDraft(draft),
        group_id: meta.group_id,
        description: meta.description,
        icon: meta.icon,
        is_cancelable: meta.is_cancelable,
        // 后端以 JSON 内 flowPermission.type 为准回写该列，这里保持一致免得两处口径打架。
        permission_type: draft.flowPermission.type === 2 ? 2 : 1,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['sandworkflow'] });
      Toast.success(t('designer.toast.published'));
      if (definition === null) {
        navigate(`/app/sandworkflow/definitions/${result.id}/edit`, { replace: true });
      }
    },
    onError: (error) => {
      Toast.error(pluginErrorMessage(error, t('designer.toast.publishFailed')));
    },
  });

  const handleInsert = (afterKey: string, type: number) => {
    const node = createNode(type);
    dispatch({ type: 'insertNode', afterKey, node });
    setSelectedKey(nodeKeyOf(node));
  };

  const handleRemove = (key: string) => {
    dispatch({ type: 'removeNode', nodeKey: key });
  };

  const handleAddBranch = (gatewayKey: string) => {
    const gateway = findNode(draft.nodeConfig, gatewayKey);
    if (!gateway) {
      return;
    }
    const branch = createBranch(gateway.conditionNodes ?? []);
    dispatch({ type: 'addBranch', gatewayKey, branch });
    setSelectedKey(nodeKeyOf(branch));
  };

  /** 校验问题按字段名定位：找一级字段或明细子字段所属的控件键。 */
  const fieldKeyOf = (name: string): string | null => {
    for (const widget of draft.flowWidgets) {
      if (widget.name === name) {
        return widgetKeyOf(widget);
      }
      if ((widget.details ?? []).some((child) => child.name === name)) {
        return widgetKeyOf(widget);
      }
    }
    return null;
  };

  const handleLocate = (issue: DraftIssue) => {
    if (issue.nodeKey) {
      setView('flow');
      setFlowSettingsOpen(false);
      setSelectedKey(issue.nodeKey);
    } else if (issue.fieldName) {
      setView('form');
      setSelectedFieldKey(fieldKeyOf(issue.fieldName));
    }
    setIssues(null);
  };

  const handleValidate = () => {
    const report = checkDraft(draft, { name: trimmedName });
    if (report.ok) {
      Toast.success(t('designer.validateOk'));
      return;
    }
    setIssues(report.issues);
  };

  const handleSave = () => {
    if (!canWrite) {
      Toast.error(trimmedName ? t('designer.nameTooLong') : t('designer.nameRequired'));
      return;
    }
    saveMutation.mutate();
  };

  const handlePublish = () => {
    if (!canWrite) {
      Toast.error(trimmedName ? t('designer.nameTooLong') : t('designer.nameRequired'));
      return;
    }
    const report = checkDraft(draft, { name: trimmedName });
    if (!report.ok) {
      setIssues(report.issues);
      return;
    }
    confirmAction({
      title: t('designer.publishConfirmTitle', { name: trimmedName }),
      content: t('designer.publishConfirmBody'),
      onOk: () => publishMutation.mutate(),
    });
  };

  return (
    <div className="flex flex-col gap-0">
      <div
        className="flex flex-wrap items-center gap-3 px-1 pb-3"
        style={{ borderBottom: '1px solid var(--semi-color-border)' }}
      >
        <Button
          icon={<IconArrowLeft />}
          theme="borderless"
          aria-label={t('designer.back')}
          onClick={() => navigate('/app/sandworkflow/definitions')}
        />
        <Input
          value={meta.name}
          maxLength={NAME_MAX}
          placeholder={t('designer.namePlaceholder')}
          style={{ width: 280 }}
          onChange={(value) => setMeta((prev) => ({ ...prev, name: value }))}
        />
        <Select
          value={meta.status}
          style={{ width: 110 }}
          onChange={(value) => setMeta((prev) => ({ ...prev, status: Number(value) }))}
        >
          <Select.Option value={1}>{t('designer.statusEnabled')}</Select.Option>
          <Select.Option value={2}>{t('designer.statusDisabled')}</Select.Option>
        </Select>
        <RadioGroup
          type="button"
          value={view}
          onChange={(event) => setView(event.target.value === 'form' ? 'form' : 'flow')}
        >
          <Radio value="flow">{t('designer.viewFlow')}</Radio>
          <Radio value="form">{t('designer.viewForm')}</Radio>
        </RadioGroup>
        <div className="flex-1" />
        <Button
          theme={flowSettingsOpen ? 'solid' : 'light'}
          onClick={() => setFlowSettingsOpen((open) => !open)}
        >
          {t('designer.flow.open')}
        </Button>
        <Button theme="light" onClick={handleValidate}>
          {t('designer.validate')}
        </Button>
        {canSaveRow ? (
          <Button
            theme="light"
            loading={saveMutation.isPending}
            disabled={!canManage}
            onClick={handleSave}
          >
            {t('designer.save')}
          </Button>
        ) : null}
        {canPublish ? (
          <Button
            theme="solid"
            loading={publishMutation.isPending}
            disabled={!canManage}
            onClick={handlePublish}
          >
            {t('designer.publish')}
          </Button>
        ) : null}
      </div>
      {!canManage ? (
        <Banner type="warning" description={t('designer.notManager')} className="mt-3" />
      ) : (
        <Typography.Text type="secondary" size="small" className="mt-2">
          {t('designer.saveHint')}
        </Typography.Text>
      )}
      <div className="mt-2 flex items-start gap-0">
        {view === 'form' ? (
          <FormDesigner
            widgets={draft.flowWidgets}
            dispatch={dispatch}
            selectedKey={selectedFieldKey}
            onSelect={setSelectedFieldKey}
          />
        ) : (
          <>
            <div className="flex-1 overflow-x-auto">
              <DesignerCanvas
                root={draft.nodeConfig}
                selectedKey={selectedKey}
                onSelect={(key) => {
                  setSelectedKey(key);
                  setFlowSettingsOpen(false);
                }}
                onInsert={handleInsert}
                onRemove={handleRemove}
                onAddBranch={handleAddBranch}
                onRemoveBranch={(gatewayKey, branchKey) =>
                  dispatch({ type: 'removeBranch', gatewayKey, branchKey })
                }
                onMoveBranch={(gatewayKey, branchKey, offset) =>
                  dispatch({ type: 'moveBranch', gatewayKey, branchKey, offset })
                }
              />
            </div>
            {flowSettingsOpen ? (
              <FlowSettingsPanel
                flowPermission={draft.flowPermission}
                workFlowDef={draft.workFlowDef}
                meta={meta}
                onMetaChange={(patch) => setMeta((prev) => ({ ...prev, ...patch }))}
                dispatch={dispatch}
              />
            ) : (
              <SettingsPanel
                node={selectedNode}
                dispatch={dispatch}
                widgets={draft.flowWidgets}
                conditionVars={conditionVars}
              />
            )}
          </>
        )}
      </div>
      <Modal
        visible={issues !== null}
        title={t('designer.issuesTitle')}
        onCancel={() => setIssues(null)}
        footer={
          <Button theme="solid" onClick={() => setIssues(null)}>
            {t('common:actions.confirm')}
          </Button>
        }
      >
        <div className="flex flex-col gap-2">
          {(issues ?? []).map((issue, index) => (
            <div key={index} className="flex items-center justify-between gap-2">
              <Typography.Text type="danger" size="small">
                {issue.message}
              </Typography.Text>
              {issue.nodeKey || issue.fieldName ? (
                <Button
                  size="small"
                  theme="borderless"
                  type="primary"
                  onClick={() => handleLocate(issue)}
                >
                  {t('designer.issuesLocate')}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

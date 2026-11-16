import { useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  Button,
  Dropdown,
  Input,
  Select,
  Tag,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table/interface';
import {
  IconDelete,
  IconEdit,
  IconEyeOpened,
  IconPlus,
  IconSafe,
  IconSearch,
  IconUpload,
} from '@douyinfe/semi-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { Empty } from '@/components/Empty';
import { ErrorState } from '@/components/ErrorState';
import { ListPage } from '@/components/ListPage';
import { useCan } from '@/hooks/useCan';
import { useUrlQuery, type UrlQueryFields } from '@/hooks/useUrlQuery';
import { confirmAction, confirmDanger } from '@/lib/confirmAction';
import { formatRelativeTime } from '@/lib/format';

import {
  deleteDefinitions,
  listDefinitions,
  updateDefinition,
  type DefinitionListQuery,
} from '../api/definitions';
import { isPluginApiError, pluginErrorMessage } from '../api/pluginClient';
import { listAllGroups } from '../api/groups';
import type { Definition } from '../api/types';

const QUERY_FIELDS: UrlQueryFields = {
  keywords: {},
  group_id: { kind: 'number' },
  status: { kind: 'number' },
  page: { kind: 'number', defaultValue: 1 },
  limit: { kind: 'number', defaultValue: 10 },
};

function editPath(id: number | 'new'): string {
  return `/app/sandworkflow/definitions/${id}/edit`;
}

export function DefinitionListPage() {
  const { t } = useTranslation('workflow');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { values, setValues } = useUrlQuery(QUERY_FIELDS);

  const canCreate = useCan('sandworkflow:definition:save');
  const canRead = useCan('sandworkflow:definition:read');
  const canUpdate = useCan('sandworkflow:definition:update');
  const canPublish = useCan('sandworkflow:definition:publish');
  const canDelete = useCan('sandworkflow:definition:destroy');

  const keywords = typeof values.keywords === 'string' ? values.keywords : '';
  const groupId = typeof values.group_id === 'number' ? values.group_id : undefined;
  const status = typeof values.status === 'number' ? values.status : undefined;
  const page = typeof values.page === 'number' ? values.page : 1;
  const limit = typeof values.limit === 'number' ? values.limit : 10;

  const [keywordsInput, setKeywordsInput] = useState(keywords);
  const [moreOpenId, setMoreOpenId] = useState<number | null>(null);

  const [prevKeywords, setPrevKeywords] = useState(keywords);
  if (prevKeywords !== keywords) {
    setPrevKeywords(keywords);
    setKeywordsInput(keywords);
  }

  // URL 是 keywords 的唯一事实源，输入框防抖后写回。
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = keywordsInput.trim();
      if (next !== keywords) {
        setValues({ keywords: next || undefined, page: 1 });
      }
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywordsInput]);

  const query = useMemo<DefinitionListQuery>(
    () => ({ keywords: keywords || undefined, group_id: groupId, status, page, limit }),
    [keywords, groupId, status, page, limit],
  );

  const definitions = useQuery({
    queryKey: ['sandworkflow', 'definitions', query],
    queryFn: () => listDefinitions(query),
  });

  const groups = useQuery({
    queryKey: ['sandworkflow', 'groups'],
    queryFn: listAllGroups,
  });

  const invalidateDefinitions = () =>
    queryClient.invalidateQueries({ queryKey: ['sandworkflow', 'definitions'] });

  const statusMutation = useMutation({
    mutationFn: ({ row, next }: { row: Definition; next: number }) =>
      updateDefinition({
        id: row.id,
        name: row.name,
        status: next,
        group_id: row.group_id,
        description: row.description ?? '',
        icon: row.icon ?? '',
        is_cancelable: row.is_cancelable,
        permission_type: row.permission_type,
      }),
    onSuccess: (_result, { row, next }) => {
      void invalidateDefinitions();
      Toast.success(
        t(next === 1 ? 'definitions.toast.enabled' : 'definitions.toast.disabled', {
          name: row.name,
        }),
      );
    },
    onError: (error) => {
      Toast.error(pluginErrorMessage(error, t('definitions.loadFailed')));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (row: Definition) => deleteDefinitions([row.id]),
    onSuccess: (_result, row) => {
      void invalidateDefinitions();
      Toast.success(t('definitions.toast.deleted', { name: row.name }));
    },
    onError: (error) => {
      Toast.error(pluginErrorMessage(error, t('definitions.loadFailed')));
    },
  });

  const confirmDelete = (row: Definition) => {
    confirmDanger({
      title: t('definitions.confirm.deleteTitle', { name: row.name }),
      content: t('definitions.confirm.deleteBody'),
      okText: t('definitions.delete'),
      cancelText: t('definitions.confirm.thinkAgain'),
      okButtonProps: { type: 'danger' },
      onOk: () => deleteMutation.mutate(row),
    });
  };

  const toggleStatus = (row: Definition) => {
    const next = row.status === 1 ? 2 : 1;
    const confirm = next === 2 ? confirmDanger : confirmAction;
    confirm({
      title: t(next === 2 ? 'definitions.confirm.disableTitle' : 'definitions.confirm.enableTitle', {
        name: row.name,
      }),
      content: t(next === 2 ? 'definitions.confirm.disableBody' : 'definitions.confirm.enableBody'),
      okText: t(next === 2 ? 'definitions.disable' : 'definitions.enable'),
      cancelText: t('definitions.confirm.thinkAgain'),
      onOk: () => statusMutation.mutate({ row, next }),
    });
  };

  const hasFilters = Boolean(keywords || groupId !== undefined || status !== undefined);
  const items = definitions.data?.data ?? [];

  const emptyNode = hasFilters ? (
    <Empty title={t('definitions.emptyFiltered')}>
      <Button
        onClick={() =>
          setValues({ keywords: undefined, group_id: undefined, status: undefined, page: 1 })
        }
      >
        {t('definitions.clearFilters')}
      </Button>
    </Empty>
  ) : (
    <Empty title={undefined} description={t('definitions.emptyHint')}>
      {canCreate ? (
        <Button theme="solid" icon={<IconPlus />} onClick={() => navigate(editPath('new'))}>
          {t('definitions.add')}
        </Button>
      ) : null}
    </Empty>
  );

  const columns = useMemo<ColumnProps<Definition>[]>(
    () => [
      {
        title: t('definitions.colName'),
        dataIndex: 'name',
        render: (_value, row) => (
          <div className="flex flex-col">
            <Typography.Text strong>{row.name}</Typography.Text>
            {row.description ? (
              <Typography.Text type="secondary" size="small">
                {row.description}
              </Typography.Text>
            ) : null}
          </div>
        ),
      },
      {
        title: t('definitions.colGroup'),
        dataIndex: 'group_name',
        width: 140,
        render: (value: string | undefined) => (
          <Typography.Text type="secondary" size="small">
            {value || t('definitions.noGroup')}
          </Typography.Text>
        ),
      },
      {
        title: t('definitions.colStatus'),
        dataIndex: 'status',
        width: 90,
        render: (value: number) =>
          value === 1 ? (
            <Tag size="small" color="green">
              {t('definitions.statusEnabled')}
            </Tag>
          ) : (
            <Tag size="small" color="grey">
              {t('definitions.statusDisabled')}
            </Tag>
          ),
      },
      {
        title: t('definitions.colVersion'),
        dataIndex: 'publish_time',
        width: 150,
        render: (value: string | null, row) =>
          value ? (
            <div className="flex items-center gap-2">
              <Tag size="small" color="blue">
                v{row.current_version}
              </Tag>
              <Typography.Text type="secondary" size="small">
                {formatRelativeTime(value)}
              </Typography.Text>
            </div>
          ) : (
            <Tag size="small" color="orange">
              {t('definitions.unpublished')}
            </Tag>
          ),
      },
      {
        title: t('definitions.colUpdated'),
        dataIndex: 'update_time',
        width: 130,
        render: (value: string | null) => (
          <Typography.Text type="secondary" size="small">
            {formatRelativeTime(value)}
          </Typography.Text>
        ),
      },
      {
        title: t('definitions.colActions'),
        fixed: 'right',
        width: 200,
        render: (_value, row) => {
          const manageable = row.can_manage !== false;
          const menuItems: { key: string; name: string; icon?: ReactNode; danger?: boolean; onClick: () => void }[] = [
            canPublish && manageable
              ? {
                  key: 'publish',
                  name: t('definitions.publish'),
                  icon: <IconUpload />,
                  onClick: () => navigate(editPath(row.id)),
                }
              : null,
            canUpdate && manageable
              ? {
                  key: 'toggle',
                  name: row.status === 1 ? t('definitions.disable') : t('definitions.enable'),
                  icon: <IconSafe />,
                  onClick: () => toggleStatus(row),
                }
              : null,
            canDelete && manageable
              ? {
                  key: 'delete',
                  name: t('definitions.delete'),
                  icon: <IconDelete />,
                  danger: true,
                  onClick: () => confirmDelete(row),
                }
              : null,
          ].filter((i): i is NonNullable<typeof i> => i !== null);
          return (
            <div className="flex items-center gap-1">
              {canUpdate && manageable ? (
                <Button
                  size="small"
                  theme="borderless"
                  type="primary"
                  icon={<IconEdit />}
                  onClick={() => navigate(editPath(row.id))}
                >
                  {t('definitions.design')}
                </Button>
              ) : canRead ? (
                // 「设计流程」要 update 写码，只读用户进同一设计器路由，
                // 由编辑页按 useCan 判定进入只读模式。
                <Button
                  size="small"
                  theme="borderless"
                  type="primary"
                  icon={<IconEyeOpened />}
                  onClick={() => navigate(editPath(row.id))}
                >
                  {t('definitions.view')}
                </Button>
              ) : null}
              {menuItems.length > 0 ? (
                <Dropdown
                  trigger="click"
                  position="bottomRight"
                  visible={moreOpenId === row.id}
                  onVisibleChange={(visible) => setMoreOpenId(visible ? row.id : null)}
                  render={
                    <Dropdown.Menu>
                      {menuItems.map((item) => (
                        <Dropdown.Item
                          key={item.key}
                          icon={item.icon}
                          type={item.danger ? 'danger' : undefined}
                          onClick={() => {
                            setMoreOpenId(null);
                            item.onClick();
                          }}
                        >
                          {item.name}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  }
                >
                  <Button size="small" theme="borderless" type="primary">
                    {t('definitions.more')}
                  </Button>
                </Dropdown>
              ) : null}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, navigate, canRead, canUpdate, canPublish, canDelete, moreOpenId],
  );

  if (definitions.isError || definitions.isPaused) {
    const forbidden =
      isPluginApiError(definitions.error) &&
      (definitions.error.httpStatus === 403 || definitions.error.code === 403);
    return (
      <div className="flex flex-col gap-4">
        {forbidden ? (
          <ErrorState kind="403" showHome={false} />
        ) : (
          <ErrorState
            kind="error"
            error={definitions.error}
            paused={definitions.isPaused}
            onRetry={() => void definitions.refetch()}
            showHome={false}
          />
        )}
      </div>
    );
  }

  return (
    <ListPage
      title={t('definitions.title')}
      subtitle={t('definitions.subtitle')}
      filters={
        <>
          <Input
            prefix={<IconSearch />}
            placeholder={t('definitions.searchPlaceholder')}
            value={keywordsInput}
            onChange={setKeywordsInput}
            showClear
            style={{ width: 220 }}
          />
          <Select
            placeholder={t('definitions.statusAll')}
            value={status}
            onChange={(value) =>
              setValues({ status: typeof value === 'number' ? value : undefined, page: 1 })
            }
            showClear
            style={{ width: 140 }}
          >
            <Select.Option value={1}>{t('definitions.statusEnabled')}</Select.Option>
            <Select.Option value={2}>{t('definitions.statusDisabled')}</Select.Option>
          </Select>
          <Select
            placeholder={t('definitions.groupAll')}
            value={groupId}
            onChange={(value) =>
              setValues({ group_id: typeof value === 'number' ? value : undefined, page: 1 })
            }
            showClear
            style={{ width: 160 }}
          >
            {(groups.data ?? []).map((group) => (
              <Select.Option key={group.id} value={group.id}>
                {group.name}
              </Select.Option>
            ))}
          </Select>
        </>
      }
      toolbar={
        canCreate ? (
          <Button theme="solid" icon={<IconPlus />} onClick={() => navigate(editPath('new'))}>
            {t('definitions.add')}
          </Button>
        ) : undefined
      }
      columns={columns}
      dataSource={items}
      rowKey="id"
      loading={definitions.isPending || definitions.isFetching}
      empty={emptyNode}
      pagination={
        definitions.data && definitions.data.total > limit
          ? {
              page,
              pageSize: limit,
              total: definitions.data.total,
              onChange: (nextPage, nextSize) =>
                setValues({ page: nextPage, limit: nextSize }),
            }
          : undefined
      }
    />
  );
}

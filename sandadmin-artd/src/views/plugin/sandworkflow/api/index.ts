import request from '@/utils/http'

export type QueryParams = Record<string, unknown>
export type WorkflowRuntimeId = string

export interface GroupSearch {
  keywords?: string
  status?: number
}

export interface DefinitionSearch {
  keywords?: string
  group_id?: number
  status?: number
}

export interface FlowGroup {
  id: number
  name: string
  description?: string
  sort?: number
  status: number
}

export interface FlowDefinition {
  id: number
  group_id?: number
  group_name?: string
  name: string
  icon?: string
  description?: string
  definition_json?: unknown
  status: number
  is_cancelable?: number
  current_version?: number
}

export interface FlowDefinitionVersion {
  id: WorkflowRuntimeId
  definition_id: number
  version_no: number
  definition_json: unknown
  published_by?: number
  publish_time: string
}

export interface FlowInstance {
  id: WorkflowRuntimeId
  definition_id: number
  definition_version_id?: WorkflowRuntimeId
  account_space: string
  account_id: string
  name: string
  act_node_id?: string
  flow_status: number
  definition_snapshot?: unknown
  form_value?: unknown
  participants?: unknown
  definition?: FlowDefinition
  created_by?: number
  create_time?: string
  ended_time?: string
  update_time?: string
}

export interface FlowTask {
  id: WorkflowRuntimeId
  instance_id: WorkflowRuntimeId
  node_id?: string
  node_name?: string
  node_type: number
  sign_type?: 0 | 1 | 2 | 3
  task_status: number
  operation_type?: number
  comment?: string
  create_time?: string
  ended_time?: string
  assignees?: FlowTaskAssignee[]
  instance?: FlowInstance
}

export interface FlowTaskAssignee {
  id: WorkflowRuntimeId
  account_space: string
  account_id: string
  user_id?: number
  sequence_no?: number
  action_status: 0 | 1 | 2
  operation_type?: number
  comment?: string
  ended_time?: string
}

export interface FlowLog {
  id: WorkflowRuntimeId
  task_id?: WorkflowRuntimeId
  account_space: string
  account_id: string
  node_name?: string
  operation_type: number
  auditor_id?: number
  comment?: string
  create_time?: string
  assignee_snapshot?:
    | FlowActorSnapshot[]
    | {
        from?: FlowActorSnapshot
        to?: FlowActorSnapshot
        operator?: FlowActorSnapshot
        target?: FlowActorSnapshot
        from_node?: { id?: string; name?: string }
        to_node?: { id?: string; name?: string }
      }
}

export interface FlowActorSnapshot {
  account_space?: string
  account_id?: string
  snapshot?: { name?: string }
}

export interface FlowInstanceDetail extends FlowInstance {
  tasks: FlowTask[]
  logs: FlowLog[]
  form_access?: FlowFormAccess
}

export interface FlowFormAccess {
  source?: string
  node_id?: string | null
  readable_fields?: string[]
  legacy_fallback?: boolean
}

export interface FlowUser {
  id: number
  username: string
  nickname?: string
  dept_id?: number
}

export interface FlowRole {
  id: number
  name: string
  code?: string
}
export interface FlowDept {
  id: number
  parent_id?: number
  name: string
}

export interface FlowBackNode {
  id: string
  name: string
  node_type: number
  completed_time?: string | null
}

export default {
  organization: {
    users() {
      return request.get<FlowUser[]>({
        url: '/admin/v1/plugin/sandworkflow/index/list-users'
      })
    },
    roles() {
      return request.get<FlowRole[]>({ url: '/admin/v1/plugin/sandworkflow/index/list-roles' })
    },
    depts() {
      return request.get<FlowDept[]>({ url: '/admin/v1/plugin/sandworkflow/index/list-depts' })
    }
  },
  group: {
    list(params: QueryParams) {
      return request.get<Api.Common.ApiPage>({
        url: '/admin/v1/plugin/sandworkflow/group/index',
        params
      })
    },
    all() {
      return request.get<FlowGroup[]>({
        url: '/admin/v1/plugin/sandworkflow/group/all'
      })
    },
    read(id: number) {
      return request.get<FlowGroup>({
        url: '/admin/v1/plugin/sandworkflow/group/read',
        params: { id }
      })
    },
    save(data: QueryParams) {
      return request.post<Api.Common.ApiData>({
        url: '/admin/v1/plugin/sandworkflow/group/save',
        data
      })
    },
    update(data: QueryParams) {
      return request.put<Api.Common.ApiData>({
        url: '/admin/v1/plugin/sandworkflow/group/update',
        data
      })
    },
    delete(data: QueryParams) {
      return request.del<Api.Common.ApiData>({
        url: '/admin/v1/plugin/sandworkflow/group/destroy',
        data
      })
    }
  },
  definition: {
    list(params: QueryParams) {
      return request.get<Api.Common.ApiPage>({
        url: '/admin/v1/plugin/sandworkflow/definition/index',
        params
      })
    },
    available(params: QueryParams) {
      return request.get<Api.Common.ApiPage<FlowDefinition>>({
        url: '/admin/v1/plugin/sandworkflow/definition/available',
        params
      })
    },
    read(id: number) {
      return request.get<FlowDefinition>({
        url: '/admin/v1/plugin/sandworkflow/definition/read',
        params: { id }
      })
    },
    versions(id: number) {
      return request.get<FlowDefinitionVersion[]>({
        url: '/admin/v1/plugin/sandworkflow/definition/versions',
        params: { id }
      })
    },
    save(data: QueryParams) {
      return request.post<Api.Common.ApiData>({
        url: '/admin/v1/plugin/sandworkflow/definition/save',
        data
      })
    },
    publish(data: QueryParams) {
      return request.post<Api.Common.ApiData>({
        url: '/admin/v1/plugin/sandworkflow/definition/publish',
        data
      })
    },
    update(data: QueryParams) {
      return request.put<Api.Common.ApiData>({
        url: '/admin/v1/plugin/sandworkflow/definition/update',
        data
      })
    },
    delete(data: QueryParams) {
      return request.del<Api.Common.ApiData>({
        url: '/admin/v1/plugin/sandworkflow/definition/destroy',
        data
      })
    }
  },
  instance: {
    list(params: QueryParams) {
      return request.get<Api.Common.ApiPage<FlowInstance>>({
        url: '/admin/v1/plugin/sandworkflow/instance/index',
        params
      })
    },
    pending(params: QueryParams) {
      return request.get<Api.Common.ApiPage<FlowTask>>({
        url: '/admin/v1/plugin/sandworkflow/instance/pending-list',
        params
      })
    },
    mine(params: QueryParams) {
      return request.get<Api.Common.ApiPage<FlowInstance>>({
        url: '/admin/v1/plugin/sandworkflow/instance/my-list',
        params
      })
    },
    processed(params: QueryParams) {
      return request.get<Api.Common.ApiPage<FlowTask>>({
        url: '/admin/v1/plugin/sandworkflow/instance/processed-list',
        params
      })
    },
    copyList(params: QueryParams) {
      return request.get<Api.Common.ApiPage<FlowInstance>>({
        url: '/admin/v1/plugin/sandworkflow/instance/copy-list',
        params
      })
    },
    start(data: QueryParams) {
      return request.post<Api.Common.ApiData>({
        url: '/admin/v1/plugin/sandworkflow/instance/start',
        data
      })
    },
    detail(id: WorkflowRuntimeId) {
      return request.get<FlowInstanceDetail>({
        url: '/admin/v1/plugin/sandworkflow/instance/get-detail',
        params: { id }
      })
    },
    approve(data: QueryParams) {
      return request.post<Api.Common.ApiData>({
        url: '/admin/v1/plugin/sandworkflow/instance/approve',
        data
      })
    },
    reject(data: QueryParams) {
      return request.post<Api.Common.ApiData>({
        url: '/admin/v1/plugin/sandworkflow/instance/reject',
        data
      })
    },
    cancel(id: WorkflowRuntimeId) {
      return request.post<Api.Common.ApiData>({
        url: '/admin/v1/plugin/sandworkflow/instance/cancel',
        data: { id }
      })
    },
    comment(data: { instance_id: WorkflowRuntimeId; comment: string; task_id?: WorkflowRuntimeId }) {
      return request.post<FlowLog>({
        url: '/admin/v1/plugin/sandworkflow/instance/comment',
        data
      })
    },
    transfer(data: {
      task_id: WorkflowRuntimeId
      assignee_id: number
      comment?: string
      request_id?: string
    }) {
      return request.post<FlowTask>({
        url: '/admin/v1/plugin/sandworkflow/instance/transfer',
        data
      })
    },
    addSign(data: {
      task_id: WorkflowRuntimeId
      assignee_id: number
      comment: string
      request_id?: string
    }) {
      return request.post<FlowTask>({
        url: '/admin/v1/plugin/sandworkflow/instance/add-sign',
        data
      })
    },
    delSign(data: {
      task_id: WorkflowRuntimeId
      assignee_id: number
      comment: string
      request_id?: string
    }) {
      return request.post<FlowTask>({
        url: '/admin/v1/plugin/sandworkflow/instance/del-sign',
        data
      })
    },
    backNodeList(data: { task_id: WorkflowRuntimeId }) {
      return request.post<FlowBackNode[]>({
        url: '/admin/v1/plugin/sandworkflow/instance/back-node-list',
        data
      })
    },
    back(data: {
      task_id: WorkflowRuntimeId
      target_node_id: string
      comment: string
      request_id?: string
    }) {
      return request.post<FlowInstanceDetail>({
        url: '/admin/v1/plugin/sandworkflow/instance/back',
        data
      })
    }
  }
}

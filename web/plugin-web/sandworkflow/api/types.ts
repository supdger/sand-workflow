/**
 * SandWorkflow 插件后端契约类型。字段名与后端 definition_json、表列
 * 一一对应，snake_case/camelCase 原样保留，不做命名转换。
 * 后端未消费的键允许透传存库，类型上用索引签名放行，避免老数据被裁掉。
 */

/** 节点类型枚举（后端 FlowConstant::NODE）。type=6 后端发布拒收。 */
export const NODE_TYPE = {
  START: 0,
  APPROVE: 1,
  COPY: 2,
  CONDITION: 3,
  EXCLUSIVE_GATEWAY: 4,
  TRANSACT: 5,
  TRIGGER: 6,
  END: 9,
} as const;

export type NodeTypeValue = (typeof NODE_TYPE)[keyof typeof NODE_TYPE];

/** 处理人规则类型枚举（后端 FlowConstant::ASSIGNEE）。1/5 后端拒收。 */
export const ASSIGNEE_TYPE = {
  SELF: 0,
  SUPERIOR: 1,
  DEPARTMENT_LEADER: 2,
  ROLE: 3,
  ASSIGNEE: 4,
  MULTISTEP_LEADER: 5,
  MULTISTEP_DEPARTMENT_LEADER: 6,
  INITIATOR_CHOICE: 7,
} as const;

export type AssigneeTypeValue = (typeof ASSIGNEE_TYPE)[keyof typeof ASSIGNEE_TYPE];

/** 审批/办理节点的一条处理人规则；直通形态（{id}/{participant_key}/{account_space+account_id}）不设类型字段。 */
export interface AssigneeRule {
  /** 审批节点（type=1）的规则类型。 */
  assigneeType?: number;
  /** 办理节点（type=5）的规则类型。 */
  transactorType?: number;
  /** 指定角色（type=3）：角色 id 数组。 */
  roles?: number[];
  /** 指定成员（type=4）：{id} 对象或裸 id 数组，后端两种都吃。 */
  assignees?: (number | string | { id: number | string })[];
  /** 办理节点指定成员字段名。 */
  transactors?: (number | string | { id: number | string })[];
  /** 组织关系（type=2/6）：0 从发起人部门向上、1 从根部门向下。 */
  layerType?: number;
  /** 层数 0-20。 */
  layer?: number;
  /** 物化参与人键；缺省后端发布补 relation_ 前缀，全树唯一。 */
  relationKey?: string;
  /** 发起人自选（type=7）槽位键；缺省后端补 choice_ 前缀，全树唯一。 */
  choiceKey?: string;
  /** 直通：实例 participants 里的键。 */
  participant_key?: string;
  /** 直通：账户域（新数据一律 'sandadmin'）。 */
  account_space?: string;
  /** 直通：账户 id。 */
  account_id?: string | number;
  /** 直通：用户 id。 */
  id?: number | string;
  [key: string]: unknown;
}

/** 抄送规则：ccType 0/3/4 或 {id} 直通，其余后端拒收。 */
export interface CcRule {
  ccType?: number;
  roles?: number[];
  assignees?: (number | string | { id: number | string })[];
  id?: number | string;
  [key: string]: unknown;
}

/** 单条条件：左值是 form_value 字段名；operator 白名单见 CONDITION_OPERATORS。 */
export interface FlowCondition {
  varName?: string;
  operator?: number;
  val?: unknown;
  [key: string]: unknown;
}

/** 条件组：组内 conditions 为 AND，组间为 OR；空 conditionGroups = 默认分支。 */
export interface ConditionGroup {
  conditions?: FlowCondition[];
  [key: string]: unknown;
}

/** 节点级表单权限条目；readable/editable 后端接受 bool/1/0/'1'/'0'。 */
export interface FormAuthEntry {
  name: string;
  type?: number;
  label?: string;
  readable?: boolean | number | string;
  editable?: boolean | number | string;
  /** 明细字段的子字段权限；明细项本身不带 readable/editable。 */
  details?: FormAuthEntry[];
  [key: string]: unknown;
}

/** 节点对象：嵌套结构 childNode 链 + 网关 conditionNodes，与提交载荷同构。 */
export interface FlowNode {
  /** 类型必填；未知类型保留不丢（F-09 不支持节点占位）。 */
  type: number;
  /** 编辑器内部 id；缺省后端补 node_ 前缀。 */
  id?: string;
  /** 运行时节点标识；缺省后端按类型前缀补，全树唯一。 */
  nodeId?: string;
  name?: string;
  /** 后继节点；空 = 链尾。 */
  childNode?: FlowNode | null;
  /** 排他网关（type=4）的分支数组，元素是 type=3 条件节点。 */
  conditionNodes?: FlowNode[];
  /** 审批节点处理人规则。 */
  assignees?: AssigneeRule[];
  /** 办理节点处理人规则。 */
  transactors?: AssigneeRule[];
  /** 抄送节点抄送人规则。 */
  ccs?: CcRule[];
  /** 多人处理方式：0 或签 / 1 会签 / 2 同 0（发起自选校验用）/ 3 依次审批。 */
  multiInstanceApprovalType?: number;
  /** 允许运行时加签/减签：===1 生效。 */
  signable?: number;
  /** 允许回退到本节点：===1 生效。 */
  backable?: number;
  /** 节点级表单权限（type 1/2/5 被规范化）。 */
  formAuths?: FormAuthEntry[];
  /** 条件分支（type=3）的条件组；空数组/缺失 = 默认分支。 */
  conditionGroups?: ConditionGroup[];
  [key: string]: unknown;
}

/** 表单控件；type=9 明细只允许一层 details。 */
export interface FlowWidget {
  name: string;
  type: number;
  label?: string;
  details?: FlowWidget[];
  placeholder?: string;
  required?: boolean;
  options?: string[];
  /** 日期类：'YYYY-MM-DD' 或 'YYYY-MM-DD HH:mm'。 */
  format?: string;
  [key: string]: unknown;
}

/** 发起范围条目；name 仅展示，后端比对只用 type/id。 */
export interface FlowInitiator {
  type: 'user' | 'dept' | 'role' | string;
  id: number | string;
  name?: string;
  [key: string]: unknown;
}

/** 发起范围：type 1（含 0/缺失等一切非 2 值）= 全员；2 = 指定范围。 */
export interface FlowPermission {
  type?: number;
  flowInitiators?: FlowInitiator[];
  [key: string]: unknown;
}

/** 基础信息镜像；flowAdminIds 后端真实消费（管理权限判定）。 */
export interface WorkFlowDef {
  id?: number;
  icon?: string;
  name?: string;
  remark?: string;
  groupId?: number;
  cancelable?: number;
  flowAdminIds?: (number | string)[];
  [key: string]: unknown;
}

/** definition_json 顶层 4 键；其余顶层键透传存库。 */
export interface DefinitionJson {
  workFlowDef?: WorkFlowDef;
  flowWidgets?: FlowWidget[];
  nodeConfig?: FlowNode;
  flowPermission?: FlowPermission;
  [key: string]: unknown;
}

/** 定义行（sand_workflow_definition）；list 每行附 can_manage/group_name。 */
export interface Definition {
  id: number;
  group_id: number | null;
  name: string;
  icon: string | null;
  description: string | null;
  definition_json: DefinitionJson | null;
  permission_type: number;
  is_cancelable: number;
  publish_time: string | null;
  current_version: number;
  /** 1 启用 / 2 停用。 */
  status: number;
  created_by: number | null;
  updated_by: number | null;
  create_time: string | null;
  update_time: string | null;
  can_manage?: boolean;
  group_name?: string;
}

/** 版本快照行（sand_workflow_definition_version），version_no 倒序返回。 */
export interface DefinitionVersion {
  id: string;
  definition_id: number;
  version_no: number;
  definition_json: DefinitionJson;
  published_by: number | null;
  publish_time: string;
}

/** 流程分组（sand_workflow_group）。 */
export interface FlowGroup {
  id: number;
  name: string;
  description: string | null;
  sort: number;
  status: number;
}

export interface OrgUser {
  id: number;
  username: string;
  nickname: string;
  dept_id: number | null;
}

export interface OrgRole {
  id: number;
  name: string;
  code: string;
}

export interface OrgDept {
  id: number;
  parent_id: number | null;
  name: string;
}

/** think-orm paginate()->toArray() 结构：宿主 getList 列表返回。 */
export interface PluginPage<T> {
  data: T[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

/** publish 入参；definition_json 对象或 JSON 字符串皆可，统一传对象。 */
export interface PublishBody {
  id?: number;
  name: string;
  status: number;
  definition_json: DefinitionJson;
  group_id?: number | null;
  description?: string;
  icon?: string;
  permission_type?: number;
  is_cancelable?: number;
}

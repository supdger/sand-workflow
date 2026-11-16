/**
 * 画布渲染件共用的事件回调集合：由 DesignerCanvas 定义并沿
 * NodeChain → GatewayBranches → BranchColumn 逐层透传，
 * 避免每个渲染件各自声明一遍同一组 props。
 */
export interface CanvasHandlers {
  /** 当前选中节点的标识（nodeKeyOf 取值），null 为未选中。 */
  selectedKey: string | null;
  /** 只读（无 RBAC 写权限码）：增删改入口一律不渲染，点选查看仍可用。 */
  readOnly?: boolean;
  /** 点选节点卡片/分支头。 */
  onSelect: (key: string) => void;
  /** 链上「+」：在 afterKey 节点的 childNode 位置插入 type 类型节点。 */
  onInsert: (afterKey: string, type: number) => void;
  /** 删除节点（含整个排他网关）；根节点不可删。 */
  onRemove: (key: string) => void;
  /** 网关上新增一条条件分支（插到默认分支前）。 */
  onAddBranch: (gatewayKey: string) => void;
  /** 删除网关的一条分支（剩 2 条时前端不再触发）。 */
  onRemoveBranch: (gatewayKey: string, branchKey: string) => void;
  /** 分支左/右移一位；默认分支锁最后，不触发会越过它的移动。 */
  onMoveBranch: (gatewayKey: string, branchKey: string, offset: number) => void;
}

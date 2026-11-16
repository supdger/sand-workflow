# 更新日志

仅记录本插件可核实的版本变化；上游历史不作为本插件逐版发行记录。

## 1.1.0（迁移版，2026-11-16）

- 迁移到 SandAdmin 0.2.4 实测运行契约：宿主组织/授权数据全部改由 `app/support/HostOrg` 直查 `sand_system_user/user_role/role/dept/menu/role_menu`，不再经过 `plugin\sandadmin\app\model\system\*` 兼容模型层（`SystemUser`/`SystemDept`/`SystemUserRole`/`UserAuthCache`）。
- 权限校验改为插件自带 `app/middleware/CheckAuth`：JWT → `#[Permission]` slug → `sand_system_menu.slug` + `sand_system_role_menu` 直查；不再走 `plugin\sandadmin\app\middleware\CheckAuth` 与 `SystemMenuLogic` 缓存链。
- 部门祖先链弃用 `level` 物化路径，改为 `parent_id` 邻接链上溯（`HostOrg::deptAncestorsInRows`，含成环/断链截断）；`ViewerScopeFactory` 同步改造。
- 展示名列从 0.x `nickname` 假设改为 0.2.4 实列 `realname`；`is_super` 按 smallint 读。
- 权限码统一小写 kebab：`saveDraft→save-draft`、`discardDraft→discard-draft`、`pendingList→pending-list`、`myList→my-list`、`processedList→processed-list`、`copyList→copy-list`、`getDetail→get-detail`、`addSign→add-sign`、`delSign→del-sign`、`backNodeList→back-node-list`、`listUsers→list-users`、`listRoles→list-roles`、`listDepts→list-depts`；install/update SQL 播种同步。前端 `web/` 侧 `saveDraft`/`discardDraft` 引用需同步改名。
- `install.sql`/`install-mysql.sql` 保留 `sand_system_menu`/`role_menu` 播种：0.2.4 安装器落库仍是该旧式结构且全仓无 `sand_system_plugin`/`sand_system_role_permission` DDL，菜单播种是宿主自带 `sand-platform-menus.pgsql` 同款的本版唯一注册机制。
- `info.ini`（根部与插件两份）：`support` 提升 `">=0.2.4"`，`about`/版本号同步 1.1.0。

### 升级影响

- 与 1.0.x 不向后兼容：宿主侧已按旧驼峰码（如 `sandworkflow:instance:pendingList`）配置的自定义角色授权在升级后失效，需在角色管理中按新码重新勾选；`update.sql` 只把菜单播种刷新为新码，不自动改写既有授权语义。
- 实测环境：SandAdmin 0.2.4 纯安装库（`bin/sand install --data=pure`，PostgreSQL）；插件 install/update/uninstall 往返通过；MySQL 8.4 脚本在宿主表脚手架下全绿。

依据：本地 0.2.4 临时库 `wf_premerge_tmp_pg`/`wf_premerge_tmp_mysql` 验证记录，未发布。

## 1.0.8（修正版，2026-11-03）

- 修正发行元数据的宿主兼容声明：根部与 `plugin/sandworkflow/` 两份 `info.ini` 的 `support` 由 `6.x` 改为 `">=0.1.0"`，`about` 文案同步为 SandAdmin 0.1.x；`config/app.php` 与 `info.ini` 版本号一致为 1.0.8。1.0.7 预览资产内的元数据仍是旧声明。
- `uninstall.sql`（根部与 `plugin/sandworkflow/` 两份）回流权威源：与 1.0.7 预览资产一致的收紧版，即事务包裹并收紧菜单归属与路径边界谓词；该修复此前只随预览资产发布，权威源码未同步。
- 首个包含管理端路由修复的发行包：路由组增加 `/app/sandworkflow` 前缀，`plugin/sandworkflow/app/functions.php` 注册 `plugin\sandworkflow\` PSR-4 自动加载回退（SandPackage 安装不重建宿主 Composer 映射）。
- 移除未使用的 `OrganDialog.deprecated` 备份文件。
- README 与独立 Wiki 的中文“版本更新”入口及版本变化、升级影响说明随本版公开发布。

### 升级影响

- 仅 PostgreSQL，不提供 MySQL 数据原地迁移。首次安装与卸载会删除对应工作流表；先备份，已有数据不要通过重装修复。
- 本版修正发行元数据并补齐随包清理脚本；真实宿主的安装、升级与最小工作流验收范围见 [版本与验收范围](https://github.com/supdger/sand-workflow/wiki/SandWorkflow-Versions)。

依据：标签 `sandworkflow-v1.0.8`，公开资产见 [Releases](https://github.com/supdger/sand-workflow/releases)。

## 1.0.7（预览版，2026-09-21）

- 从独立 SandWorkflow 仓库重新构建预览包，包内文档明确 `supdger/sand-workflow` 为唯一权威来源。
- 此 PostgreSQL 工作流包提供流程定义、发布、发起、审批、待办与抄送查询；这些能力是 1.0.7 的现有基线，不表示本次重构包新增所有能力。

### 升级影响

- 仅 PostgreSQL，不提供 MySQL 数据原地迁移。首次安装与卸载会删除对应工作流表；先备份，已有数据不要通过重装修复。
- Release 沿用此前安装与卸载证据；真实升级和完整工作流验收仍待完成。预览包或文档发布不等于目标宿主业务通过。

依据：[公开预览 Release](https://github.com/supdger/sand-workflow/releases/tag/sandworkflow-v1.0.7-preview-ddea7b6)，标签 `sandworkflow-v1.0.7-preview-ddea7b6`（`ddea7b609b55d4f7c9b62c23ea9f1970e6fe2607`）。完整已公开历史见 [Releases](https://github.com/supdger/sand-workflow/releases)。没有可靠依据的中间版本不补写变化或发布日期。

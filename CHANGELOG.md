# 更新日志

仅记录本插件可核实的版本变化；上游历史不作为本插件逐版发行记录。

## 1.1.0（未发行，2026-11-17）

- 接口面迁到契约命名空间：管理端接口由旧路由组 `/app/sandworkflow/admin/*` 迁到契约声明的 `/api/admin/v1/plugin/sandworkflow/*`，动作段由 camelCase 改 kebab-case（如 `pendingList` → `pending-list`）；`config/route.php` 改为宿主契约生成器产出的薄壳，新增配套 `config/route.generated.php` 路由表。
- 权限域统一为 `sand_sandworkflow:`：34 个 `#[Permission]` 注解、`sand_system_menu` 按钮 slug（install.sql 种子）与契约 `x-permission` 同码；`update.sql` 追加幂等 UPDATE 把已装环境的旧 `sandworkflow:*` slug 原地改名，角色授权按 `menu_id` 关联自动保住；`uninstall.sql` 与 install 清理/授权匹配同时覆盖新旧两个域。
- 检查面：`tools/contract-check.sh` 锁定宿主 ref 升级为含运行时对齐检查的版本（薄壳形态、路由表与契约 paths×methods、Permission 码集、x-handler 落盘），并新增路由产物字节漂移比对；新增 `tests/permission-migration-test.php` 验证 slug 迁移不丢授权（需 `SAND_TEST_DB_URL`）。

### 升级影响

- 管理端接口路径与权限码全部变化：依赖旧 `/app/sandworkflow/admin/*` 路径或 `sandworkflow:*` 码的调用方、文档与外部集成须同步更新。
- 已装环境执行插件升级会改写菜单 slug；`sand_system_role_menu` 按 `menu_id` 关联，升级后角色授权保留。
- 本版尚未在真实 SandAdmin 宿主完成安装、升级与最小工作流验收；范围说明同 1.0.8。

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

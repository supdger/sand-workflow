# AGENTS.md — SandWorkflow

## 本仓是什么

SandWorkflow 是 SandAdmin 的 PostgreSQL 工作流与审批插件：PHP/Webman 后端 + Vue3 管理端（流程设计器改自 BeeFlow）。仅 PostgreSQL，业务表前缀 `sand_workflow_*`。

主要目录：

- `plugin/sandworkflow/`：插件后端。`app/{controller,logic,model,service,validate,contract,support}/`、`common/`、`config/`、`api/Install.php`、自带 MIT `LICENSE`、`info.ini`、`install/update/uninstall.sql`
- `sandadmin-artd/src/views/plugin/sandworkflow/`：管理端 Vue/JS/TS 视图（含 BeeFlow 派生设计器，自带 AGPL `LICENSE`）
- 根 `install/update/uninstall.sql`、`config.json`（前端依赖声明）、`info.ini`、`CHANGELOG.md`、`NOTICE`

数据库约定（`install.sql` 头部注释）：配置表 `int` 主键，运行时表 `char(21)` NanoID 主键 + ActorRef 作用域字段。

## 许可证（按目录划分，改动前必读 NOTICE）

- 根 `LICENSE` 为 AGPL-3.0：仓库作为整体分发时按保守口径适用 AGPL-3.0
- `plugin/sandworkflow/` 自写后端为 MIT（`plugin/sandworkflow/LICENSE`）
- `sandadmin-artd/src/views/plugin/sandworkflow/` 含 BeeFlow（workflow-web）派生代码，整个目录按 AGPL-3.0（目录内 `LICENSE`），派生文件清单见 `NOTICE`
- 新增前端文件若引用派生代码按 AGPL-3.0 对待（NOTICE 第四节）；不得把后端目录的 MIT 理解为整个仓库可按 MIT 分发

## 命名与注释规范

完整规范见 `/Users/supdger/agent-work/grokbot/devin-queue/命名与注释规范.md`（v2）；交付前跑 `/Users/supdger/agent-work/grokbot/devin-queue/naming_check.py` 自查。要点：

数据库（PostgreSQL only）：

- 表名 `sand_workflow_*`，小写蛇形单数；去前缀 ≤3 词、≤30 字符；主键 `id`；列主体 ≤3 词、≤30 字符，不以本表名词开头
- 布尔 `is_/has_/can_/must_` 或形容词/过去分词；时间点 `*_time`、日期 `*_date`，固定三列 `create_time`/`update_time`/`delete_time`；时长带单位
- `status` = 启停（1 启用、2 停用），`state` = 流转（字符串 + CHECK）；数量带单位；索引约束 `uk_/ix_/fk_/ck_` + 完整表名（存量索引为旧式命名，新对象按规范）

接口与契约：

- 路径全小写连字符、资源复数、动作放末段动词；JSON/查询参数小写蛇形、与列同名；枚举小写蛇形（任务状态 `queued/running/succeeded/failed/cancelled`）；错误码大写蛇形；权限码 `域:资源:动作`
- 迁移按序号追加；已发布迁移不改名、不改内容

代码：

- 类 PascalCase、函数/变量 camelCase、常量大写蛇形；函数/方法 ≤4 词、动词开头；不用 `Manager/Helper/Util/Processor/Wrapper/Info/Data` 收尾；不用 `usr/pwd/cnt/msg/btn/tbl/mgr/svc/cfg/val/ret` 等自造缩写；变量名不带类型后缀；布尔 `is/has/can/should` 开头
- 前端组件 `PascalCase.tsx`、hook `useXxx.ts`、测试 `同名.test.ts(x)`；PHP 遵守 PSR-12/PSR-4；管理端路由组带 `/app/sandworkflow` 前缀

注释：

- 只写代码看不出的原因/约束；禁流水账、「此函数用于」、横幅分隔线、表情、改动记录、注释掉的旧代码；新文件注释简体中文；`TODO(负责人或#编号): 原因`；BeeFlow 派生文件保留原作者版权与 AGPL 头，不删不改

统一叫法：`dept`、`file`、`create_time`/`update_time`/`delete_time`、`status` = 启停、`state` = 流转、`announcement`、`task`/`task_run`、`schedule`/`schedule_run`、`dict_type`、`audit_log`、`visibility`、`cancelled`（双写 l）、`client`。

## 提交规矩

- 只 `git add` 具体文件，禁 `git add -A`/`git add .`；不提交 `.env`、密钥、token、本机路径、临时产物
- 不 force push、不 `reset --hard`、不 `--no-verify`；不合并 PR、不打 tag
- 根部与 `plugin/sandworkflow/` 两份 `install/update/uninstall.sql` 需保持同步（CHANGELOG 1.0.8 有回流先例）

## 测试和检查命令

- 本仓无 `composer.json`/`package.json`/测试目录/CI 配置：暂无自动化测试与构建命令
- PHP 改动至少 `php -l` 逐文件检查；SQL 迁移按序号追加，已发布不改
- 真实宿主安装、升级与最小流程验收需隔离环境并获授权（1.0.8 尚未经真实宿主验收，见 README/CHANGELOG）

## 许可证

按目录划分，详见上方「许可证」一节与 `NOTICE`：根 AGPL-3.0、后端 `plugin/sandworkflow/` MIT、前端 `sandadmin-artd/src/views/plugin/sandworkflow/` AGPL-3.0（含 BeeFlow 派生代码）。

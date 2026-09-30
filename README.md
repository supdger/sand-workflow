# SandWorkflow

SandWorkflow 是面向 SandAdmin 0.1.x 的 PostgreSQL 工作流插件，提供流程设计、发布、发起、审批、待办、已办、抄送和流程数据管理。

> 当前公开 `1.0.7` 包为预发布候选，请从 [GitHub Releases](https://github.com/supdger/sand-workflow/releases) 下载完整 ZIP，核对版本、来源及宿主适配范围。尚不能据此声称目标宿主安装或业务验收通过。

详细步骤见 [安装与升级](https://github.com/supdger/sand-workflow/wiki/SandWorkflow-Installation)、[第一次完成流程](https://github.com/supdger/sand-workflow/wiki/SandWorkflow-First-Workflow)和[角色与权限](https://github.com/supdger/sand-workflow/wiki/SandWorkflow-Permissions)；完整入口见 [SandWorkflow Wiki](https://github.com/supdger/sand-workflow/wiki)。

## 功能

- 流程分组和可视化流程设计
- 流程版本发布
- 发起、审批、驳回、转办和抄送
- 待办、已办、我发起的和抄送我的
- 流程实例、任务和操作记录查询
- 表单权限、条件分支和审批人配置

## 环境要求

- SandAdmin 0.1.x
- PostgreSQL，宿主连接名为 `pgsql`；使用已有数据库
- 前端依赖见 `config.json`

当前版本以 `info.ini` 为准。本插件不提供 MySQL 数据原地迁移。

## 安装

安装前确认目标数据库没有需要保留的同名 `sand_workflow_*` 表；`install.sql` 会先删除这些表。重装不是修复入口，已有数据应走升级或经确认的数据处置流程。

1. 下载与目标版本对应的完整插件包。
2. 在 SandAdmin 插件管理中上传并安装。
3. 刷新后台菜单，为使用者授予 SandWorkflow 菜单和按钮权限。
4. 创建流程分组和流程定义，发布后发起一条流程进行验证。

升级前请备份数据库，并使用同一版本包内的 `update.sql`。卸载会删除插件表和菜单数据，执行前必须确认数据保留要求。

由宿主管理员提供流程管理员、发起人和启用的审批人，按 Wiki 分配权限。第一条流程的成功结果是：发起人提交、审批人通过，实例详情显示“已通过”，并能查询本次流转记录。

## 基本使用顺序

```text
创建流程分组
  → 创建流程定义
  → 配置表单和审批节点
  → 发布流程
  → 发起流程
  → 审批处理
  → 查询流程记录
```

## 目录

```text
plugin/sandworkflow/                           后端插件
sandadmin-artd/src/views/plugin/sandworkflow/ 管理端页面
info.ini                                       插件信息
config.json                                    依赖配置
install.sql                                    安装脚本
update.sql                                     升级脚本
uninstall.sql                                  卸载脚本
```

## 许可证与来源

SandWorkflow 包含基于 [workflow-web](https://github.com/zhangjinlibra/workflow-web) 修改的流程设计器代码，使用 [GNU AGPL v3](LICENSE)。来源和修改说明见 [NOTICE](NOTICE)。

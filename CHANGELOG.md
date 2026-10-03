# 更新日志

仅记录本插件可核实的版本变化；上游历史不作为本插件逐版发行记录。

## Unreleased

- 在 README 与独立 Wiki 增加明确的中文“版本更新”入口及版本变化、升级影响说明。本项为文档候选，尚未发布，不改变现有安装包。

## 1.0.7（预览版，2026-09-21）

- 从独立 SandWorkflow 仓库重新构建预览包，包内文档明确 `supdger/sand-workflow` 为唯一权威来源。
- 此 PostgreSQL 工作流包提供流程定义、发布、发起、审批、待办与抄送查询；这些能力是 1.0.7 的现有基线，不表示本次重构包新增所有能力。

### 升级影响

- 仅 PostgreSQL，不提供 MySQL 数据原地迁移。首次安装与卸载会删除对应工作流表；先备份，已有数据不要通过重装修复。
- Release 沿用此前安装与卸载证据；真实升级和完整工作流验收仍待完成。预览包或文档发布不等于目标宿主业务通过。

依据：[公开预览 Release](https://github.com/supdger/sand-workflow/releases/tag/sandworkflow-v1.0.7-preview-ddea7b6)，标签 `sandworkflow-v1.0.7-preview-ddea7b6`（`ddea7b609b55d4f7c9b62c23ea9f1970e6fe2607`）。完整已公开历史见 [Releases](https://github.com/supdger/sand-workflow/releases)。没有可靠依据的中间版本不补写变化或发布日期。

-- SandWorkflow MySQL 8.0+ upgrade script (idempotent).
-- MySQL 没有 ALTER TABLE ... IF NOT EXISTS，列存在性通过 information_schema 判断后再动态执行。
SET @add_log_snapshot := (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sand_workflow_log'
           AND COLUMN_NAME = 'form_change_snapshot'),
  'SELECT 1',
  'ALTER TABLE `sand_workflow_log` ADD COLUMN `form_change_snapshot` json NULL'));
PREPARE stmt_log_snapshot FROM @add_log_snapshot;
EXECUTE stmt_log_snapshot;
DEALLOCATE PREPARE stmt_log_snapshot;

SET @add_instance_cancelable := (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sand_workflow_instance'
           AND COLUMN_NAME = 'is_cancelable'),
  'SELECT 1',
  'ALTER TABLE `sand_workflow_instance` ADD COLUMN `is_cancelable` smallint NULL'));
PREPARE stmt_instance_cancelable FROM @add_instance_cancelable;
EXECUTE stmt_instance_cancelable;
DEALLOCATE PREPARE stmt_instance_cancelable;

-- 宿主更名后把存量账号空间 saiadmin 改写为 sandadmin，避免升级后待办消失。
UPDATE `sand_workflow_instance`
SET `account_space` = 'sandadmin',
    `tenant_id` = 'sandadmin',
    `owner_scope` = 'sandadmin'
WHERE `account_space` IN ('saiadmin', '');

UPDATE `sand_workflow_task_assignee`
SET `account_space` = 'sandadmin'
WHERE `account_space` IN ('saiadmin', '');

UPDATE `sand_workflow_log`
SET `account_space` = 'sandadmin'
WHERE `account_space` IN ('saiadmin', '');

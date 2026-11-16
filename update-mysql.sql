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

SET @add_definition_draft_json := (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sand_workflow_definition'
           AND COLUMN_NAME = 'draft_json'),
  'SELECT 1',
  'ALTER TABLE `sand_workflow_definition` ADD COLUMN `draft_json` json NULL'));
PREPARE stmt_definition_draft_json FROM @add_definition_draft_json;
EXECUTE stmt_definition_draft_json;
DEALLOCATE PREPARE stmt_definition_draft_json;

SET @add_definition_draft_time := (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sand_workflow_definition'
           AND COLUMN_NAME = 'draft_time'),
  'SELECT 1',
  'ALTER TABLE `sand_workflow_definition` ADD COLUMN `draft_time` datetime NULL'));
PREPARE stmt_definition_draft_time FROM @add_definition_draft_time;
EXECUTE stmt_definition_draft_time;
DEALLOCATE PREPARE stmt_definition_draft_time;

SET @add_definition_drafted_by := (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sand_workflow_definition'
           AND COLUMN_NAME = 'drafted_by'),
  'SELECT 1',
  'ALTER TABLE `sand_workflow_definition` ADD COLUMN `drafted_by` int NULL'));
PREPARE stmt_definition_drafted_by FROM @add_definition_drafted_by;
EXECUTE stmt_definition_drafted_by;
DEALLOCATE PREPARE stmt_definition_drafted_by;

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


-- 权限码改小写 kebab：原地改 slug 保住既有 role_menu 授权（menu_id 不变）。
UPDATE `sand_system_menu` m
JOIN (
  SELECT 'sandworkflow:definition:saveDraft' AS old_slug, 'sandworkflow:definition:save-draft' AS new_slug
  UNION ALL SELECT 'sandworkflow:definition:discardDraft', 'sandworkflow:definition:discard-draft'
  UNION ALL SELECT 'sandworkflow:instance:pendingList', 'sandworkflow:instance:pending-list'
  UNION ALL SELECT 'sandworkflow:instance:myList', 'sandworkflow:instance:my-list'
  UNION ALL SELECT 'sandworkflow:instance:processedList', 'sandworkflow:instance:processed-list'
  UNION ALL SELECT 'sandworkflow:instance:getDetail', 'sandworkflow:instance:get-detail'
  UNION ALL SELECT 'sandworkflow:instance:addSign', 'sandworkflow:instance:add-sign'
  UNION ALL SELECT 'sandworkflow:instance:delSign', 'sandworkflow:instance:del-sign'
  UNION ALL SELECT 'sandworkflow:instance:backNodeList', 'sandworkflow:instance:back-node-list'
  UNION ALL SELECT 'sandworkflow:instance:copyList', 'sandworkflow:instance:copy-list'
  UNION ALL SELECT 'sandworkflow:task:pendingList', 'sandworkflow:task:pending-list'
  UNION ALL SELECT 'sandworkflow:index:listUsers', 'sandworkflow:index:list-users'
  UNION ALL SELECT 'sandworkflow:index:listRoles', 'sandworkflow:index:list-roles'
  UNION ALL SELECT 'sandworkflow:index:listDepts', 'sandworkflow:index:list-depts'
) n ON n.old_slug = m.`slug`
SET m.`slug` = n.new_slug;

-- 「保存草稿 / 放弃草稿」按钮幂等播种：存量安装走 update 不进 install 菜单段。
INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`)
SELECT p.`id`, v.`name`, '', v.`slug`, 3, '', '', NULL, '', v.`sort`, '', 2, 2, 2, 2, 2, 0, '', 1, '', 1, 1, NOW(), NOW(), NULL
FROM (
  SELECT '保存草稿' AS `name`, 'sandworkflow:definition:save-draft' AS `slug`, 93 AS `sort`
  UNION ALL SELECT '放弃草稿', 'sandworkflow:definition:discard-draft', 92
) v
JOIN `sand_system_menu` p ON p.`code` = 'sandworkflow/manage/definition'
WHERE NOT EXISTS (SELECT 1 FROM `sand_system_menu` m WHERE m.`slug` = v.`slug`);

-- 新权限码跟着原有编辑权限走：已持 save 或 update 的角色才补绑，只读角色不授。
INSERT INTO `sand_system_role_menu` (`role_id`, `menu_id`)
SELECT r.`id`, m.`id`
FROM `sand_system_role` r
JOIN `sand_system_menu` m
  ON m.`slug` IN ('sandworkflow:definition:save-draft', 'sandworkflow:definition:discard-draft')
WHERE EXISTS (
    SELECT 1
    FROM `sand_system_role_menu` rm_edit
    JOIN `sand_system_menu` e ON e.`id` = rm_edit.`menu_id`
    WHERE rm_edit.`role_id` = r.`id`
      AND e.`slug` IN ('sandworkflow:definition:save', 'sandworkflow:definition:update')
  )
  AND NOT EXISTS (
    SELECT 1 FROM `sand_system_role_menu` rm
    WHERE rm.`role_id` = r.`id` AND rm.`menu_id` = m.`id`
  );

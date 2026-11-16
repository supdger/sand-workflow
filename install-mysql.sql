-- sandworkflow 工作流插件 安装脚本（SandAdmin 0.1.x / MySQL 8.0+）
-- 配置表 int；运行时表 char(21) NanoID + ActorRef 作用域字段
-- version: 1.0.7


DROP TABLE IF EXISTS `sand_workflow_log`;
DROP TABLE IF EXISTS `sand_workflow_task_assignee`;
DROP TABLE IF EXISTS `sand_workflow_task`;
DROP TABLE IF EXISTS `sand_workflow_instance`;
DROP TABLE IF EXISTS `sand_workflow_definition_version`;
DROP TABLE IF EXISTS `sand_workflow_definition`;
DROP TABLE IF EXISTS `sand_workflow_group`;

CREATE TABLE `sand_workflow_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `sort` int DEFAULT 100,
  `status` smallint DEFAULT 1,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `delete_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `sand_workflow_definition` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int DEFAULT NULL,
  `name` varchar(120) NOT NULL,
  `icon` varchar(1000) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `definition_json` json DEFAULT NULL,
  `draft_json` json DEFAULT NULL, -- 草稿信封：{"meta":行字段,"definition_json":设计器内容}；发布时清空
  `draft_time` datetime DEFAULT NULL, -- 最近一次保存草稿的时间
  `drafted_by` int DEFAULT NULL, -- 最近一次保存草稿的系统用户 id
  `permission_type` smallint DEFAULT 1,
  `is_cancelable` smallint DEFAULT 1,
  `publish_time` datetime DEFAULT NULL,
  `current_version` int DEFAULT 0,
  `status` smallint DEFAULT 1,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `delete_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX `idx_sand_workflow_definition_idx_group_id` ON `sand_workflow_definition` (`group_id`);

CREATE TABLE `sand_workflow_definition_version` (
  `id` char(21) NOT NULL,
  `definition_id` int NOT NULL,
  `version_no` int NOT NULL,
  `definition_json` json NOT NULL,
  `published_by` int DEFAULT NULL,
  `publish_time` datetime NOT NULL,
  `status` smallint DEFAULT 1,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `delete_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE UNIQUE INDEX `idx_sand_workflow_definition_version_uk_definition_version` ON `sand_workflow_definition_version` (`definition_id`,`version_no`);
CREATE INDEX `idx_sand_workflow_definition_version_idx_publish_time` ON `sand_workflow_definition_version` (`publish_time`);

CREATE TABLE `sand_workflow_instance` (
  `id` char(21) NOT NULL,
  `definition_id` int NOT NULL,
  `definition_version_id` char(21) DEFAULT NULL,
  `definition_snapshot` json DEFAULT NULL,
  `request_id` varchar(64) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `form_value` json DEFAULT NULL,
  `act_node_id` varchar(80) DEFAULT NULL,
  `ended_time` datetime DEFAULT NULL,
  `flow_status` smallint DEFAULT 0,
  `is_cancelable` smallint DEFAULT NULL, -- 发起时冻结的允许撤销开关；NULL 表示升级前的存量实例
  `status` smallint DEFAULT 1,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `delete_time` datetime DEFAULT NULL,
  `account_space` varchar(32) NOT NULL DEFAULT 'sandadmin',
  `account_id` varchar(64) NOT NULL DEFAULT '',
  `tenant_id` varchar(64) NOT NULL DEFAULT 'sandadmin',
  `owner_scope` varchar(64) NOT NULL DEFAULT 'sandadmin',
  `business_type` varchar(64) NOT NULL DEFAULT 'legacy',
  `business_id` varchar(64) NOT NULL DEFAULT '',
  `participants` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE UNIQUE INDEX `idx_sand_workflow_instance_uk_creator_request` ON `sand_workflow_instance` (`created_by`,`request_id`);
CREATE INDEX `idx_sand_workflow_instance_idx_definition_id` ON `sand_workflow_instance` (`definition_id`);
CREATE INDEX `idx_sand_workflow_instance_idx_definition_version_id` ON `sand_workflow_instance` (`definition_version_id`);
CREATE INDEX `idx_sand_workflow_instance_idx_flow_status` ON `sand_workflow_instance` (`flow_status`);
CREATE INDEX `idx_sand_workflow_instance_idx_created_by` ON `sand_workflow_instance` (`created_by`);
CREATE INDEX `idx_sand_workflow_instance_idx_business_scope` ON `sand_workflow_instance` (`tenant_id`,`owner_scope`,`business_type`,`business_id`);
CREATE INDEX `idx_sand_workflow_instance_idx_actor` ON `sand_workflow_instance` (`account_space`,`account_id`);

CREATE TABLE `sand_workflow_task` (
  `id` char(21) NOT NULL,
  `instance_id` char(21) NOT NULL,
  `definition_id` int NOT NULL,
  `node_id` varchar(80) NOT NULL,
  `node_name` varchar(120) DEFAULT NULL,
  `node_type` smallint NOT NULL,
  `sign_type` smallint DEFAULT 0,
  `assignee_ids` json DEFAULT NULL,
  `operation_type` smallint DEFAULT NULL,
  `comment` varchar(1000) DEFAULT NULL,
  `request_id` varchar(64) DEFAULT NULL,
  `ended_time` datetime DEFAULT NULL,
  `task_status` smallint DEFAULT 0,
  `status` smallint DEFAULT 1,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `delete_time` datetime DEFAULT NULL,
  `assignee_refs` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX `idx_sand_workflow_task_idx_instance_node` ON `sand_workflow_task` (`instance_id`,`node_id`);
CREATE INDEX `idx_sand_workflow_task_idx_task_status` ON `sand_workflow_task` (`task_status`);

CREATE TABLE `sand_workflow_task_assignee` (
  `id` char(21) NOT NULL,
  `task_id` char(21) NOT NULL,
  `instance_id` char(21) NOT NULL,
  `user_id` int DEFAULT NULL,
  `sequence_no` int NOT NULL DEFAULT 1,
  `action_status` smallint DEFAULT 0,
  `operation_type` smallint DEFAULT NULL,
  `comment` varchar(1000) DEFAULT NULL,
  `request_id` varchar(64) DEFAULT NULL,
  `ended_time` datetime DEFAULT NULL,
  `status` smallint DEFAULT 1,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `delete_time` datetime DEFAULT NULL,
  `account_space` varchar(32) NOT NULL DEFAULT 'sandadmin',
  `account_id` varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE UNIQUE INDEX `idx_sand_workflow_task_assignee_uk_task_actor` ON `sand_workflow_task_assignee` (`task_id`,`account_space`,`account_id`);
CREATE UNIQUE INDEX `idx_sand_workflow_task_assignee_uk_task_user` ON `sand_workflow_task_assignee` (`task_id`,`user_id`);
CREATE UNIQUE INDEX `idx_sand_workflow_task_assignee_uk_request_id` ON `sand_workflow_task_assignee` (`request_id`);
CREATE INDEX `idx_sand_workflow_task_assignee_idx_user_pending` ON `sand_workflow_task_assignee` (`user_id`,`action_status`);
CREATE INDEX `idx_sand_workflow_task_assignee_idx_task_sequence` ON `sand_workflow_task_assignee` (`task_id`,`sequence_no`);
CREATE INDEX `idx_sand_workflow_task_assignee_idx_instance_id` ON `sand_workflow_task_assignee` (`instance_id`);
CREATE INDEX `idx_sand_workflow_task_assignee_idx_actor_pending` ON `sand_workflow_task_assignee` (`account_space`,`account_id`,`action_status`);

CREATE TABLE `sand_workflow_log` (
  `id` char(21) NOT NULL,
  `instance_id` char(21) NOT NULL,
  `task_id` char(21) DEFAULT NULL,
  `node_id` varchar(80) DEFAULT NULL,
  `node_name` varchar(120) DEFAULT NULL,
  `operation_type` smallint NOT NULL,
  `auditor_id` int DEFAULT NULL,
  `assignee_snapshot` json DEFAULT NULL,
  `files` json DEFAULT NULL,
  `form_change_snapshot` json DEFAULT NULL,
  `comment` varchar(1000) DEFAULT NULL,
  `status` smallint DEFAULT 1,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `delete_time` datetime DEFAULT NULL,
  `account_space` varchar(32) NOT NULL DEFAULT 'sandadmin',
  `account_id` varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX `idx_sand_workflow_log_idx_instance_id` ON `sand_workflow_log` (`instance_id`);
CREATE INDEX `idx_sand_workflow_log_idx_auditor_id` ON `sand_workflow_log` (`auditor_id`);


-- 清理旧菜单（兼容半截安装）
DELETE FROM `sand_system_role_menu` WHERE `menu_id` IN (
  SELECT `id` FROM (
    SELECT `id` FROM `sand_system_menu`
    WHERE `slug` LIKE 'sandworkflow:%'
       OR `component` LIKE '/plugin/sandworkflow/%'
       OR `code` IN ('SandWorkflow','SandWorkflowCenter','SandWorkflowManage')
       OR `name` LIKE 'sandworkflow/%'
       OR `name` = 'SandWorkflow 工作流'
       OR `path` LIKE '/sandworkflow%'
  ) AS t
);

DELETE FROM `sand_system_menu`
WHERE `slug` LIKE 'sandworkflow:%'
   OR `component` LIKE '/plugin/sandworkflow/%'
   OR `code` IN ('SandWorkflow','SandWorkflowCenter','SandWorkflowManage')
   OR `name` LIKE 'sandworkflow/%'
   OR `name` = 'SandWorkflow 工作流'
   OR `path` LIKE '/sandworkflow%';

-- 菜单（type:1目录 2菜单 3按钮；权限码写在 slug）

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`)
VALUES
(0,'SandWorkflow 工作流','SandWorkflow','',1,'/sandworkflow','',NULL,'ri:flow-chart',100,'',2,2,2,2,2,0,'plugin\\sandworkflow\\app\\controller\\IndexController',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`)
VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'SandWorkflow') AS p),'流程中心','SandWorkflowCenter','',2,'center','/plugin/sandworkflow/center/index',NULL,'ri:todo-line',100,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`)
VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'SandWorkflowCenter') AS p),'发起审批','sandworkflow/center/start','',2,'start','/plugin/sandworkflow/center/start/index',NULL,'ri:send-plane-line',100,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`) VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/start') AS p),'发起','','sandworkflow:instance:start',3,'','',NULL,'',100,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/start') AS p),'可发起列表','','sandworkflow:definition:available',3,'','',NULL,'',99,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`)
VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'SandWorkflowCenter') AS p),'待审批','sandworkflow/center/task','',2,'task','/plugin/sandworkflow/center/task/index',NULL,'ri:checkbox-circle-line',99,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`) VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/task') AS p),'待办','','sandworkflow:instance:pendingList',3,'','',NULL,'',100,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/task') AS p),'任务待办','','sandworkflow:task:pendingList',3,'','',NULL,'',99,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/task') AS p),'通过','','sandworkflow:instance:approve',3,'','',NULL,'',98,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/task') AS p),'拒绝','','sandworkflow:instance:reject',3,'','',NULL,'',97,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/task') AS p),'评论','','sandworkflow:instance:comment',3,'','',NULL,'',96,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/task') AS p),'转办','','sandworkflow:instance:transfer',3,'','',NULL,'',95,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/task') AS p),'加签','','sandworkflow:instance:addSign',3,'','',NULL,'',94,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/task') AS p),'减签','','sandworkflow:instance:delSign',3,'','',NULL,'',93,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/task') AS p),'可回退节点','','sandworkflow:instance:backNodeList',3,'','',NULL,'',92,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/task') AS p),'回退','','sandworkflow:instance:back',3,'','',NULL,'',91,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/task') AS p),'详情','','sandworkflow:instance:getDetail',3,'','',NULL,'',90,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`)
VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'SandWorkflowCenter') AS p),'我的申请','sandworkflow/center/my','',2,'my','/plugin/sandworkflow/center/my/index',NULL,'ri:file-list-3-line',98,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`) VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/my') AS p),'列表','','sandworkflow:instance:myList',3,'','',NULL,'',100,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/my') AS p),'撤销','','sandworkflow:instance:cancel',3,'','',NULL,'',99,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/my') AS p),'详情','','sandworkflow:instance:getDetail',3,'','',NULL,'',98,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`)
VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'SandWorkflowCenter') AS p),'已处理','sandworkflow/center/processed','',2,'processed','/plugin/sandworkflow/center/processed/index',NULL,'ri:check-double-line',97,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`) VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/processed') AS p),'已处理列表','','sandworkflow:instance:processedList',3,'','',NULL,'',100,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/processed') AS p),'详情','','sandworkflow:instance:getDetail',3,'','',NULL,'',99,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`)
VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'SandWorkflowCenter') AS p),'抄送给我','sandworkflow/center/copy','',2,'copy','/plugin/sandworkflow/center/copy/index',NULL,'ri:share-forward-line',96,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`) VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/copy') AS p),'列表','','sandworkflow:instance:copyList',3,'','',NULL,'',100,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/center/copy') AS p),'详情','','sandworkflow:instance:getDetail',3,'','',NULL,'',99,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`)
VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'SandWorkflow') AS p),'流程管理','SandWorkflowManage','',2,'manage','/plugin/sandworkflow/manage/index',NULL,'ri:settings-3-line',99,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`)
VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'SandWorkflowManage') AS p),'流程分组','sandworkflow/manage/group','',2,'group','/plugin/sandworkflow/manage/group/index',NULL,'ri:folder-line',100,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`) VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/manage/group') AS p),'列表','','sandworkflow:group:index',3,'','',NULL,'',100,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/manage/group') AS p),'全部分组','','sandworkflow:group:all',3,'','',NULL,'',99,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/manage/group') AS p),'读取','','sandworkflow:group:read',3,'','',NULL,'',98,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/manage/group') AS p),'保存','','sandworkflow:group:save',3,'','',NULL,'',97,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/manage/group') AS p),'更新','','sandworkflow:group:update',3,'','',NULL,'',96,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/manage/group') AS p),'删除','','sandworkflow:group:destroy',3,'','',NULL,'',95,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`)
VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'SandWorkflowManage') AS p),'流程定义','sandworkflow/manage/definition','',2,'definition','/plugin/sandworkflow/manage/definition/index',NULL,'ri:node-tree',99,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`) VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/manage/definition') AS p),'定义列表','','sandworkflow:definition:index',3,'','',NULL,'',100,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/manage/definition') AS p),'发布','','sandworkflow:definition:publish',3,'','',NULL,'',99,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/manage/definition') AS p),'版本','','sandworkflow:definition:versions',3,'','',NULL,'',98,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/manage/definition') AS p),'读取','','sandworkflow:definition:read',3,'','',NULL,'',97,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/manage/definition') AS p),'保存','','sandworkflow:definition:save',3,'','',NULL,'',96,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/manage/definition') AS p),'更新','','sandworkflow:definition:update',3,'','',NULL,'',95,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/manage/definition') AS p),'删除','','sandworkflow:definition:destroy',3,'','',NULL,'',94,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/manage/definition') AS p),'保存草稿','','sandworkflow:definition:saveDraft',3,'','',NULL,'',93,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/manage/definition') AS p),'放弃草稿','','sandworkflow:definition:discardDraft',3,'','',NULL,'',92,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`)
VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'SandWorkflowManage') AS p),'流程编辑','sandworkflow/manage/definition/edit','',2,'definition/edit','/plugin/sandworkflow/manage/definition/edit',NULL,'',93,'',2,2,1,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`)
VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'SandWorkflow') AS p),'流程数据','sandworkflow/data/instance','',2,'data/instance','/plugin/sandworkflow/data/instance/index',NULL,'ri:database-2-line',98,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`) VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/data/instance') AS p),'列表','','sandworkflow:instance:index',3,'','',NULL,'',100,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/data/instance') AS p),'详情','','sandworkflow:instance:getDetail',3,'','',NULL,'',99,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`)
VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'SandWorkflow') AS p),'组织数据','sandworkflow/org','',2,'org','',NULL,'',50,'',2,2,1,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

INSERT INTO `sand_system_menu` (`parent_id`,`name`,`code`,`slug`,`type`,`path`,`component`,`method`,`icon`,`sort`,`link_url`,`is_iframe`,`is_keep_alive`,`is_hidden`,`is_fixed_tab`,`is_full_page`,`generate_id`,`generate_key`,`status`,`remark`,`created_by`,`updated_by`,`create_time`,`update_time`,`delete_time`) VALUES
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/org') AS p),'用户列表','','sandworkflow:index:listUsers',3,'','',NULL,'',100,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/org') AS p),'角色列表','','sandworkflow:index:listRoles',3,'','',NULL,'',99,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL),
((SELECT `id` FROM (SELECT `id` FROM `sand_system_menu` WHERE `code` = 'sandworkflow/org') AS p),'部门列表','','sandworkflow:index:listDepts',3,'','',NULL,'',98,'',2,2,2,2,2,0,'',1,'',1,1,NOW(),NOW(),NULL);

-- 绑定到非超管角色（超管 id=1 默认全权限）
INSERT INTO `sand_system_role_menu` (`role_id`, `menu_id`)
SELECT r.id, m.id
FROM `sand_system_role` r
JOIN `sand_system_menu` m
  ON (
    m.slug LIKE 'sandworkflow:%'
    OR m.component LIKE '/plugin/sandworkflow/%'
    OR m.code IN ('SandWorkflow','SandWorkflowCenter','SandWorkflowManage')
    OR m.name LIKE 'sandworkflow/%'
    OR m.name = 'SandWorkflow 工作流'
  )
WHERE r.id <> 1;

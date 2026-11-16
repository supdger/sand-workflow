-- SandWorkflow MySQL 8.0+ uninstall script.
DROP TABLE IF EXISTS `sand_workflow_log`;
DROP TABLE IF EXISTS `sand_workflow_task_assignee`;
DROP TABLE IF EXISTS `sand_workflow_task`;
DROP TABLE IF EXISTS `sand_workflow_instance`;
DROP TABLE IF EXISTS `sand_workflow_definition_version`;
DROP TABLE IF EXISTS `sand_workflow_definition`;
DROP TABLE IF EXISTS `sand_workflow_group`;

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

-- SandWorkflow PostgreSQL upgrade script (idempotent).
ALTER TABLE "sand_workflow_log" ADD COLUMN IF NOT EXISTS "form_change_snapshot" jsonb NULL;

-- 宿主更名后把存量账号空间 saiadmin 改写为 sandadmin，避免升级后待办消失。
UPDATE "sand_workflow_instance"
SET "account_space" = 'sandadmin',
    "tenant_id" = CASE WHEN "tenant_id" = 'saiadmin' THEN 'sandadmin' ELSE "tenant_id" END,
    "owner_scope" = CASE WHEN "owner_scope" = 'saiadmin' THEN 'sandadmin' ELSE "owner_scope" END
WHERE "account_space" = 'saiadmin';

UPDATE "sand_workflow_task_assignee"
SET "account_space" = 'sandadmin'
WHERE "account_space" = 'saiadmin';

UPDATE "sand_workflow_log"
SET "account_space" = 'sandadmin'
WHERE "account_space" = 'saiadmin';

UPDATE "sand_workflow_task"
SET "assignee_refs" = replace(replace("assignee_refs"::text, '"account_space": "saiadmin"', '"account_space": "sandadmin"'), '"account_space":"saiadmin"', '"account_space":"sandadmin"')::jsonb
WHERE "assignee_refs" IS NOT NULL AND "assignee_refs"::text LIKE '%saiadmin%';

UPDATE "sand_workflow_instance"
SET "participants" = replace(replace("participants"::text, '"account_space": "saiadmin"', '"account_space": "sandadmin"'), '"account_space":"saiadmin"', '"account_space":"sandadmin"')::jsonb
WHERE "participants" IS NOT NULL AND "participants"::text LIKE '%saiadmin%';

-- The PostgreSQL package starts at NanoID runtime IDs. RuntimeSchemaGuard
-- performs the structural check after the plugin update hook runs.
SELECT 1;

-- 权限域统一为 sand_sandworkflow:：旧版菜单 slug 原地改名，
-- sand_system_role_menu 按 menu_id 关联授权，slug 改名后授权自动保住。
UPDATE "sand_system_menu" AS m
SET "slug" = v.new_slug
FROM (VALUES
  ('sandworkflow:definition:available', 'sand_sandworkflow:definition:available'),
  ('sandworkflow:definition:destroy', 'sand_sandworkflow:definition:destroy'),
  ('sandworkflow:definition:index', 'sand_sandworkflow:definition:index'),
  ('sandworkflow:definition:publish', 'sand_sandworkflow:definition:publish'),
  ('sandworkflow:definition:read', 'sand_sandworkflow:definition:read'),
  ('sandworkflow:definition:save', 'sand_sandworkflow:definition:save'),
  ('sandworkflow:definition:update', 'sand_sandworkflow:definition:update'),
  ('sandworkflow:definition:versions', 'sand_sandworkflow:definition:versions'),
  ('sandworkflow:group:all', 'sand_sandworkflow:group:all'),
  ('sandworkflow:group:destroy', 'sand_sandworkflow:group:destroy'),
  ('sandworkflow:group:index', 'sand_sandworkflow:group:index'),
  ('sandworkflow:group:read', 'sand_sandworkflow:group:read'),
  ('sandworkflow:group:save', 'sand_sandworkflow:group:save'),
  ('sandworkflow:group:update', 'sand_sandworkflow:group:update'),
  ('sandworkflow:index:listDepts', 'sand_sandworkflow:index:list-depts'),
  ('sandworkflow:index:listRoles', 'sand_sandworkflow:index:list-roles'),
  ('sandworkflow:index:listUsers', 'sand_sandworkflow:index:list-users'),
  ('sandworkflow:instance:addSign', 'sand_sandworkflow:instance:add-sign'),
  ('sandworkflow:instance:approve', 'sand_sandworkflow:instance:approve'),
  ('sandworkflow:instance:back', 'sand_sandworkflow:instance:back'),
  ('sandworkflow:instance:backNodeList', 'sand_sandworkflow:instance:back-node-list'),
  ('sandworkflow:instance:cancel', 'sand_sandworkflow:instance:cancel'),
  ('sandworkflow:instance:comment', 'sand_sandworkflow:instance:comment'),
  ('sandworkflow:instance:copyList', 'sand_sandworkflow:instance:copy-list'),
  ('sandworkflow:instance:delSign', 'sand_sandworkflow:instance:del-sign'),
  ('sandworkflow:instance:getDetail', 'sand_sandworkflow:instance:get-detail'),
  ('sandworkflow:instance:index', 'sand_sandworkflow:instance:index'),
  ('sandworkflow:instance:myList', 'sand_sandworkflow:instance:my-list'),
  ('sandworkflow:instance:pendingList', 'sand_sandworkflow:instance:pending-list'),
  ('sandworkflow:instance:processedList', 'sand_sandworkflow:instance:processed-list'),
  ('sandworkflow:instance:reject', 'sand_sandworkflow:instance:reject'),
  ('sandworkflow:instance:start', 'sand_sandworkflow:instance:start'),
  ('sandworkflow:instance:transfer', 'sand_sandworkflow:instance:transfer'),
  ('sandworkflow:task:pendingList', 'sand_sandworkflow:task:pending-list')
) AS v(old_slug, new_slug)
WHERE m."slug" = v.old_slug;

-- SandWorkflow PostgreSQL upgrade script (idempotent).
ALTER TABLE "sand_workflow_log" ADD COLUMN IF NOT EXISTS "form_change_snapshot" jsonb NULL;
ALTER TABLE "sand_workflow_instance" ADD COLUMN IF NOT EXISTS "is_cancelable" smallint NULL;
ALTER TABLE "sand_workflow_definition" ADD COLUMN IF NOT EXISTS "draft_json" jsonb NULL;
ALTER TABLE "sand_workflow_definition" ADD COLUMN IF NOT EXISTS "draft_time" timestamp(0) without time zone NULL;
ALTER TABLE "sand_workflow_definition" ADD COLUMN IF NOT EXISTS "drafted_by" int NULL;

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


-- 权限码改小写 kebab：原地改 slug 保住既有 role_menu 授权（menu_id 不变）。
UPDATE "sand_system_menu" m SET "slug" = n.new_slug
FROM (VALUES
  ('sandworkflow:definition:saveDraft',   'sandworkflow:definition:save-draft'),
  ('sandworkflow:definition:discardDraft','sandworkflow:definition:discard-draft'),
  ('sandworkflow:instance:pendingList',   'sandworkflow:instance:pending-list'),
  ('sandworkflow:instance:myList',        'sandworkflow:instance:my-list'),
  ('sandworkflow:instance:processedList', 'sandworkflow:instance:processed-list'),
  ('sandworkflow:instance:getDetail',     'sandworkflow:instance:get-detail'),
  ('sandworkflow:instance:addSign',       'sandworkflow:instance:add-sign'),
  ('sandworkflow:instance:delSign',       'sandworkflow:instance:del-sign'),
  ('sandworkflow:instance:backNodeList',  'sandworkflow:instance:back-node-list'),
  ('sandworkflow:instance:copyList',      'sandworkflow:instance:copy-list'),
  ('sandworkflow:task:pendingList',       'sandworkflow:task:pending-list'),
  ('sandworkflow:index:listUsers',        'sandworkflow:index:list-users'),
  ('sandworkflow:index:listRoles',        'sandworkflow:index:list-roles'),
  ('sandworkflow:index:listDepts',        'sandworkflow:index:list-depts')
) AS n(old_slug, new_slug)
WHERE m."slug" = n.old_slug;

-- 「保存草稿 / 放弃草稿」按钮幂等播种：存量安装走 update 不进 install 菜单段。
INSERT INTO "sand_system_menu" ("parent_id","name","code","slug","type","path","component","method","icon","sort","link_url","is_iframe","is_keep_alive","is_hidden","is_fixed_tab","is_full_page","generate_id","generate_key","status","remark","created_by","updated_by","create_time","update_time","delete_time")
SELECT p."id", v."name", '', v."slug", 3, '', '', NULL, '', v."sort", '', 2, 2, 2, 2, 2, 0, '', 1, '', 1, 1, NOW(), NOW(), NULL
FROM (
  SELECT '保存草稿' AS "name", 'sandworkflow:definition:save-draft' AS "slug", 93 AS "sort"
  UNION ALL SELECT '放弃草稿', 'sandworkflow:definition:discard-draft', 92
) v
JOIN "sand_system_menu" p ON p."code" = 'sandworkflow/manage/definition'
WHERE NOT EXISTS (SELECT 1 FROM "sand_system_menu" m WHERE m."slug" = v."slug");

-- 新权限码跟着原有编辑权限走：已持 save 或 update 的角色才补绑，只读角色不授。
INSERT INTO "sand_system_role_menu" ("role_id", "menu_id")
SELECT r."id", m."id"
FROM "sand_system_role" r
JOIN "sand_system_menu" m
  ON m."slug" IN ('sandworkflow:definition:save-draft', 'sandworkflow:definition:discard-draft')
WHERE EXISTS (
    SELECT 1
    FROM "sand_system_role_menu" rm_edit
    JOIN "sand_system_menu" e ON e."id" = rm_edit."menu_id"
    WHERE rm_edit."role_id" = r."id"
      AND e."slug" IN ('sandworkflow:definition:save', 'sandworkflow:definition:update')
  )
  AND NOT EXISTS (
    SELECT 1 FROM "sand_system_role_menu" rm
    WHERE rm."role_id" = r."id" AND rm."menu_id" = m."id"
  );

-- The PostgreSQL package starts at NanoID runtime IDs. RuntimeSchemaGuard
-- performs the structural check after the plugin update hook runs.
SELECT 1;

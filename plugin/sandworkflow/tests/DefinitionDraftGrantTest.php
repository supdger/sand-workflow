<?php
declare(strict_types=1);

// update.sql「保存草稿 / 放弃草稿」补绑段的授权边界回归测试：
// 真实库场景下只有持 save 或 update 的角色拿得到新码，只读角色不授。
// 连不上 PG 时走环境变量 WF_DRAFT_TEST_PG 指定的 conninfo，仍不通则显式 SKIP。
final class DefinitionDraftGrantTest
{
    private const DRAFT_SLUGS = "'sandworkflow:definition:save-draft','sandworkflow:definition:discard-draft'";

    public function testGrantSectionGrantsEditorsOnly(TestContext $t): void
    {
        $conninfo = getenv('WF_DRAFT_TEST_PG') ?: 'host=127.0.0.1 port=25540 user=supdger';
        $conninfo = trim((string) preg_replace('/\bdbname=\S+/', '', $conninfo));
        $adminDsn = $conninfo . ' dbname=postgres';
        $testDsn = $conninfo . ' dbname=wf_draft2_grant_test';

        [$code] = self::psql($adminDsn, 'SELECT 1');
        if ($code !== 0) {
            fwrite(STDOUT, "  SKIP DefinitionDraftGrantTest::testGrantSectionGrantsEditorsOnly — 连不上 PG（{$adminDsn}），用 WF_DRAFT_TEST_PG 指定连接串\n");
            return;
        }

        $repoRoot = dirname(__DIR__, 3);
        $segment = self::extractSegment((string) file_get_contents($repoRoot . '/update.sql'));
        $t->check($segment !== '', 'update.sql 抽得出菜单播种+补绑原文段');
        if ($segment === '') {
            return;
        }

        $fixtureFile = (string) tempnam(sys_get_temp_dir(), 'wf_draft2_fixture_') . '.sql';
        $segmentFile = (string) tempnam(sys_get_temp_dir(), 'wf_draft2_segment_') . '.sql';
        file_put_contents($fixtureFile, self::fixtureSql());
        file_put_contents($segmentFile, $segment);

        self::psql($adminDsn, 'DROP DATABASE IF EXISTS wf_draft2_grant_test');
        try {
            [$c1] = self::psql($adminDsn, 'CREATE DATABASE wf_draft2_grant_test');
            $t->check($c1 === 0, '临时库 wf_draft2_grant_test 建库成功');
            if ($c1 !== 0) {
                return;
            }
            [$c2] = self::psqlFile($testDsn, $fixtureFile);
            $t->check($c2 === 0, '夹具表与数据写入成功');
            [$c3] = self::psqlFile($testDsn, $segmentFile);
            $t->check($c3 === 0, 'update.sql 原文段执行成功');
            if ($c2 !== 0 || $c3 !== 0) {
                return;
            }

            [, $grantsFirst] = self::psql($testDsn,
                'SELECT rm.role_id || ' . "':'" . ' || m.slug FROM sand_system_role_menu rm'
                . ' JOIN sand_system_menu m ON m.id = rm.menu_id'
                . ' WHERE m.slug IN (' . self::DRAFT_SLUGS . ') ORDER BY 1');
            $grantedFirst = array_values(array_filter(explode("\n", $grantsFirst)));
            $t->check(
                $grantedFirst === ['2:sandworkflow:definition:discard-draft', '2:sandworkflow:definition:save-draft'],
                '只有持 save+update 的角色 2 拿到两个草稿码，实际: ' . ($grantsFirst === '' ? '（空）' : $grantsFirst)
            );

            // 幂等 + 「任一编辑码即算」：再给只持 save 的角色 5，复跑原文段后只新增角色 5 的两行。
            self::psql($testDsn, "INSERT INTO sand_system_role (id,name) VALUES (5,'仅保存角色');"
                . ' INSERT INTO sand_system_role_menu (role_id,menu_id) VALUES (5,20);');
            [$c4] = self::psqlFile($testDsn, $segmentFile);
            $t->check($c4 === 0, '原文段复跑仍幂等执行成功');
            [, $grantsRerun] = self::psql($testDsn,
                'SELECT rm.role_id || ' . "':'" . ' || m.slug FROM sand_system_role_menu rm'
                . ' JOIN sand_system_menu m ON m.id = rm.menu_id'
                . ' WHERE m.slug IN (' . self::DRAFT_SLUGS . ') ORDER BY 1');
            $grantedRerun = array_values(array_filter(explode("\n", $grantsRerun)));
            $t->check($grantedRerun === [
                '2:sandworkflow:definition:discard-draft',
                '2:sandworkflow:definition:save-draft',
                '5:sandworkflow:definition:discard-draft',
                '5:sandworkflow:definition:save-draft',
            ], '复跑后只补只持 save 的角色 5，角色 2 不重复绑，实际: ' . $grantsRerun);
        } finally {
            self::psql($adminDsn, 'DROP DATABASE IF EXISTS wf_draft2_grant_test');
            @unlink($fixtureFile);
            @unlink($segmentFile);
        }
    }

    public function testGrantSqlIsMinimalGrant(TestContext $t): void
    {
        $repoRoot = dirname(__DIR__, 3);
        $update = (string) file_get_contents($repoRoot . '/update.sql');
        $segment = self::extractSegment($update);

        // 补绑段必须按 save/update 存在性 JOIN 过滤，不再是非超管裸绑。
        $t->check(
            str_contains($segment, "'sandworkflow:definition:save'")
            && str_contains($segment, "'sandworkflow:definition:update'"),
            'PG 补绑段以 save/update 存在性为前置条件'
        );
        $t->check(!str_contains($segment, 'r."id" <> 1'), 'PG 补绑段不含非超管裸绑条件');

        $updateMysql = (string) file_get_contents($repoRoot . '/update-mysql.sql');
        $mysqlSegment = substr($updateMysql, (int) strpos($updateMysql, '幂等播种'));
        $t->check(
            str_contains($mysqlSegment, "'sandworkflow:definition:save'")
            && str_contains($mysqlSegment, "'sandworkflow:definition:update'"),
            'MySQL 补绑段以 save/update 存在性为前置条件'
        );
        $t->check(!str_contains($mysqlSegment, 'r.`id` <> 1'), 'MySQL 补绑段不含非超管裸绑条件');

        // install 广绑段要把两个草稿码排除，且尾部另带按编辑权限补授的最小授权段。
        $install = (string) file_get_contents($repoRoot . '/install.sql');
        $broad = substr($install, (int) strpos($install, '绑定到非超管角色'));
        $t->check(
            str_contains($broad, "m.slug NOT IN ('sandworkflow:definition:save-draft', 'sandworkflow:definition:discard-draft')"),
            'PG install 广绑排除了两个草稿码'
        );
        $t->check(
            str_contains($broad, "'sandworkflow:definition:save'")
            && str_contains($broad, "'sandworkflow:definition:update'"),
            'PG install 尾部有按编辑权限补授段'
        );

        $installMysql = (string) file_get_contents($repoRoot . '/install-mysql.sql');
        $broadMysql = substr($installMysql, (int) strpos($installMysql, '绑定到非超管角色'));
        $t->check(
            str_contains($broadMysql, "m.slug NOT IN ('sandworkflow:definition:save-draft', 'sandworkflow:definition:discard-draft')"),
            'MySQL install 广绑排除了两个草稿码'
        );
        $t->check(
            str_contains($broadMysql, "'sandworkflow:definition:save'")
            && str_contains($broadMysql, "'sandworkflow:definition:update'"),
            'MySQL install 尾部有按编辑权限补授段'
        );

        // 根部与 plugin/ 两份脚本必须保持同步。
        foreach (['update.sql', 'update-mysql.sql', 'install.sql', 'install-mysql.sql'] as $name) {
            $t->check(
                file_get_contents($repoRoot . '/' . $name)
                === file_get_contents($repoRoot . '/plugin/sandworkflow/' . $name),
                "根部与 plugin/ 的 {$name} 内容一致"
            );
        }
    }

    /** 从 update.sql 抠出菜单播种到补绑 INSERT 结束的原文段。 */
    private static function extractSegment(string $sql): string
    {
        $start = strpos($sql, '「保存草稿 / 放弃草稿」按钮幂等播种');
        if ($start === false) {
            return '';
        }
        $end = strpos($sql, 'The PostgreSQL package', $start);
        if ($end === false) {
            return '';
        }
        $lineStart = strrpos(substr($sql, 0, $start), "\n");
        $commentLine = strrpos(substr($sql, 0, $end), "\n-- ");
        return trim(substr($sql, $lineStart === false ? 0 : $lineStart + 1, $commentLine === false ? $end : $commentLine - ($lineStart ?: 0) - 1));
    }

    /** @return array{0:int,1:string} 退出码与合并输出。 */
    private static function psql(string $conninfo, string $sql): array
    {
        $cmd = 'psql ' . escapeshellarg($conninfo) . ' -X -v ON_ERROR_STOP=1 -qAt -c ' . escapeshellarg($sql) . ' 2>&1';
        exec($cmd, $out, $code);
        return [$code, implode("\n", $out)];
    }

    /** @return array{0:int,1:string} 退出码与合并输出。 */
    private static function psqlFile(string $conninfo, string $file): array
    {
        $cmd = 'psql ' . escapeshellarg($conninfo) . ' -X -v ON_ERROR_STOP=1 -qAt -f ' . escapeshellarg($file) . ' 2>&1';
        exec($cmd, $out, $code);
        return [$code, implode("\n", $out)];
    }

    private static function fixtureSql(): string
    {
        return <<<'SQL'
CREATE TABLE "sand_system_role" (
  "id" int PRIMARY KEY,
  "name" varchar(64) NOT NULL DEFAULT ''
);
CREATE TABLE "sand_system_menu" (
  "id" serial PRIMARY KEY,
  "parent_id" int NULL,
  "name" varchar(64) NOT NULL DEFAULT '',
  "code" varchar(128) NOT NULL DEFAULT '',
  "slug" varchar(128) NOT NULL DEFAULT '',
  "type" int NULL,
  "path" varchar(255) NOT NULL DEFAULT '',
  "component" varchar(255) NOT NULL DEFAULT '',
  "method" int NULL,
  "icon" varchar(128) NOT NULL DEFAULT '',
  "sort" int NULL,
  "link_url" varchar(255) NOT NULL DEFAULT '',
  "is_iframe" int NULL,
  "is_keep_alive" int NULL,
  "is_hidden" int NULL,
  "is_fixed_tab" int NULL,
  "is_full_page" int NULL,
  "generate_id" int NULL,
  "generate_key" varchar(64) NOT NULL DEFAULT '',
  "status" int NULL,
  "remark" varchar(255) NOT NULL DEFAULT '',
  "created_by" int NULL,
  "updated_by" int NULL,
  "create_time" timestamp(0) NULL,
  "update_time" timestamp(0) NULL,
  "delete_time" timestamp(0) NULL
);
CREATE TABLE "sand_system_role_menu" (
  "role_id" int NOT NULL,
  "menu_id" int NOT NULL,
  PRIMARY KEY ("role_id", "menu_id")
);
INSERT INTO "sand_system_menu" ("id","parent_id","name","code","slug") VALUES
(10, 0, '流程定义', 'sandworkflow/manage/definition', ''),
(20, 10, '保存', '', 'sandworkflow:definition:save'),
(21, 10, '更新', '', 'sandworkflow:definition:update'),
(22, 10, '定义列表', '', 'sandworkflow:definition:index'),
(23, 10, '读取', '', 'sandworkflow:definition:read');
INSERT INTO "sand_system_role" ("id","name") VALUES
(1, '超管'), (2, '流程编辑'), (3, '只读查看'), (4, '无关角色');
INSERT INTO "sand_system_role_menu" ("role_id","menu_id") VALUES
(2, 20), (2, 21),
(3, 22), (3, 23);
SQL;
    }
}

<?php

declare(strict_types=1);

/**
 * 权限码迁移测试：验证 update.sql 末尾的 slug 迁移把旧域码
 * sandworkflow:* 原地改成 sand_sandworkflow:*，且不丢角色授权。
 *
 *   SAND_TEST_DB_URL=pgsql://user@127.0.0.1:5432/sandadmin_itest \
 *     php tests/permission-migration-test.php
 *
 * 不建库；在目标库内建隔离 schema wftest_perm_mig，结束 DROP CASCADE。
 * 迁移语句从 plugin/sandworkflow/update.sql 原文提取，不维护第二份映射。
 */

$assert = static function (bool $cond, string $message): void {
    if (!$cond) {
        fwrite(STDERR, "[FAIL] {$message}\n");
        exit(1);
    }
    echo "[PASS] {$message}\n";
};

$dsn = getenv('SAND_TEST_DB_URL');
if ($dsn === false || $dsn === '') {
    echo "[SKIP] 未设置 SAND_TEST_DB_URL，跳过数据库迁移测试\n";
    exit(0);
}

$root = dirname(__DIR__);
$updateSql = (string) file_get_contents($root . '/plugin/sandworkflow/update.sql');
$contract = (string) file_get_contents($root . '/plugin/sandworkflow/contract/openapi.yaml');

// 提取迁移语句本体（importSql 同样按分号切分，这里取单条语句）
if (preg_match('/UPDATE\s+"sand_system_menu"\s+AS\s+m\s+SET\s+"slug"[^;]*;/is', $updateSql, $hit) !== 1) {
    fwrite(STDERR, "[FAIL] update.sql 中找不到 slug 迁移语句\n");
    exit(1);
}
$migration = rtrim($hit[0], "; \t\n");

// 映射期望也从同一条语句的 VALUES 段提取，断言侧不复用第二份清单
if (preg_match_all("/\\('([^']+)',\\s*'([^']+)'\\)/", $migration, $pairs) === false || $pairs[1] === []) {
    fwrite(STDERR, "[FAIL] 迁移语句 VALUES 段解析失败\n");
    exit(1);
}
$slugMap = array_combine($pairs[1], $pairs[2]);
$assert(count($slugMap) === 34, '迁移语句覆盖 34 个旧权限码');

// 契约 x-permission 与迁移新码必须同集，防止 update.sql 与契约漂移
preg_match_all('/x-permission:\s*(\S+)/', $contract, $codes);
$contractCodes = array_values(array_unique($codes[1]));
sort($contractCodes);
$migratedCodes = array_values($slugMap);
sort($migratedCodes);
$assert($contractCodes === $migratedCodes, '迁移新码与契约 x-permission 码集一致');

$parts = parse_url($dsn);
$assert(is_array($parts) && ($parts['scheme'] ?? '') === 'pgsql', 'SAND_TEST_DB_URL 是 pgsql:// 形态');
$pdoDsn = sprintf(
    'pgsql:host=%s;port=%d;dbname=%s',
    $parts['host'] ?? '127.0.0.1',
    $parts['port'] ?? 5432,
    ltrim((string) ($parts['path'] ?? ''), '/'),
);
$pdo = new PDO($pdoDsn, $parts['user'] ?? null, isset($parts['pass']) ? (string) $parts['pass'] : null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$schema = 'wftest_perm_mig';
$grantsOf = static function (PDO $pdo): array {
    $rows = $pdo->query(
        'SELECT rm.role_id, m.slug FROM sand_system_role_menu rm'
        . ' JOIN sand_system_menu m ON m.id = rm.menu_id ORDER BY rm.role_id, m.slug',
    )->fetchAll(PDO::FETCH_NUM);
    $grants = [];
    foreach ($rows as [$roleId, $slug]) {
        $grants[(int) $roleId][] = $slug;
    }

    return $grants;
};

try {
    $pdo->exec("DROP SCHEMA IF EXISTS {$schema} CASCADE");
    $pdo->exec("CREATE SCHEMA {$schema}");
    $pdo->exec("SET search_path TO {$schema}");

    // 最小同名表：列取 install.sql 里两张表 INSERT 实际用到的列
    $pdo->exec(<<<'SQL'
        CREATE TABLE sand_system_menu (
          id int PRIMARY KEY,
          parent_id int,
          name varchar(255),
          code varchar(255),
          slug varchar(255),
          type smallint,
          path varchar(255),
          component varchar(255),
          method varchar(32),
          icon varchar(255),
          sort int,
          link_url varchar(255),
          is_iframe smallint,
          is_keep_alive smallint,
          is_hidden smallint,
          is_fixed_tab smallint,
          is_full_page smallint,
          generate_id int,
          generate_key varchar(255),
          status smallint,
          remark varchar(255),
          created_by int,
          updated_by int,
          create_time timestamp(0),
          update_time timestamp(0),
          delete_time timestamp(0)
        )
        SQL);
    $pdo->exec('CREATE TABLE sand_system_role_menu (role_id int NOT NULL, menu_id int NOT NULL)');

    // 夹具：34 个旧 slug 的按钮行 + 两条非权限行 + 一条无关权限码
    $insert = $pdo->prepare('INSERT INTO sand_system_menu (id, slug, type) VALUES (?, ?, ?)');
    $menuId = 100;
    foreach (array_keys($slugMap) as $oldSlug) {
        $insert->execute([$menuId++, $oldSlug, 3]);
    }
    $insert->execute([$menuId++, '', 2]);
    $insert->execute([$menuId++, 'system:user:index', 3]);

    // 授权夹具：角色 2 全量、角色 3 部分、角色 4 只有无关码，角色 5 无授权
    $grant = $pdo->prepare('INSERT INTO sand_system_role_menu (role_id, menu_id) VALUES (?, ?)');
    $allIds = range(100, 100 + count($slugMap) - 1);
    foreach ($allIds as $id) {
        $grant->execute([2, $id]);
    }
    foreach (array_slice($allIds, 0, 5) as $id) {
        $grant->execute([3, $id]);
    }
    $grant->execute([4, $menuId - 1]);

    $before = $grantsOf($pdo);

    $pdo->exec($migration);

    $after = $grantsOf($pdo);
    $oldLeft = (int) $pdo->query("SELECT count(*) FROM sand_system_menu WHERE slug LIKE 'sandworkflow:%'")->fetchColumn();
    $assert($oldLeft === 0, '迁移后不存在 sandworkflow: 旧域 slug');
    $migratedCount = (int) $pdo->query("SELECT count(*) FROM sand_system_menu WHERE slug LIKE 'sand_sandworkflow:%'")->fetchColumn();
    $assert($migratedCount === 34, '迁移后 34 个 slug 全部是新域码');

    // 授权随 menu_id 关联保住：迁移前每角色 slug 集映射后 == 迁移后集合
    foreach ($before as $roleId => $slugs) {
        $expected = array_map(
            static fn(string $slug): string => $slugMap[$slug] ?? $slug,
            $slugs,
        );
        $actual = $after[$roleId] ?? [];
        sort($expected);
        sort($actual);
        $assert($expected === $actual, "角色 {$roleId} 迁移后仍持有原权限点（按新码）");
    }

    // 幂等：再跑一遍行数与内容不变
    $menuRows = (int) $pdo->query('SELECT count(*) FROM sand_system_menu')->fetchColumn();
    $grantRows = (int) $pdo->query('SELECT count(*) FROM sand_system_role_menu')->fetchColumn();
    $pdo->exec($migration);
    $assert(
        (int) $pdo->query('SELECT count(*) FROM sand_system_menu')->fetchColumn() === $menuRows
        && (int) $pdo->query('SELECT count(*) FROM sand_system_role_menu')->fetchColumn() === $grantRows,
        '迁移重复执行无副作用',
    );
    $assert($grantsOf($pdo) === $after, '重复执行后授权集不变');

    echo "PASS 权限码迁移测试通过\n";
} finally {
    $pdo->exec("DROP SCHEMA IF EXISTS {$schema} CASCADE");
}

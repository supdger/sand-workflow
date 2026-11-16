<?php

namespace plugin\sandworkflow\api;

use support\Db;
use plugin\sandworkflow\app\support\RuntimeSchemaGuard;
use plugin\sandworkflow\app\support\LegacyRuntimeIdMigrator;

class Install
{
    protected static string $connection = 'pgsql';

    public static function install($version): void
    {
        static::importSql(static::sqlFile('install.sql', 'install-mysql.sql'));
    }

    public static function uninstall($version): void
    {
        static::importSql(static::sqlFile('uninstall.sql', 'uninstall-mysql.sql'));
    }

    public static function update($fromVersion, $toVersion, $context = null): void
    {
        static::importSql(static::sqlFile('update.sql', 'update-mysql.sql'));
        if (static::isMysql()) {
            return;
        }
        RuntimeSchemaGuard::ensureFormChangeAuditColumn(static::$connection);
        LegacyRuntimeIdMigrator::migrate(static::$connection, date('YmdHis'));
        RuntimeSchemaGuard::assertNanoIdSchema(static::$connection);
    }

    public static function importSql(string $sqlFile): void
    {
        if (!is_file($sqlFile)) {
            throw new \RuntimeException("Schema file does not exist: {$sqlFile}");
        }
        foreach (explode(';', (string) file_get_contents($sqlFile)) as $sql) {
            $sql = trim($sql);
            if ($sql === '') {
                continue;
            }
            Db::connection(static::connectionName())->statement($sql);
        }
    }

    private static function connectionName(): string
    {
        $default = function_exists('config') ? config('database.default') : null;
        return is_string($default) && $default !== '' ? $default : static::$connection;
    }

    private static function isMysql(): bool
    {
        $driver = function_exists('config')
            ? config('database.connections.' . static::connectionName() . '.driver')
            : null;
        return in_array(strtolower((string) $driver), ['mysql', 'mariadb'], true);
    }

    private static function sqlFile(string $pgsqlFile, string $mysqlFile): string
    {
        return __DIR__ . '/../' . (static::isMysql() ? $mysqlFile : $pgsqlFile);
    }
}

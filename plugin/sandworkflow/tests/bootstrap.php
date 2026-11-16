<?php
declare(strict_types=1);

// 纯 PHP 测试引导：只自动加载本插件的 plugin\sandworkflow\ 命名空间，
// 不启动 webman / ThinkORM，宿主模型在测试中不出现。
spl_autoload_register(static function (string $class): void {
    $prefix = 'plugin\\sandworkflow\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $path = __DIR__ . '/../' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
    if (is_file($path)) {
        require $path;
    }
});

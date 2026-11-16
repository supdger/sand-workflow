<?php
declare(strict_types=1);

// 无依赖测试入口：php plugin/sandworkflow/tests/run.php
require __DIR__ . '/bootstrap.php';

final class TestContext
{
    public int $passed = 0;
    /** @var list<string> */
    public array $failures = [];

    public function check(bool $condition, string $label): void
    {
        if ($condition) {
            $this->passed++;
            return;
        }
        $this->failures[] = $label;
    }
}

$files = glob(__DIR__ . '/*Test.php');
if ($files === false || $files === []) {
    fwrite(STDERR, "no test files found\n");
    exit(1);
}

$context = new TestContext();
$methods = 0;
foreach ($files as $file) {
    require_once $file;
    $class = basename($file, '.php');
    if (!class_exists($class)) {
        $context->failures[] = "{$file}: class {$class} not found";
        continue;
    }
    foreach (get_class_methods($class) ?: [] as $method) {
        if (!str_starts_with($method, 'test')) {
            continue;
        }
        $methods++;
        $before = count($context->failures);
        (new $class())->{$method}($context);
        $mark = count($context->failures) === $before ? 'PASS' : 'FAIL';
        echo str_pad($mark, 5) . " {$class}::{$method}\n";
    }
}

foreach ($context->failures as $failure) {
    echo "  ✗ {$failure}\n";
}
echo "----------------------------------------\n";
echo "methods: {$methods}, assertions passed: {$context->passed}, failures: " . count($context->failures) . "\n";
exit($context->failures === [] && $methods > 0 ? 0 : 1);

<?php

// 复用 sandadmin 的异常渲染：中间件抛出的 SystemException（如权限不足 403）
// 按声明的 httpStatus 回 JSON；不配本文件时回落到宿主默认 500 纯文本。
return [
    '' => \plugin\sandadmin\app\exception\Handler::class,
];

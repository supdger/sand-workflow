<?php

declare(strict_types=1);

// <contract-generated> 本文件由 tools/contract-build 生成，请勿手改；
// 改了会在契约一致性门禁（tools/contract-build --check）被打回。
// 源: contract/openapi.yaml
// 源: server/plugin/sandworkflow/contract/openapi.yaml
// 源哈希: sha256:2474cb7c22af33ac23fdece56097401f24b3de6245502d9ba295eda4daf6560d
// 生成器: contract-build v1

use plugin\sandworkflow\app\controller\DefinitionController;
use plugin\sandworkflow\app\controller\GroupController;
use plugin\sandworkflow\app\controller\IndexController;
use plugin\sandworkflow\app\controller\InstanceController;
use plugin\sandworkflow\app\controller\TaskController;
use Webman\Route;

// Config::loadFromDir 会按 *.php 误包本表（只排除基名 route.php）：
// 那时无 FastRoute collector，直接注册会致命。装载标记只由
// config/route.php 在 Route::load 回调内定义，缺席即返回空数组、
// 无害并入配置树。
if (!defined('SAND_CONTRACT_ROUTE_LOAD')) {
    return [];
}

Route::get('/api/admin/v1/plugin/sandworkflow/index/list-users', [IndexController::class, 'listUsers']);
Route::get('/api/admin/v1/plugin/sandworkflow/index/list-roles', [IndexController::class, 'listRoles']);
Route::get('/api/admin/v1/plugin/sandworkflow/index/list-depts', [IndexController::class, 'listDepts']);
Route::get('/api/admin/v1/plugin/sandworkflow/group/index', [GroupController::class, 'index']);
Route::get('/api/admin/v1/plugin/sandworkflow/group/all', [GroupController::class, 'all']);
Route::get('/api/admin/v1/plugin/sandworkflow/group/read', [GroupController::class, 'read']);
Route::post('/api/admin/v1/plugin/sandworkflow/group/save', [GroupController::class, 'save']);
Route::put('/api/admin/v1/plugin/sandworkflow/group/update', [GroupController::class, 'update']);
Route::delete('/api/admin/v1/plugin/sandworkflow/group/destroy', [GroupController::class, 'destroy']);
Route::get('/api/admin/v1/plugin/sandworkflow/definition/index', [DefinitionController::class, 'index']);
Route::get('/api/admin/v1/plugin/sandworkflow/definition/available', [DefinitionController::class, 'available']);
Route::get('/api/admin/v1/plugin/sandworkflow/definition/versions', [DefinitionController::class, 'versions']);
Route::get('/api/admin/v1/plugin/sandworkflow/definition/read', [DefinitionController::class, 'read']);
Route::post('/api/admin/v1/plugin/sandworkflow/definition/save', [DefinitionController::class, 'save']);
Route::put('/api/admin/v1/plugin/sandworkflow/definition/update', [DefinitionController::class, 'update']);
Route::post('/api/admin/v1/plugin/sandworkflow/definition/publish', [DefinitionController::class, 'publish']);
Route::delete('/api/admin/v1/plugin/sandworkflow/definition/destroy', [DefinitionController::class, 'destroy']);
Route::get('/api/admin/v1/plugin/sandworkflow/instance/index', [InstanceController::class, 'index']);
Route::get('/api/admin/v1/plugin/sandworkflow/instance/pending-list', [InstanceController::class, 'pendingList']);
Route::get('/api/admin/v1/plugin/sandworkflow/instance/my-list', [InstanceController::class, 'myList']);
Route::get('/api/admin/v1/plugin/sandworkflow/instance/processed-list', [InstanceController::class, 'processedList']);
Route::get('/api/admin/v1/plugin/sandworkflow/instance/copy-list', [InstanceController::class, 'copyList']);
Route::get('/api/admin/v1/plugin/sandworkflow/instance/get-detail', [InstanceController::class, 'getDetail']);
Route::post('/api/admin/v1/plugin/sandworkflow/instance/start', [InstanceController::class, 'start']);
Route::post('/api/admin/v1/plugin/sandworkflow/instance/approve', [InstanceController::class, 'approve']);
Route::post('/api/admin/v1/plugin/sandworkflow/instance/reject', [InstanceController::class, 'reject']);
Route::post('/api/admin/v1/plugin/sandworkflow/instance/cancel', [InstanceController::class, 'cancel']);
Route::post('/api/admin/v1/plugin/sandworkflow/instance/comment', [InstanceController::class, 'comment']);
Route::post('/api/admin/v1/plugin/sandworkflow/instance/transfer', [InstanceController::class, 'transfer']);
Route::post('/api/admin/v1/plugin/sandworkflow/instance/add-sign', [InstanceController::class, 'addSign']);
Route::post('/api/admin/v1/plugin/sandworkflow/instance/del-sign', [InstanceController::class, 'delSign']);
Route::post('/api/admin/v1/plugin/sandworkflow/instance/back-node-list', [InstanceController::class, 'backNodeList']);
Route::post('/api/admin/v1/plugin/sandworkflow/instance/back', [InstanceController::class, 'back']);
Route::get('/api/admin/v1/plugin/sandworkflow/task/pending-list', [TaskController::class, 'pendingList']);

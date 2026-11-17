#!/usr/bin/env bash
# SandWorkflow 契约片段检查：拉取锁定版本的 SandAdmin 宿主，跑 kernel_api 校验。
# 用法：
#   tools/contract-check.sh [报告输出路径]
# 环境变量：
#   SAND_HOST_REF  宿主 git ref（默认下方钉住的合并点；宿主契约设施升级后
#                  把它改成新的 main 提交哈希即可升档）
#   SAND_HOST_URL  宿主仓地址（私有仓在 CI 里用带 token 的地址覆盖）
set -euo pipefail

SAND_HOST_REF="${SAND_HOST_REF:-2e284a820709fc0004eefffa2fb6ffd1e3e94954}"
SAND_HOST_URL="${SAND_HOST_URL:-https://github.com/supdger/sandadmin.git}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPORT_PATH="${1:-$REPO_ROOT/var/contract-check-report.json}"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

HOST_DIR="$WORK_DIR/sandadmin"
echo "== 拉取宿主 $SAND_HOST_URL @ $SAND_HOST_REF"
git clone --quiet --filter=blob:none "$SAND_HOST_URL" "$HOST_DIR"
git -C "$HOST_DIR" checkout --quiet "$SAND_HOST_REF"

echo "== 安装宿主 server 依赖"
# kernel_api 只需要 autoload（symfony/yaml + Sandadmin\Contract），
# --no-scripts 跳过宿主 post-install 发布钩子，避免裸克隆里的噪音报错
composer --working-dir="$HOST_DIR/server" install --quiet --no-interaction --prefer-dist --no-scripts

mkdir -p "$(dirname "$REPORT_PATH")"
echo "== kernel_api 契约检查（报告：${REPORT_PATH}）"
php "$HOST_DIR/tools/contract-build" --kernel-api "$REPO_ROOT" --report "$REPORT_PATH"

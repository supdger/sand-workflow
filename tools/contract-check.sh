#!/usr/bin/env bash
# SandWorkflow 契约片段检查：拉取锁定版本的 SandAdmin 宿主，跑 kernel_api 校验，
# 再逐字节比对本仓提交的路由产物与宿主生成器现场产出。
# 用法：
#   tools/contract-check.sh [报告输出路径]
# 环境变量：
#   SAND_HOST_REF  宿主 git ref（默认是 PR feat/kernel-api-runtime-align 的 head
#                  8c528be；该 PR 合并后应换成 main 上的合并提交哈希）
#   SAND_HOST_URL  宿主仓地址（私有仓在 CI 里用带 token 的地址覆盖，
#                  本地可指宿主工作区路径）
set -euo pipefail

SAND_HOST_REF="${SAND_HOST_REF:-8c528be7a37e8697f64d8bb9a5fb5e531880824f}"
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

echo "== 路由产物字节漂移检查"
# 把本仓插件复制进宿主克隆的插件目录，让宿主生成器现场产出
# route.php 与 route.generated.php，再与本仓提交版本逐字节比对。
# 产物只落在临时克隆里，不回写本仓。
PLUGIN_DIR="$HOST_DIR/server/plugin/sandworkflow"
mkdir -p "$PLUGIN_DIR"
cp -R "$REPO_ROOT/plugin/sandworkflow/." "$PLUGIN_DIR/"
php "$HOST_DIR/tools/contract-build" >/dev/null

drift=0
for name in route.php route.generated.php; do
    committed="$REPO_ROOT/plugin/sandworkflow/config/$name"
    generated="$PLUGIN_DIR/config/$name"
    if [ ! -f "$generated" ]; then
        echo "FAIL 宿主生成器未产出 $name" >&2
        drift=1
        continue
    fi
    if ! cmp -s "$committed" "$generated"; then
        echo "FAIL $name 与宿主生成器产出不一致，请用锁定 ref 重新生成后提交" >&2
        drift=1
    fi
done
if [ "$drift" -ne 0 ]; then
    exit 1
fi
echo "PASS 路由产物与宿主生成器逐字节一致"

// 本文件派生自 zhangjinlibra/workflow-web，按 AGPL-3.0 许可，见 licenses/AGPL-3.0.txt
export function isNumber(value) {
  return Object.prototype.toString.call(value) === '[object Number]' && !Number.isNaN(value)
}

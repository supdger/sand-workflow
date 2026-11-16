import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * 插件前端测试配置。插件源码里 `@/…` 引的是宿主前端组件，
 * 默认解析到本机集成目录 `../host/web/src`，可用 SANDADMIN_WEB_SRC
 * 指到别的宿主副本。测试直接复用宿主的 jsdom 环境补丁与 msw server。
 */
const hostSrc =
  process.env.SANDADMIN_WEB_SRC ?? fileURLToPath(new URL('../../host/web/src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': hostSrc,
    },
  },
  test: {
    environment: 'jsdom',
    include: ['plugin-web/sandworkflow/**/*.test.{ts,tsx}'],
    setupFiles: [`${hostSrc}/test/setup.ts`],
    css: false,
  },
});

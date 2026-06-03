# Vitest 测试配置模板

> 路径：`vitest.config.ts`（项目根目录）

```typescript
import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) }
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react"
  },
  test: {
    globals: true,              // 无需 import { describe, it } 即可使用
    environment: "jsdom",       // 模拟浏览器环境
    setupFiles: ["./src/tests/setup.ts"],
    css: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/mock/**", "src/tests/**", "src/**/*.d.ts", "src/typings/**"]
    }
  }
});
```

> 路径：`src/tests/setup.ts`

```typescript
import "@testing-library/jest-dom";
```

## 测试目录结构

```
src/tests/
├── setup.ts                          # 全局测试初始化
└── examples/                         # 按层分类的测试示例
    ├── utils/
    │   └── await-to-js.test.ts       # 工具函数测试
    ├── hooks/
    │   └── useTableSelection.test.ts # 自定义 Hook 测试
    ├── stores/
    │   └── globalStore.test.ts       # Zustand Store 测试
    └── api/
        └── brandBoss.test.ts         # API 模块测试
```

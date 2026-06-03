# ESLint 配置模板

> 路径：`eslint.config.js`（项目根目录，支持 ESM 和 Flat Config）

## ESLint Flat Config（推荐，ESM）

```javascript
// eslint.config.js
import { FlatCompat } from "@eslint/eslint-plugin-prettier";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";

export default [
  {
    ignores: [
      "dist",
      "build",
      "*.config.js",
      ".eslintrc.cjs",
      "node_modules/",
      "src/mock/",
      "src/tests/"
    ]
  },
  {
    ...react.configs.flat.recommended,
  },
  {
    ...tseslint.configs.recommended,
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.eslint.recommended
      }
    }
  },
  {
    rules: {
      // React 规则
      "react/prop-types": "off",              // 使用 TypeScript，不需要 prop-types
      "react/react-in-jsx-scope": "off",     // Vite 自动处理
      "react/jsx-uses-react": "error",      // React 17+ 不需要显式 import React
      "react/self-closing-comp": "warn",

      // TypeScript 规则
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",           // 允许 _ 开头的未使用变量
      }],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-empty-function": ["warn", { "allow": ["arrowFunctions"] }],

      // 通用规则
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "error",
      "no-var": "error",
      "prefer-const": "warn",
      "no-constant-condition": "warn"
    }
  },
  {
    files: ["**/*.tsx", "**/*.ts"],
    languageOptions: {
      parserOptions: {
        parser: "@typescript-eslint/parser",
        ecmaVersion: "latest",
        sourceType: "module"
      }
    }
  },
  new FlatCompat()
];
```

## .eslintrc.cjs（Legacy CommonJS 格式，备选）

```javascript
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ["react", "react-hooks", "@typescript-eslint"],
  rules: {
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-non-null-assertion": "error",
    "react/jsx-uses-react": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-debugger": "error"
  },
  settings: {
    react: {
      version: "detect"
    }
  }
};
```

## .eslintignore（项目根目录）

```
dist
build
*.config.js
node_modules
public
.vite
coverage
*.min.js
*.min.css
```

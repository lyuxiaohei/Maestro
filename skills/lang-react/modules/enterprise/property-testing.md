# Property Testing —— fast-check 约定（React/TypeScript）

> 属性测试用约束生成成百上千组输入，逼出 example-based 测试漏掉的 corner case。**新增纯函数 / reducer / URL parser / 数据结构操作时建议加 fast-check property**，比手写 5-10 个 example 覆盖度高一个数量级。

## 技术栈

| 组件 | 版本 | 用途 |
|---|---|---|
| fast-check | 3.x（>=3.18） | TypeScript 优先的 property testing 库 |
| Vitest | 1.x / 2.x | test runner，与 fast-check 直接集成（`expect(...).toBe(...)` 风格） |
| TypeScript | 5.x | fast-check 类型推断需要 5.x +（4.x 类型推断不全） |
| Node | 18.20.4+ | fast-check 3.x 要求 Node 16+；项目 lang-react 基线 18 OK |

## pnpm 安装

```bash
pnpm add -D fast-check@^3.18
```

> **不要**装 fast-check@2.x（旧版本 API 与 Vitest 集成方式不同；3.x 起 `fc.assert` + `fc.property` 是稳定 API）。

`package.json`:

```json
{
  "devDependencies": {
    "fast-check": "^3.18.0",
    "vitest": "^1.0.0"
  }
}
```

## 5 个示例（覆盖纯函数 / reducer / URL parser）

### 示例 1：纯函数 —— slugify 幂等

```ts
// src/utils/slugify.ts
export const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// tests/property/slugify.property.test.ts
import { describe, it } from 'vitest';
import fc from 'fast-check';
import { slugify } from '@/utils/slugify';

describe('slugify property', () => {
  it('idempotent: slugify(slugify(s)) === slugify(s)', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        return slugify(slugify(s)) === slugify(s);
      }),
    );
  });

  it('output only contains [a-z0-9-]', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        return /^[a-z0-9-]*$/.test(slugify(s));
      }),
    );
  });
});
```

### 示例 2：纯函数 —— 金额 cents → yuan 格式化不抛 + 单调

```ts
// src/utils/money.ts
export const formatYuan = (cents: number): string => {
  const yuan = cents / 100;
  return yuan.toFixed(2);
};

// tests/property/money.property.test.ts
import { describe, it } from 'vitest';
import fc from 'fast-check';
import { formatYuan } from '@/utils/money';

describe('formatYuan property', () => {
  it('no throw for any non-negative integer cents up to 1e8', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100_000_000 }), (cents) => {
        formatYuan(cents);
        return true;
      }),
    );
  });

  it('monotonic: a+delta produces >= a', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99_999 }),
        fc.integer({ min: 1, max: 100 }),
        (a, delta) => Number(formatYuan(a + delta)) >= Number(formatYuan(a)),
      ),
    );
  });
});
```

### 示例 3：容器 —— Array.sort 单调

```ts
// tests/property/sort.property.test.ts
import { describe, it } from 'vitest';
import fc from 'fast-check';

describe('sort property', () => {
  it('first <= last after sort', () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 1, maxLength: 100 }), (xs) => {
        const sorted = [...xs].sort((a, b) => a - b);
        return sorted[0] <= sorted[sorted.length - 1];
      }),
    );
  });

  it('sort preserves length', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (xs) => {
        return [...xs].sort((a, b) => a - b).length === xs.length;
      }),
    );
  });
});
```

### 示例 4：reducer —— counter 不变量

```ts
// src/store/counter.ts
type Action = { type: 'inc' } | { type: 'dec' } | { type: 'set'; value: number };
export const counterReducer = (state: number, action: Action): number => {
  switch (action.type) {
    case 'inc': return state + 1;
    case 'dec': return state - 1;
    case 'set': return action.value;
  }
};

// tests/property/counter.property.test.ts
import { describe, it } from 'vitest';
import fc from 'fast-check';
import { counterReducer } from '@/store/counter';

const actionArb: fc.Arbitrary<{ type: 'inc' } | { type: 'dec' } | { type: 'set'; value: number }> = fc.oneof(
  fc.constant({ type: 'inc' as const }),
  fc.constant({ type: 'dec' as const }),
  fc.record({ type: fc.constant('set' as const), value: fc.integer({ min: -1000, max: 1000 }) }),
);

describe('counterReducer property', () => {
  it('inc then dec returns to original', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000 }), (initial) => {
        return counterReducer(counterReducer(initial, { type: 'inc' }), { type: 'dec' }) === initial;
      }),
    );
  });

  it('set always wins regardless of history', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.array(actionArb, { maxLength: 50 }),
        fc.integer({ min: -1000, max: 1000 }),
        (initial, history, finalValue) => {
          const afterHistory = history.reduce(counterReducer, initial);
          return counterReducer(afterHistory, { type: 'set', value: finalValue }) === finalValue;
        },
      ),
    );
  });
});
```

### 示例 5：URL parser —— parseQueryString / serializeQueryString roundtrip

```ts
// src/utils/url.ts
export const serializeQuery = (params: Record<string, string>): string =>
  Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

export const parseQuery = (qs: string): Record<string, string> => {
  if (!qs) return {};
  return Object.fromEntries(
    qs.split('&').map((pair) => {
      const [k, v = ''] = pair.split('=');
      return [decodeURIComponent(k), decodeURIComponent(v)];
    }),
  );
};

// tests/property/url.property.test.ts
import { describe, it } from 'vitest';
import fc from 'fast-check';
import { serializeQuery, parseQuery } from '@/utils/url';

describe('URL query roundtrip property', () => {
  it('parse(serialize(x)) === x for any string→string record', () => {
    const recordArb = fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }).filter((k) => !!k.trim()),
      fc.string({ maxLength: 50 }),
      { minKeys: 0, maxKeys: 10 },
    );
    fc.assert(
      fc.property(recordArb, (params) => {
        const round = parseQuery(serializeQuery(params));
        return JSON.stringify(round) === JSON.stringify(params);
      }),
    );
  });
});
```

## 与 Vitest 集成

属性测试是普通 vitest 测试文件（约定 `tests/property/*.property.test.ts` 或者 `*.spec.ts` 内 describe 块）。`fc.assert` 内部触发 vitest 断言上下文：

```bash
# 跑全部测试（含 property + example-based）
pnpm exec vitest run

# 单独跑 property 测试
pnpm exec vitest run tests/property

# watch 模式（开发时）
pnpm exec vitest tests/property
```

### vitest config

无需额外配置。`vitest.config.ts` 保持现有即可。

## 典型陷阱

1. **`fc.string()` 默认包含 unicode 控制字符 / surrogate / emoji** → JSON.stringify 容易炸 → 用 `fc.string({ minLength, maxLength })` + filter 收窄
2. **`fc.dictionary` 默认 key 可空字符串** → `serializeQuery({'': 'v'})` 解析回来 key=undefined → 必须 `.filter((k) => !!k.trim())`
3. **shrink 慢**：失败时 fast-check 自动 shrink，复杂 record / array 可能 30s+ → 用 `{ numRuns: 50 }` 收紧 try 次数或 `{ endOnFailure: true }`
4. **不要在 property 里调真实 fetch / 网络**：1000 次 try 会打爆服务 → mock 掉或者只跑纯函数层
5. **`fc.assert` 默认 100 runs**：CI 时长 > 5s 时改 `{ numRuns: 50 }`；nightly 可以 `{ numRuns: 1000 }` 跑
6. **不要混用 fast-check + msw**：msw mock 状态有副作用，property 反复 try 同一 state 不稳；改 example-based `it()`

## CI 集成

属性测试随 `unit-tests-frontend` stage 一起跑（fast-check 在 vitest 内）。不需新增 stage。

```yaml
# templates/.gitlab-ci.yml （现有）
unit-tests-frontend:
  stage: test
  image: node:20-alpine
  script:
    - npm ci
    - npx vitest run --reporter=verbose  # 含 property 测试
  rules:
    - exists:
        - package.json
```

## 与 RED → GREEN → REFACTOR 循环

- **RED**：写 `fc.property` 表达不变量 → 没实现 → 失败
- **GREEN**：实现 utility/reducer → 100 runs 全过 → PASS
- **REFACTOR**：property 是回归网 —— 改实现后 100 runs 仍 PASS = 语义不变
- 详见 `skills/build/SKILL.md` TDD 段（属性测试占位说明）

## 复用红线

- ✅ utils/ 下纯函数（slugify, formatYuan, parseQuery, etc.）→ 优先 fast-check
- ✅ store/ reducer 不变量（counter, list reducer）→ 优先 fast-check
- ✅ URL parser / serializer roundtrip → 经典 property 场景
- ⚠️ React component 渲染 → testing-library `render` + example-based，不用 fast-check（DOM 状态 1000 次随机不稳）
- ⚠️ hooks 涉及 axios → mock + example-based
- ❌ 不要为了用 fast-check 把业务硬塞进纯函数

## 相关资源

- 官网：https://fast-check.dev/
- 与 vitest 配合：https://fast-check.dev/docs/ecosystem/#vitest
- Arbitrary 全表：https://fast-check.dev/docs/core-blocks/arbitraries/
- 与 `modules/eslint.md`（property 测试目录 lint 规则）配套

# CI/CD 模板

---
name: ci-template
description: "CI/CD 模板生成：自动检测技术栈和 CI 平台，输出配置文件"
---

为项目生成 CI/CD 配置文件，支持 GitLab CI 和 GitHub Actions。

## 触发场景

- 项目需要 CI/CD 配置
- 新项目初始化
- 现有 CI 配置需要标准化

## 前置条件

- 项目根目录存在
- 已知技术栈（Java/React/Python）

## 流程

### Step 1: 检测 CI 平台

- 存在 `.gitlab-ci.yml` → GitLab CI
- 存在 `.github/` → GitHub Actions
- 两者都不存在 → 询问用户选择

### Step 2: 检测技术栈

- `pom.xml` → Java（Maven）
- `package.json` → React/TypeScript（npm/pnpm）
- `pyproject.toml` / `requirements.txt` → Python
- 多栈共存 → 生成多栈配置

### Step 3: 选择模板

| 平台 | 模板 | 说明 |
|------|------|------|
| GitLab CI | `templates/gitlab-ci.yml` | 5 阶段：lint → test → build → deploy-staging → deploy-prod |
| GitHub Actions (CI) | `templates/github-actions/ci.yml` | lint + test + build |
| GitHub Actions (Deploy) | `templates/github-actions/deploy.yml` | staging + prod 部署 |

### Step 4: 填充变量

替换模板中的占位变量：
- `{{SERVICE_NAME}}` — 服务名称
- `{{DEPLOY_PATH}}` — 部署路径
- `{{REGISTRY}}` — 镜像仓库地址
- `{{JAVA_VERSION}}` / `{{NODE_VERSION}}` — 运行时版本

### Step 5: 输出

将配置文件输出到项目根目录，附使用说明。

## CI 阶段说明

| 阶段 | 说明 | 必选 |
|------|------|------|
| lint | 代码检查（ESLint/Checkstyle/Ruff） | 是 |
| test | 单元测试 + 覆盖率 | 是 |
| build | 构建（jar/Docker image/静态资源） | 是 |
| deploy-staging | 预发环境部署 | 是 |
| deploy-prod | 生产环境部署（需手动触发） | 是 |
| e2e-test | 端到端测试 | 可选 |

## 参考文件

- [templates/gitlab-ci.yml](templates/gitlab-ci.yml) — GitLab CI 模板
- [templates/github-actions/ci.yml](templates/github-actions/ci.yml) — GitHub Actions CI 工作流
- [templates/github-actions/deploy.yml](templates/github-actions/deploy.yml) — GitHub Actions 部署工作流

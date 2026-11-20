# 环境与命令记录

## 已有环境与已发生的变更

- 检查到本机原有 Node.js `v26.10.0`、npm `11.19.1`，未重新安装它们。
- 在用户要求改为自行执行环境命令前，已经运行：

```bash
npm install --cache /private/tmp/borrowed-fire-npm --no-audit --no-fund
```

- 新增项目内的 `node_modules/` 和 `package-lock.json`。
- 下载缓存位于 `/private/tmp/borrowed-fire-npm`。
- 没有使用 `npm install -g`，没有安装 CUDA、Python 或修改系统设置。
- npm 提示 esbuild 的安装脚本尚未批准；实际生产构建已可执行，没有额外运行脚本批准命令。
- 用户随后要求只写代码并提供命令，此后没有追加依赖安装、测试浏览器下载、Git 初始化或远程操作。
- 代码验证只使用已有依赖运行 `npm test`、`npm run build` 与测试发现检查 `npm run test:e2e -- --list`。
- 本轮 UI、外观、文件存档、环境照明、景深与音乐没有增加依赖；`BokehPass`、`RoomEnvironment` 和 PMREM 均来自已有 Three.js。

## 你需要执行的命令

当前机器已有依赖，直接执行开发命令即可。首次克隆或需要重建依赖时才运行：

```bash
npm ci
```

开发：

```bash
npm run dev
```

打开终端显示的地址，默认 `http://127.0.0.1:5173`。停止服务器按 Ctrl+C。

逻辑测试和生产构建：

```bash
npm test
npm run build
npm run preview
```

可选浏览器测试环境：

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright 会额外下载测试用浏览器，通常缓存于 macOS 的 `~/Library/Caches/ms-playwright`。不执行这一步也可以正常开发和游玩。

CI 配置会在 GitHub 临时 Linux 机器执行 `npm ci` 和 `npx playwright install --with-deps chromium`，不会在本机执行。目前尚无远程仓库或 CI 执行记录。

## 新增依赖的用途

| 依赖 | 用途 | 安装范围 |
|---|---|---|
| three | 三维图形与后期处理 | 项目内 |
| typescript、@types/three | 类型检查 | 项目内，开发依赖 |
| vite | 本地服务器与生产打包 | 项目内，开发依赖 |
| tsx | 执行 TypeScript 逻辑测试 | 项目内，开发依赖 |
| @playwright/test | 可选浏览器测试 | 项目内，开发依赖 |

没有额外服务器数据库，也不需要 NVIDIA GPU。开发和游玩可以直接在 MacBook 上完成。

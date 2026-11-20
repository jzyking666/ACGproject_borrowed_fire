# 借火 · BORROWED FIRE

Three.js 原创单人三维动作解谜游戏 · 高等计算机图形学课程项目

原创单人三维动作解谜游戏。你是失控设施的末班维修员：搬动反射器，把安保装置射出的危险脉冲引向设备，建立持续供电的回路，然后安全离开。在后续机房，需要关闭发射器，让同一颗脉冲维持整个系统。

包含七个递进机房、完整存档、角色外观、维修工单、键鼠与手柄操作、拍照模式。游戏的原创性主张是“危险弹道同时构成可重布置的供电基础设施；玩家要启动、维持并穿越这个运行系统”。不主张反射或循环解谜这一类机制从未出现过。

本轮更新重做了菜单、HUD、字体层级和对话框，统一首页与内部页面的中文字体，采用深色工业界面和维修工单结构。设计参考和具体改动见 [界面设计说明](docs/UI_DESIGN.md)。

## 运行

需要 Node.js 22.12+ 或支持当前 Vite 的较新 LTS 版本，及支持 WebGL 2 的桌面浏览器。不需要 Python、CUDA、NVIDIA 驱动或全局安装 Three.js。

当前机器已有项目依赖，直接执行 `npm run dev` 即可。换到新机器或首次克隆时，在项目目录执行：

```bash
npm ci
npm run dev
```

打开终端显示的地址，通常为 **http://127.0.0.1:5173**。不要直接双击 `index.html`。

`npm ci` 按锁文件安装到当前目录的 `node_modules/`，不会全局安装软件。使用默认 npm 缓存；如希望将下载缓存放在临时目录，可改为：

```bash
npm ci --cache /private/tmp/borrowed-fire-npm
```

本次开发早期已执行过 `npm install --cache /private/tmp/borrowed-fire-npm --no-audit --no-fund`，生成了 `node_modules/` 与 `package-lock.json`。此后按要求没有继续下载或配置环境。全部本地命令见 [环境与命令说明](docs/ENVIRONMENT.md)。

## 操作

| 操作 | 键鼠 | 标准映射实体手柄 |
|---|---|---|
| 移动 | WASD / 方向键 | 左摇杆 / 方向键 |
| 拿起、放下、切换附近发射器 | E | A / 下方键 |
| 旋转反射器 | Q | B / 右方键 |
| 观察模式：暂停并预览弹道 | Space | X / 左方键 |
| 分步提示 | H | Y / 上方键 |
| 暂停、继续 | Esc | Start / Menu |
| 精细移动 | Shift + 移动 | 轻推左摇杆 |
| 调整视角 | 右键拖动、滚轮 | 右摇杆 |
| 相机复位 | C | — |
| 重试本关 | R / 界面按钮 | 暂停界面按钮 |
| 维修工单、记录 | I / 界面按钮 | 暂停界面按钮 |
| 存档管理 | J / 界面按钮 | 暂停界面按钮 |
| 拍照模式 | F2 / 界面按钮 | 界面按钮 |

手柄首次连接后按键激活；非标准映射设备可能需要另外适配。菜单使用方向键／左摇杆选择，A 确认，B 返回。也支持键盘 Tab / Enter 或鼠标。

**目标与规则：**

- 接收环收到脉冲会暂时供电。脉冲继续运动，不被接收环消耗。
- 从第三关起，需要同一颗脉冲重复经过接收环，完成闭环验证。
- 供电过期会清除验证；不同脉冲的命中不能累计成闭环。
- 金色缓冲器会延迟脉冲 1.2 秒，再沿原方向释放。
- 每次最多有一颗在场脉冲。它消失后，在线发射器才重新发射。
- 关闭发射器不会清除已有脉冲。离网机房要求发射器关闭。
- 所有条件满足后，空手进入青色出口。
- 受击返回起点，保留设备布局；有短暂无敌时间。
- 每关一颗完成星，另两颗奖励无伤与不使用提示。提示不影响关卡解锁。

## 存档与设置

自动保存关卡、玩家位置、手持物、镜面布局、脉冲位置与方向、缓冲等待、设备剩余供电、发射器状态及记录。进入暂停菜单、切换页面和每八秒都会尝试保存。`J` 打开三个独立手动存档槽，可保存、读取、删除，并导出／导入 JSON 文件。导入前会确认替换，损坏的状态不会覆盖当前进度。

存档使用当前浏览器的 `localStorage`，键为 `borrowed-fire.save.v1`，无需服务端。兼容之前的存档，不用清空浏览器数据。浏览器禁止存储时会提示，仍可继续游玩。不同浏览器／域名可通过导出文件迁移；清理站点数据会删除本地存档。

主菜单和暂停菜单中的“维修员”提供 5 种工作服、3 种头部配件、3 种胸前标记，实时预览三维模型，组合共 45 种。外观会持久保存，手动存档也保留当时的外观。

设置提供音量、背景配乐、环境照明、高画质、景深、减少动态效果和文字大小。景深依赖场景深度，默认关闭以保持解谜清晰；`F2` 拍照模式暂停模拟、隐藏 HUD，可调整相机、切换景深并导出 PNG。低画质会关闭景深和 Bloom。

## 验证与构建

```bash
npm test
npm run build
npm run preview
```

- `npm test`：39 项纯逻辑测试，包括七关参考解与正常搬运路径、反射、过期、碰撞、受击、缓冲、手柄输入、外观校验、新旧存档及文件导入恢复。
- `npm run build`：TypeScript 检查与生产构建，输出 `dist/`。
- `npm run preview`：本地预览生产构建，默认端口 4173。

另提供 7 项 Playwright 浏览器测试，覆盖菜单、移动、存档、外观、景深拍照、模拟手柄、720p 布局和设置，并输出截图。**尚未在本机下载浏览器组件或执行这些浏览器测试；模拟手柄不能代替实体手柄验收。** 如需要，由你执行：

```bash
npx playwright install chromium
npm run test:e2e
```

第一条会下载测试用 Chromium 到 Playwright 的用户缓存目录，属于可选环境，不是运行游戏必需项。测试会生成 `test-results/`，失败时保留截图。

手柄映射与手感、Safari／Chrome 性能、关卡首次体验和美术布局仍需要真实游玩验证。自动测试证明规则和参考布局可解，不等于证明谜题已经足够有趣。

## 项目结构

```text
src/
  engine.ts     独立于渲染的仿真、碰撞、反射、供电、交互与快照
  levels.ts     七关数据、教学、递进提示及参考布局
  view.ts       三维场景、材质、环境照明、景深、外观与动画
  audio.ts      合成音效和随供电状态变化的配乐
  appearance.ts 外观选项与校验
  controller.ts 手柄死区、按钮边沿与菜单导航
  feedback.ts   有界、衰减的相机震动
  storage.ts    自动／手动存档、兼容升级及文件迁移
  ui.ts         菜单标记与基础界面结构
  main.ts       游戏流程、辅助界面、键鼠及模块集成
  style.css     原创界面与响应式布局
tests/          逻辑测试与浏览器冒烟测试
docs/           课程对照、设计、环境与答辩准备
.github/        自动检查与手动触发的 Pages 发布工作流
```

## GitHub 管理与发布

尚未初始化 Git、创建提交、创建远程仓库或发布网站。由你确认后在本目录执行：

```bash
git init -b main
git add .gitignore package.json package-lock.json tsconfig.json vite.config.ts index.html src tests playwright.config.ts docs README.md .github
git commit -m "Build Borrowed Fire playable course prototype"
```

显式的 `git add` 列表不包含课程公告 PDF，以免未经确认将课程文件公开。不要提交 `node_modules/`、`dist/` 或测试输出，已有 `.gitignore` 排除。

在 GitHub 创建空仓库后，用你自己的地址替换下面的示例：

```bash
git remote add origin https://github.com/YOUR_USERNAME/borrowed-fire.git
git push -u origin main
```

- 推送或发起 PR 会运行逻辑、构建与浏览器检查；CI 在 GitHub 临时机器上安装测试浏览器，不改变本机环境。
- 如要发布，进入仓库 **Settings → Pages → Source → GitHub Actions**。
- 然后在 **Actions → Publish game to GitHub Pages → Run workflow** 手动发布。
- 构建使用相对资源路径，兼容仓库子路径。单纯推送不会触发发布。

## 课程与后续开发

请阅读 [课程要求对照](docs/COURSE_REQUIREMENTS.md)、[设计与关卡说明](docs/DESIGN.md)、[提交与答辩准备](docs/SUBMISSION.md) 和 [实机验收清单](docs/VALIDATION.md)。选做主路线为碰撞、存读档、控制器、辅助界面、外观自定义，共 15 分候选。本项目提供代码与功能基础，不代替个人独立报告、实际贡献记录或助教评分。

当前视觉资源由代码生成；声音由 Web Audio 合成，字体使用系统字体，不请求外部素材／字体服务。运行依赖 Three.js 等开源项目，使用锁文件记录版本。本仓库暂未指定对外开源许可。

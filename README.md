# alumni-card

这是一个基于静态页面的校友卡演示项目，入口是 `index.html`。
当前版本已经改成纯前端静态数据，不再依赖云端 Redis。

## 文件职责

- `script.js`：启动入口，只负责初始化和挂载
- `state.js`：页面状态、DOM 引用、当前数据
- `ui.js`：弹窗、吐司、转义、页面切换、时钟等界面逻辑
- `storage.js`：静态数据读取、本地覆盖层、设备锁、列表加载、删除和复制链接
- `admin.js`：控制台、生成链接、随机数据、按钮分发
- `lib/constants.js`：稳定配置，比如控制台密码和静态数据入口
- `lib/catalog.js`：静态目录数据，比如院系、专业、姓名素材
- `lib/storage.js`：设备指纹逻辑
- `style.css`：页面样式
- `serve.mjs`：本地预览服务器

## 目录结构

```text
alumni-card/
├── index.html
├── script.js
├── state.js
├── ui.js
├── storage.js
├── admin.js
├── style.css
├── serve.mjs
  ├── lib/
  │   ├── constants.js
  │   ├── catalog.js
  │   └── storage.js
  ├── users.json
└── 静态资源
    ├── home-bg.jpg
    ├── card-bg.jpg
    ├── qr.png
    └── icon.png
```

## 如何启动

这个项目使用 ES module 拆分脚本，建议通过本地 HTTP 服务打开，不要直接用 `file://` 双击打开。

1. 进入项目目录

```bash
cd /Users/tanghailin/Documents/Codex/2026-06-09/use-spreadsheets-to-build-or-update/work/alumni-card
```

2. 启动本地预览

```bash
node serve.mjs
```

3. 如果 4173 端口被占用，可以换端口

```bash
PORT=4174 node serve.mjs
```

4. 在浏览器里打开

```text
http://127.0.0.1:4173/
```

或者如果你换了端口，就打开对应地址，例如：

```text
http://127.0.0.1:4174/
```

## 常用页面

- 首页：`http://127.0.0.1:4173/`
- 指定校友卡：`http://127.0.0.1:4173/?id=xxxx`

## 维护时通常改哪里

- 改页面布局或按钮位置：`index.html`
- 改整体视觉：`style.css`
- 改页面启动顺序或入口挂载：`script.js`
- 改页面状态管理：`state.js`
- 改弹窗、时钟、转义、页面切换：`ui.js`
- 改静态数据读取、本地覆盖、列表加载、删除、设备锁：`storage.js`
- 改控制台、随机数据、生成链接：`admin.js`
- 改固定配置或提示文案：`lib/constants.js`
- 改院系/专业/姓名素材：`lib/catalog.js`

## 修改后怎么验证

- 保存文件后刷新浏览器即可
- 如果看不到更新，先强制刷新一次
- 如果页面打不开，先确认本地预览服务是否还在运行

## 数据说明

- `users.json` 是静态校友数据源
- 页面加载时会先读这个文件，再叠加浏览器本地的新增、激活和删除状态
- 控制台新增的数据只会写到当前浏览器的本地存储
- 如果你想让所有人都看到新数据，就需要手动改 `users.json` 并重新 push 到仓库
- 仓库里的历史旧版入口已经清理掉了，当前主入口只有 `index.html`

## 说明

- `serve.mjs` 只是一个本地静态服务器，不需要额外安装依赖
- 之所以推荐本地预览，是因为模块化脚本在 `file://` 下经常会受浏览器限制

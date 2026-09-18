<div align="center">

# ✦ 掌间星云 · NEBULA

**让一片发光宇宙，真正随手而动。**

用摄像头识别手势、用原生 WebGL 绘制粒子的沉浸式互动星云。<br>
无需上传视频，无需麦克风，手部识别完全在浏览器本地完成。

[![Live Demo](https://img.shields.io/badge/在线体验-打开星云-9b8cff?style=for-the-badge)](https://gesture-nebula.zgao82277.chatgpt.site/)
[![JavaScript](https://img.shields.io/badge/JavaScript-原生-f7df1e?style=flat-square&logo=javascript&logoColor=111)](https://developer.mozilla.org/docs/Web/JavaScript)
[![WebGL](https://img.shields.io/badge/WebGL-粒子渲染-990000?style=flat-square&logo=webgl)](https://www.khronos.org/webgl/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-0.10.21-00a67e?style=flat-square)](https://developers.google.com/mediapipe)
[![Privacy](https://img.shields.io/badge/隐私-本地处理-65d6b4?style=flat-square)](#隐私与安全)

[在线体验](https://gesture-nebula.zgao82277.chatgpt.site/) · [快速开始](#快速开始) · [手势说明](#手势说明) · [技术架构](docs/ARCHITECTURE.md) · [参与贡献](CONTRIBUTING.md)

</div>

## 项目亮点

- **自然的单手缩放**：缓慢张手放大、缓慢收手缩小；快速张合仅作为“重新抓取”的准备动作，不会让画面突然跳变。
- **可深入粒子内部**：缩放范围最高可达 9 倍，能从完整星云逐步进入粒子空间。
- **多维手势交互**：手掌移动牵引星云、转掌控制旋转、双手间距控制整体拉伸。
- **三种粒子形态**：旋涡星系、能量球与星环，可自由切换色彩和粒子密度。
- **本地实时识别**：MediaPipe Hand Landmarker 在 Web Worker 中运行，主线程专注动画渲染。
- **开箱即用**：不依赖前端构建工具；Python 3 启动本地服务器即可体验。
- **完整降级体验**：没有摄像头时仍可使用鼠标或触屏控制。

## 在线体验

访问：**[gesture-nebula.zgao82277.chatgpt.site](https://gesture-nebula.zgao82277.chatgpt.site/)**

建议使用最新版 Chrome，并允许网页访问摄像头。光线明亮、手掌完整入镜时识别效果最佳。

## 手势说明

| 动作 | 效果 | 使用建议 |
| --- | --- | --- |
| 缓慢张开手掌 | 连续放大 | 从握拳状态缓慢张开，可逐步进入粒子内部 |
| 缓慢收拢手掌 | 连续缩小 | 从张手状态缓慢收拢，回到完整星云视角 |
| 快速张手 | 准备缩小 | 只重置手势起点，不改变当前大小 |
| 快速收手 | 准备放大 | 只重置手势起点，不改变当前大小 |
| 移动手掌 | 牵引星云 | 控制星云在画面中的位置 |
| 左右转掌 | 旋转星云 | 改变观察角度和旋转方向 |
| 双手拉开或靠拢 | 相对缩放 | 适合快速调整整体范围 |

没有开启摄像头时：移动鼠标可牵引星云，滚轮控制缩放，按住鼠标可聚拢粒子；触屏支持拖动和长按。

## 快速开始

### 1. 获取项目

```bash
git clone https://github.com/Pigpig22/gesture-nebula.git
cd gesture-nebula
```

### 2. 准备本地识别资源

仓库使用固定版本的 MediaPipe。首次运行可执行：

```bash
python3 scripts/fetch_mediapipe.py
```

脚本会从 MediaPipe 官方模型存储和 jsDelivr 的官方 npm 镜像下载所需文件。若仓库中已经包含完整的 `dist/vendor`，脚本会自动跳过现有文件。

### 3. 启动

```bash
python3 server.py
```

浏览器打开 [http://localhost:8765](http://localhost:8765)。停止服务请在终端按 `Ctrl+C`。

macOS 用户也可以直接双击 `启动星云.command`。端口被占用时可运行：

```bash
python3 server.py --port 8766
```

> 不建议直接双击 `dist/index.html`。ES Module、摄像头和本地模型需要通过 `localhost` 或 HTTPS 加载。

## 项目结构

```text
gesture-nebula/
├── dist/
│   ├── index.html          # 页面结构与控制面板
│   ├── style.css           # 响应式视觉样式
│   ├── app.js              # 摄像头、输入与应用状态
│   ├── gestures.js         # 手势测量与速度缩放状态机
│   ├── particles.js        # WebGL 粒子生成、变形与渲染
│   ├── hand-worker.js      # MediaPipe 手部识别 Worker
│   └── vendor/             # MediaPipe 运行库、WASM 与模型
├── docs/
│   └── ARCHITECTURE.md     # 架构与数据流说明
├── scripts/
│   └── fetch_mediapipe.py  # 下载固定版本的本地识别资源
├── server.py               # 本地静态服务器
└── 启动星云.command        # macOS 快捷启动器
```

## 技术栈

- 原生 JavaScript / HTML / CSS
- WebGL 粒子渲染
- MediaPipe Tasks Vision `0.10.21`
- Hand Landmarker `float16 / version 1`
- Web Worker + Transferable `ImageBitmap`
- Python 3 本地静态服务器

更详细的数据流、交互状态机与渲染设计见 [技术架构](docs/ARCHITECTURE.md)。

## 隐私与安全

- 摄像头画面仅在当前浏览器中处理，不会上传到服务器。
- 项目不读取麦克风，不包含账号系统、分析统计或广告脚本。
- 页面切换到后台时会自动关闭摄像头。
- 本地服务器只监听 `127.0.0.1`，默认不会暴露到局域网。
- 识别模型和 WASM 可保存在本地，运行时无需访问第三方识别服务。

## 常见问题

<details>
<summary><strong>摄像头无法开启</strong></summary>

检查地址栏的网站权限，确认 Chrome 已获得系统摄像头权限，并关闭可能占用摄像头的其他软件。

</details>

<details>
<summary><strong>手势识别不稳定</strong></summary>

保持正面光照，让整个手掌完整进入画面，并避免复杂背景。动作过快时会被识别为准备动作，这是为了避免缩放跳变。

</details>

<details>
<summary><strong>页面打开后模型加载失败</strong></summary>

先运行 `python3 scripts/fetch_mediapipe.py`，确认 `dist/vendor` 中的模型、JavaScript 和 WASM 文件完整，然后通过 `python3 server.py` 启动。

</details>

<details>
<summary><strong>动画不动</strong></summary>

系统开启“减少动态效果”时，项目会默认暂停动画。点击页面中的“继续动画”即可恢复。

</details>

## 致谢

- [MediaPipe](https://developers.google.com/mediapipe) 提供浏览器端手部关键点识别能力。
- [Khronos WebGL](https://www.khronos.org/webgl/) 提供高性能图形渲染标准。

`dist/vendor` 中的第三方文件保留其原始许可证与说明，详见该目录中的 `LICENSE` 和 `MEDIAPIPE-README.md`。

## 参与贡献

欢迎提交 Bug、交互建议和视觉创意。开始前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

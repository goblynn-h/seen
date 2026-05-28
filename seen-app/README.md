# 看过

记录你看过的书籍和影视作品。

桌面应用，Tauri 2.0 + React + TypeScript，单文件便携 exe，不写注册表。

## 下载

从 [Releases](https://github.com/goblynn-h/seen/releases) 下载 `seen.exe`，双击即用。

详细使用说明见 [看过-使用说明书.md](看过-使用说明书.md)。

## 从源码构建

需要 Node.js 18+、Rust、VS Build Tools（C++ 桌面开发）、WebView2。

```bash
git clone https://github.com/goblynn-h/seen.git
cd seen
npm install
npm run tauri dev    # 开发
npm run tauri build  # 构建 exe
```

## 技术栈

React 19 · TypeScript · Vite · Tailwind CSS v4 · @dnd-kit · @uiw/react-md-editor · lucide-react · Rust · Tauri 2.0

## 许可

MIT

# 回响 — 需求规格 & 实现方案

## 一、项目概述

一个 Windows 桌面应用，用来记录你看过的书籍和影视作品在你心里留下的回响。四个分类页面（书籍、动漫、电视剧、电影），每个条目有封面、观看日期和 Markdown 笔记。所有数据以文件形式存储在本地指定文件夹，不依赖任何数据库或云服务。

---

## 二、功能清单

### 2.1 分类切换
- 左边四个 Tab：书籍 / 动漫 / 电视剧 / 电影
- 点击切换，每个 Tab 独立管理自己的条目列表

### 2.2 条目管理
- 以封面网格形式展示当前分类的所有条目
- 每个条目卡片包含：封面图、作品名称、观看日期
- **拖拽排序**：卡片右下角有拖拽手柄（⋮⋮ 图标），按住手柄拖动可重新排列顺序，放开后自动保存。排列顺序即 index.json 中的存储顺序
- 网格末尾始终有一个 **"+"方框**（虚线边框 + 居中加号图标），点击触发本地图片选择。"+"方框不参与排序，始终固定在末尾
- 选择图片后弹出「添加新条目」表单：作品名称（必填）、观看日期（自由文本输入，支持模糊描述如「23年x月」「24年夏」「2023年底 - 2024年初」等任意格式）、封面自动使用选择的图片
- 条目卡片右上角有删除按钮（光标落在封面时才显现，二次确认）。拖拽过程中删除按钮自动隐藏
- 支持按名称搜索

### 2.3 Markdown 笔记浮窗
- 点击任意条目封面 → 弹出浮窗（Modal）
- 浮窗左侧：封面大图 + 作品名 + 观看日期（自由文本，可直接编辑修改）
- 浮窗右侧：Markdown 编辑器，有编辑和阅读两种模式，无内容时默认为编辑模式，有内容时默认为阅读模式
- 编辑内容自动保存（debounce 1 秒），无需手动点保存按钮
- 点击浮窗外部关闭

### 2.4 数据存储
- 所有数据存储在用户指定的文件夹（如 `D:/MyLibrary`）
- 每个分类一个子文件夹，内含：
  - `index.json`：条目元数据索引
  - `covers/`：封面图片文件
  - `notes/`：Markdown 笔记文件（一个条目对应一个 `.md`）
- 封面图片在选择时自动复制到 `covers/` 文件夹，不依赖原始路径

---

## 三、技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 桌面框架 | Tauri 2.0 | 轻量、高性能、使用系统 WebView2 |
| 前端 | React 18 + TypeScript | 类型安全，生态最大 |
| 样式 | Tailwind CSS | 快速出 UI，响应式网格 |
| Markdown 编辑器 | @uiw/react-md-editor | 开箱即用，支持预览 |
| 图标 | lucide-react | 轻量图标库 |
| 拖拽排序 | @dnd-kit/core + @dnd-kit/sortable | 现代拖拽库，TypeScript 原生支持，区分点击与拖拽 |
| 后端（Tauri 命令） | Rust | 文件复制、JSON 读写 |
| 构建工具 | Vite | Tauri 2.0 默认 |

### 3.1 便携版打包配置

打包为绿色免安装版本，核心配置如下：

```json
// src-tauri/tauri.conf.json — bundle 部分
{
  "bundle": {
    "active": true,
    "targets": "all",
    "windows": {
      "nsis": {
        "installMode": "portable"
      }
    }
  }
}
```

构建后产物是一个独立的 `.exe` 文件，无需安装，双击即用。可放在任意文件夹、U 盘，不写注册表，不创建系统目录。

应用自身的配置（如数据根目录路径）统一存储在 `.exe` 同级目录下的 `config.json` 中，而非系统 app data 目录，确保完全便携。

---

## 四、数据模型

### index.json 结构
```json
[
  {
    "id": "uuid-string",
    "title": "作品名称",
    "date": "24年夏",
    "coverFileName": "cover-uuid.jpg",
    "noteFileName": "note-uuid.md",
    "createdAt": "2025-03-15T10:30:00Z"
  }
]
```

### 文件夹结构
```
D:/MyLibrary/                 ← 用户指定的根目录
├── books/
│   ├── index.json
│   ├── covers/
│   │   └── {uuid}.jpg
│   └── notes/
│       └── {uuid}.md
├── anime/
│   ├── index.json
│   ├── covers/
│   └── notes/
├── tv/
│   ├── index.json
│   ├── covers/
│   └── notes/
└── movies/
    ├── index.json
    ├── covers/
    └── notes/
```

首次启动时自动创建以上完整目录结构。

---

## 五、组件树

```
App
├── CategoryTabs          ← 四个分类 Tab 切换
├── SearchBar             ← 搜索框，按名称过滤
├── CoverGrid             ← 封面网格（SortableContext）
│   ├── CoverCard[]       ← 可拖拽排序的条目卡片（带拖拽手柄）
│   └── AddCoverButton    ← 网格末尾的 "+" 方框（不参与排序）
└── DetailModal           ← 点击封面打开，Markdown 编辑浮窗
    ├── CoverImage        ← 封面大图
    ├── MetaEditor        ← 标题、日期编辑区
    └── MarkdownEditor    ← @uiw/react-md-editor
```

---

## 六、Tauri 命令（Rust 后端）

| 命令 | 说明 |
|---|---|
| `init_library(root_path)` | 初始化目录结构，若不存在则创建 |
| `load_entries(category, root_path)` | 读取某分类的 index.json |
| `save_entries(category, root_path, entries)` | 写入某分类的 index.json |
| `copy_cover(source_path, category, root_path)` | 将用户选择的图片复制到 covers/，返回新文件名 |
| `delete_cover(category, root_path, file_name)` | 删除封面图片 |
| `save_note(category, root_path, file_name, content)` | 保存 Markdown 笔记 |
| `load_note(category, root_path, file_name)` | 读取 Markdown 笔记 |
| `delete_note(category, root_path, file_name)` | 删除笔记文件 |
| `open_file_dialog()` | 打开系统文件选择器，限定图片格式，返回文件路径 |

---

## 七、实现要点 & 关键细节

### 7.1 添加条目的流程
1. 用户点击 "+" 方框
2. 调用 Tauri 的 `dialog.open()` 打开系统文件选择器（过滤：jpg/png/webp/gif）
3. 用户选择图片后，调用 `copy_cover` 将图片复制到 `covers/` 文件夹
4. 弹出表单 Modal：作品名称（Input）、观看日期（Input，自由文本，placeholder 示例「23年x月」「24年夏」）
5. 提交后：生成 uuid，创建空白 `.md` 笔记文件，写入 `index.json`，刷新网格

### 7.2 Markdown 自动保存
- 使用 `useEffect` + `setTimeout` 实现 debounce
- 用户停止输入 1 秒后自动调用 `save_note`
- 保存时在编辑器角落显示「已保存」提示（2 秒后消失）

### 7.3 配置存储（便携版）
- 应用配置（用户指定的数据根文件夹路径）存储在 `.exe` 同级目录下的 `config.json`
- 首次启动弹出设置页，让用户选择数据存储文件夹
- 之后启动直接读取配置
- 设置页支持随时更改数据存储位置
- 整个应用文件夹可以直接拷贝到另一台电脑使用，配置和数据路径保持一致

### 7.4 封面图片处理
- 复制而非引用原始文件，确保数据自包含
- 统一转为 webp 格式可减小体积（可选优化）
- 显示时使用 `convertFileSrc()` 将本地路径转为 WebView 可用 URL

### 7.5 拖拽排序
- 使用 @dnd-kit 的 SortableContext 实现网格拖拽排序
- 每个卡片设置拖拽手柄（右下角 ⋮⋮ 图标），只响应手柄拖拽，点击封面其他区域正常打开浮窗
- `activationConstraint` 设置距离阈值（移动 5px 以上才触发拖拽），避免误触
- 拖拽中卡片微微上浮（`scale(1.05)` + 阴影），其他卡片平滑让位
- 排序变更后直接更新 entries 数组并调用 `save_entries` 写回 index.json
- "+"方框不包裹在 SortableContext 内，始终渲染在网格末尾

### 7.6 "+"方框样式
- 宽高与封面卡片一致（约 160×220px）
- 2px 虚线边框（dashed），圆角 8px
- 居中显示一个大号 "+" 图标（灰色）
- hover 时边框变实线、颜色加深、光标变 pointer

---

## 八、开发前需要准备的环境

Claude Code 会指导你逐步完成，这里先列出来：

1. **Node.js 18+**：`winget install OpenJS.NodeJS`
2. **Rust 工具链**：安装 [rustup](https://rustup.rs/)，选默认选项
3. **Visual Studio Build Tools**（Windows 编译 Rust 必需）：
   - 下载 [Build Tools for Visual Studio](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
   - 安装时勾选「使用 C++ 的桌面开发」工作负载
4. **WebView2**：Windows 10/11 自带，无需额外安装

---

## 九、给 Claude Code 的启动提示

把以下内容直接发给 Claude Code，它就能开始干活：

> 请帮我创建一个 Tauri 2.0 + React + TypeScript 桌面应用，名为「回响」。需求规格文档在 `my-media-library-spec.md`，请先完整阅读后再开始。
>
> 关键约束：
> 1. 使用 `npm create tauri-app@latest` 创建项目，选择 React + TypeScript + Vite 模板
> 2. 打包为便携版（NSIS portable 模式，不创建安装程序，单 exe 文件）
> 3. 应用配置存于 exe 同级目录的 config.json，不使用系统 app data 目录
> 4. 所有代码生成后不要自行运行，等我确认。


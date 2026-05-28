# CLAUDE.md

## 项目概述

「看过」是一个 Windows 桌面应用，用于记录看过的书籍和影视作品的笔记。Tauri 2.0 + React 19 + TypeScript，打包为绿色便携版单 exe。

## 开发环境

- 所有命令在 `d:/01Projects/seen/seen-app/` 目录下执行
- 需要先设置 PATH：`export PATH="$HOME/.cargo/bin:$PATH"`
- 开发模式：`npm run tauri dev`（前端 HMR，Rust 自动重编译）
- 构建 exe：`npm run tauri build`（产物在 `src-tauri/target/release/app.exe`）
- `src-tauri/target/` 目录是编译缓存，可达 5 GB，用 `cargo clean` 清理

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Tauri 2.0 |
| 前端 | React 19 + TypeScript + Vite |
| 样式 | Tailwind CSS v4（class-based 暗色模式） |
| Markdown | @uiw/react-md-editor |
| 拖拽 | @dnd-kit/core + @dnd-kit/sortable |
| 图标 | lucide-react |
| 后端 | Rust（文件操作、JSON 读写） |

## 数据模型

所有数据存于用户选择的根目录（如 `D:/MyLibrary`）：

```
根目录/
├── categories.json          # [{ id, name }]
├── {分类名}/
│   ├── index.json           # [{ id, title, date, coverFileName, noteFileName, createdAt, hasNote }]
│   ├── covers/              # {作品名}.jpg/png/webp
│   └── notes/               # {作品名}.md
```

- `categories.json`：分类列表，默认初始为 `[{ id: "default", name: "默认" }]`
- `index.json`：条目数组，`coverFileName` 可为空字符串（无封面时用文字替代）
- 应用配置（`rootPath`）存储在 exe 同级目录的 `config.json`

## 前端架构

### 组件树

```
App
├── CategoryTabs          ← 分类管理（拖拽排序、重命名、删除、添加）
├── SearchBar             ← 实时搜索
├── CoverGrid             ← 封面网格（@dnd-kit 拖拽排序）
│   ├── CoverCard[]       ← 单张卡片（封面图片/文字兜底、删除二次确认）
│   └── AddCoverButton    ← "+" 虚线框，固定首位
├── DetailModal           ← 作品详情浮窗（左侧封面+元数据，右侧 MD 编辑器）
├── AddEntryModal         ← 添加作品弹窗（可选封面，标题必填）
└── SetupPage             ← 首次启动选文件夹
```

### 主题系统

- 三套主题：素白(mono) / 松绿(pine) / 暖黄(warm)
- `data-theme` 属性在 `<html>` 上，`.dark` 类同在 `<html>` 上
- 所有组件颜色通过 CSS 变量驱动（`--theme-bg`、`--theme-text` 等），在 `index.css` 中定义
- Tailwind v4 的 `@theme` 将变量映射为工具类：`bg-app-bg`、`text-app-text` 等
- `useTheme()` hook 管理主题+暗色状态，存 localStorage

### 关键交互

- **添加作品流程**：点击"+" → AddEntryModal（可选封面 + 标题 + 日期）→ 提交时 `copy_cover` + `save_note`，新作品插入列表开头
- **笔记保存**：1 秒 debounce 自动保存 + 关闭浮窗时立即保存
- **封面替换**：先 `delete_cover` 旧文件，再 `copy_cover` 新文件（避免同名覆盖）
- **文件命名**：封面和笔记用 `sanitizeFileName(title)` 命名（去掉非法字符，空格换下划线，限 40 字），修改标题关闭浮窗时自动重命名磁盘文件
- **相对路径图片**：笔记中 `![](图片名.jpg)` 自动转换为 `asset://` URL
- **有笔记标记**：卡片底部显示琥珀色短线，通过 `check_notes` 批量检测 + 打开浮窗时即时更新
- **工具函数**：`sanitizeFileName` 统一放在 `src/utils.ts`

## Rust 后端（src-tauri/src/lib.rs）

### 命令列表

| 命令 | 参数 | 说明 |
|---|---|---|
| `init_library` | root_path | 初始化目录结构 + categories.json |
| `load_categories` | root_path | 读取分类列表 |
| `save_categories` | root_path, categories | 写入分类列表 |
| `add_category` | root_path, name | 新增分类，返回 id |
| `rename_category` | root_path, old_name, new_name | 重命名分类+文件夹 |
| `delete_category` | root_path, name | 删除分类+文件夹（至少保留一个） |
| `load_entries` | category, root_path | 读取 index.json |
| `save_entries` | category, root_path, entries | 写入 index.json |
| `copy_cover` | source_path, category, root_path, target_name? | 复制封面图片 |
| `delete_cover` | category, root_path, file_name | 删除封面（空文件名跳过） |
| `rename_cover` | category, root_path, old_name, new_name | 重命名封面文件 |
| `save_note` | category, root_path, file_name, content | 保存笔记 |
| `load_note` | category, root_path, file_name | 读取笔记 |
| `delete_note` | category, root_path, file_name | 删除笔记 |
| `rename_note` | category, root_path, old_name, new_name | 重命名笔记文件 |
| `check_notes` | category, root_path, file_names | 批量检测笔记是否有内容，返回非空文件名列表 |
| `load_config` | — | 读取 exe 同级 config.json |
| `save_config` | config | 写入 exe 同级 config.json |
| `open_folder` | path | 调用系统资源管理器打开文件夹 |

### 关键依赖

- `uuid` crate（v4 feature）— 生成分类 ID
- `serde` / `serde_json` — JSON 序列化
- `tauri-plugin-dialog` — 文件/文件夹选择对话框

## 常见调试

- **封面不显示**：检查 `assetProtocol` 是否在 `tauri.conf.json` 中启用，路径是否用 `/` 分隔
- **修改不生效**：前端 HMR 自动更新；Rust 改后需等待重编译（约 10-15 秒）
- **暗色模式样式**：编辑器用 `data-color-mode` 属性，全局用 `.dark` 类，两者独立
- **端口占用**：Vite 用 1420，冲突时 `cmd //c "taskkill /F /PID xxx"` 杀掉

# FX Toolbox - WordPress 图片优化工具

第一次尝试用 Tauri 做桌面应用，做了个 WordPress 图片批量上传工具，可以自动用 AI 生成 SEO 信息。

## 下载

在 [Releases](https://github.com/frankie0736/wp-img-optimizer-tauri/releases) 下载最新版本：
- macOS: 下载 `.dmg` 文件
- Windows: 下载 `.exe` 或 `.msi` 文件

## 功能

- 拖拽图片就能上传，支持批量（最多 50 张）
- 自动转 WebP 格式，压缩图片
- 用 OpenAI Vision 自动生成标题、描述、Alt 文本、标签（全英文，SEO 友好）
- 自动上传到 WordPress 媒体库
- 可以管理多个 WordPress 站点
- 验证配置后自动保存

## 使用

1. 打开应用，进入"设置"标签页
2. 配置 OpenAI API（可以用兼容的第三方 API）
3. 添加 WordPress 站点（需要应用密码）
4. 切换到"上传"标签页，拖拽图片就行

### WordPress 应用密码怎么弄？

1. WordPress 后台 → 用户 → 个人资料
2. 找到"应用密码"
3. 输入名称（随便写），点"添加新应用密码"
4. 复制密码（格式是 `xxxx xxxx xxxx xxxx`）

## 技术栈

这是我第一次用 Tauri，选择原因：
- 跨平台（macOS 和 Windows 都能用）
- Rust 后端（处理图片和 API 调用）
- React 前端（写界面比较快）
- 打包出来的安装包比 Electron 小很多

用到的：
- Tauri v2
- React 19 + TypeScript
- Vite
- Tailwind CSS
- @jsquash/webp（浏览器端 WebP 转换）

## 开发

需要安装：
- Node.js 18+
- Rust 1.77+

```bash
# 安装依赖
npm install

# 开发模式（第一次会比较慢，Rust 要编译依赖）
npm run tauri:dev

# 打包
npm run tauri:build
```

构建产物在 `src-tauri/target/release/bundle/` 目录。

## 遇到的坑

1. **拖拽不生效**：Tauri 默认会拦截文件拖放，要在配置里设置 `dragDropEnabled: false`
2. **WebAssembly 报错**：需要配置 CSP 允许 `wasm-unsafe-eval`，还要排除 `@jsquash/webp` 的依赖优化
3. **Tauri v1 和 v2 配置不一样**：比如 `fileDropEnabled` 改名成了 `dragDropEnabled`

## 许可证

MIT

## 作者

Frankie徐 - tsuicx@qq.com

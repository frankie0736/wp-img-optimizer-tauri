# FX Toolbox - WordPress Image Optimizer

一个基于 Tauri 的跨平台桌面应用，用于自动化图片优化、AI 识别和 WordPress 上传。

## 🚀 功能特性

- ✅ **拖拽上传** - 支持拖放图片或点击选择
- ✅ **批量处理** - 一次最多上传 50 张图片
- ✅ **图片优化** - 自动转换 WebP 格式，压缩文件大小
- ✅ **AI 识别** - OpenAI Vision API 自动生成标题、描述、Alt 文本和标签
- ✅ **WordPress 集成** - 自动上传到 WordPress 媒体库并更新元数据
- ✅ **多站点管理** - 支持配置和管理多个 WordPress 站点
- ✅ **实时进度** - 每个任务的处理、分析、上传进度实时显示
- ✅ **可视化界面** - 现代化的 UI，支持亮色/暗色主题
- ✅ **图片预览** - 上传前预览图片，显示文件大小优化效果
- ✅ **离线运行** - 除 API 调用外完全本地运行

## 📋 系统要求

- **macOS**: 10.15+（支持 M 系列和 Intel 芯片）
- **Windows**: 10+
- **开发环境**:
  - Node.js 18+
  - Rust 1.77+
  - Cargo

## 🛠️ 开发

### 安装依赖

```bash
npm install
```

### 开发模式

启动开发服务器（会自动打开桌面窗口）：

```bash
npm run tauri:dev
```

首次运行会下载并编译 Rust 依赖，需要等待几分钟。

### 构建生产版本

```bash
npm run tauri:build
```

构建产物位置：
- **macOS**: `src-tauri/target/release/bundle/dmg/`
- **Windows**: `src-tauri/target/release/bundle/msi/`

## ⚙️ 配置

应用的配置文件会自动保存在系统的应用数据目录：

- **macOS**: `~/Library/Application Support/com.fx210studio.toolbox/config.json`
- **Windows**: `%APPDATA%\com.fx210studio.toolbox\config.json`

### 配置格式示例

```json
{
  "openai": {
    "api_url": "https://api.openai.com/v1",
    "api_key": "sk-..."
  },
  "wordpress_sites": [
    {
      "id": "site-1",
      "site_url": "https://your-site.com",
      "username": "your-username",
      "app_password": "xxxx xxxx xxxx xxxx",
      "context": "这是一个关于旅游的博客",
      "convert_to_webp": true,
      "quality": 85,
      "max_width": 1920
    }
  ],
  "image_optimizer": {
    "convert_to_webp": true,
    "max_width": 1920,
    "quality": 85
  }
}
```

### 获取 WordPress 应用密码

1. 登录 WordPress 后台
2. 进入 **用户 → 个人资料**
3. 滚动到 **应用密码** 部分
4. 输入应用名称（如 "FX Toolbox"）
5. 点击 **添加新应用密码**
6. 复制生成的密码（格式：`xxxx xxxx xxxx xxxx`）

## 📖 使用方法

### 方式一：通过 UI 配置（开发中）

应用启动后，会显示配置状态和上传界面。

### 方式二：手动编辑配置文件

1. 运行应用一次，让它创建配置文件
2. 关闭应用
3. 编辑配置文件（位置见上方）
4. 重新启动应用

### 上传图片

1. 确保已配置 OpenAI 和至少一个 WordPress 站点
2. 点击 "Upload Image" 按钮
3. 选择要上传的图片
4. 应用会自动：
   - 调用 OpenAI 分析图片内容
   - 生成标题、描述、Alt 文本和标签
   - 上传到 WordPress
   - 更新媒体库元数据

## 🏗️ 技术架构

### 前端
- React 19 + TypeScript
- Vite（构建工具）
- Tauri API（与后端通信）

### 后端（Rust）
- Tauri v2（跨平台框架）
- reqwest（HTTP 客户端）
- tokio（异步运行时）
- serde（JSON 序列化）

## 🔧 开发命令

```bash
# 前端开发服务器
npm run dev

# 构建前端
npm run build

# Tauri 开发模式
npm run tauri:dev

# Tauri 生产构建
npm run tauri:build

# 直接调用 Tauri CLI
npm run tauri -- <command>
```

## 📝 待办事项

- [ ] 添加完整的配置 UI
- [ ] 支持批量上传（最多 50 张）
- [ ] 添加图片预览功能
- [ ] 支持拖拽上传
- [ ] 添加上传历史记录
- [ ] 支持多语言
- [ ] 添加更多图片处理选项（裁剪、旋转等）

## 🐛 问题排查

### 问题：OpenAI API 调用失败

- 检查 API key 是否正确
- 确认 API URL 格式正确（默认：`https://api.openai.com/v1`）
- 检查网络连接
- 查看应用日志

### 问题：WordPress 上传失败

- 确认站点 URL 格式正确（包含 `https://`）
- 验证用户名和应用密码
- 确保 WordPress REST API 已启用
- 检查 WordPress 权限设置

### 问题：首次构建很慢

这是正常的！Rust 首次编译需要下载和编译所有依赖。后续构建会快很多（使用缓存）。

## 📚 相关文档

- [Tauri 官方文档](https://tauri.app/)
- [OpenAI API 文档](https://platform.openai.com/docs/)
- [WordPress REST API 文档](https://developer.wordpress.org/rest-api/)

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

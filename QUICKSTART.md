# FX Toolbox 快速入门指南

## 🎯 5 分钟快速上手

### 1. 安装依赖

```bash
npm install
```

### 2. 首次运行

```bash
npm run tauri:dev
```

⏳ **注意**：首次运行需要编译 Rust 代码，大约需要 3-5 分钟。请耐心等待。

### 3. 配置应用

应用启动后，点击顶部的 **Settings** 标签：

#### 配置 OpenAI

1. 输入 API URL（默认：`https://api.openai.com/v1`）
2. 输入您的 OpenAI API Key（从 https://platform.openai.com/api-keys 获取）
3. 点击 **Validate** 验证配置
4. 看到 ✓ 表示配置成功

#### 配置 WordPress 站点

1. 点击 **Add WordPress Site** 按钮
2. 填写以下信息：
   - **Site URL**: 您的 WordPress 站点地址（如 `https://yourblog.com`）
   - **Username**: WordPress 用户名
   - **Application Password**: WordPress 应用密码（获取方法见下方）
   - **Context** (可选): 网站描述，帮助 AI 更好地理解图片用途
3. 点击 ✓ 保存站点
4. 点击页面底部的 **Save Configuration** 保存所有配置

#### 获取 WordPress 应用密码

1. 登录 WordPress 后台
2. 进入 **用户 → 个人资料**
3. 滚动到 **应用密码** 部分
4. 输入应用名称（如 "FX Toolbox"）
5. 点击 **添加新应用密码**
6. 复制生成的密码（格式：`xxxx xxxx xxxx xxxx`）

### 4. 上传图片

配置完成后，切换到 **Upload** 标签：

1. **拖拽图片** 到上传区域，或点击选择文件
2. 可以一次选择多张图片（最多 50 张）
3. 应用会自动：
   - ⚙️ **Processing**: 压缩和优化图片
   - 🤖 **Analyzing**: 使用 AI 分析图片内容
   - ☁️ **Uploading**: 上传到 WordPress
   - ✅ **Completed**: 显示上传结果和 URL

### 5. 查看结果

- ✅ 绿色勾号表示上传成功
- 点击显示的 URL 可以在浏览器中查看图片
- 显示文件大小优化效果（如 -45%）

## 🎨 界面说明

### Upload 标签

- **上传区域**: 拖拽或点击上传图片
- **站点选择器**: 多站点时可选择目标站点
- **任务列表**: 显示所有上传任务的状态和进度
- **Clear Completed**: 清除已完成的任务

### Settings 标签

- **OpenAI Configuration**: 配置 AI 分析服务
- **WordPress Sites**: 管理 WordPress 站点
- **Save Configuration**: 保存所有配置

## 💡 使用技巧

1. **Context 字段很重要**：为每个站点设置准确的 Context，AI 会根据这个信息生成更贴切的图片描述

   示例：
   - 旅游博客：`这是一个关于旅游的博客，专注于亚洲地区的美食和风景`
   - 科技博客：`这是一个关于人工智能和编程的技术博客`
   - 电商网站：`这是一个销售户外运动装备的电商网站`

2. **批量上传**：一次上传多张图片时，任务会按顺序处理，不会全部同时进行

3. **文件格式**：支持 JPG、PNG、WebP 等常见格式，会自动转换为 WebP 以节省空间

4. **配置保存位置**：
   - macOS: `~/Library/Application Support/com.fx210studio.toolbox/config.json`
   - Windows: `%APPDATA%\\com.fx210studio.toolbox\\config.json`

## ❓ 常见问题

### 上传失败？

1. **检查 OpenAI 配置**：确保 API Key 有效且有足够余额
2. **检查 WordPress 配置**：验证用户名和应用密码是否正确
3. **检查网络连接**：确保能访问 OpenAI 和 WordPress
4. **查看错误信息**：任务列表中会显示具体的错误原因

### OpenAI 验证失败？

- 确认 API URL 正确（通常是 `https://api.openai.com/v1`）
- 确认 API Key 以 `sk-` 开头
- 检查 API Key 是否有使用 GPT-4 Vision 的权限

### WordPress 连接失败？

- 确认站点 URL 包含 `https://`
- 确认 WordPress 已启用 REST API
- 确认应用密码格式正确（带空格也可以）
- 检查 WordPress 用户权限（需要能上传媒体）

## 🚀 下一步

- 尝试不同的图片类型
- 为不同的 WordPress 站点设置不同的优化参数
- 查看 [README.md](README.md) 了解更多技术细节
- 查看 [TAURI_MIGRATION_GUIDE.md](TAURI_MIGRATION_GUIDE.md) 了解架构设计

## 📞 支持

遇到问题？
- 查看应用日志（开发模式下在终端显示）
- 提交 Issue 到 GitHub
- 检查配置文件是否正确

祝您使用愉快！🎉

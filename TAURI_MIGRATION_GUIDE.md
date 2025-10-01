# FX Toolbox Tauri 迁移开发指南

## 📋 项目概述

将现有的 FX Toolbox 图片优化器从 Cloudflare Workers 架构迁移到 Tauri 桌面应用，实现完全离线的图片处理和 WordPress 自动上传功能。

### 目标平台
- Windows 10+
- macOS (M 系列芯片，兼容 Intel)

### 核心功能
- ✅ 本地图片压缩处理（WebP 转换、尺寸调整、质量控制）
- ✅ OpenAI 集成（生成图片描述、标题、标签）
- ✅ WordPress REST API 自动上传
- ✅ 多 WordPress 站点管理
- ✅ 实时进度显示
- ✅ 批量处理（最多 50 张）

---

## 🏗️ 架构设计

### 整体架构
```
┌─────────────────────────────────────────────────┐
│                  Tauri App                      │
├─────────────────────────────────────────────────┤
│  Frontend (React)          Backend (Rust)       │
│  ┌──────────────────┐     ┌─────────────────┐  │
│  │ React UI         │────▶│ Tauri Commands  │  │
│  │ - 图片上传       │     │ - 图片处理      │  │
│  │ - 进度显示       │     │ - AI 调用       │  │
│  │ - 设置管理       │     │ - WP 上传       │  │
│  │                  │◀────│ - 配置管理      │  │
│  └──────────────────┘     └─────────────────┘  │
│         │                          │            │
│         │                          ▼            │
│         │                  ┌─────────────────┐  │
│         │                  │ 本地文件系统    │  │
│         │                  │ - 临时图片      │  │
│         │                  │ - 配置文件      │  │
│         │                  └─────────────────┘  │
└─────────────────────────────────────────────────┘
         │                          │
         │                          │
         ▼                          ▼
   OpenAI API              WordPress REST API
```

### 技术栈

**保留（前端）：**
- React 19 + TypeScript
- TanStack Router（简化版，无需完整路由）
- TanStack Query（API 状态管理）
- Tailwind CSS + shadcn/ui
- @jsquash（前端图片压缩）

**新增（后端）：**
- Tauri v2
- Rust
- serde（JSON 序列化）
- reqwest（HTTP 客户端）
- tokio（异步运行时）
- image（图片处理，可选）

**移除：**
- Cloudflare Workers 相关
- Hono 框架
- Better Auth
- Drizzle ORM
- D1 数据库
- R2 存储
- Cloudflare Queue

---

## 📁 项目结构

```
fx-toolbox-desktop/
├── src-tauri/                # Rust 后端
│   ├── src/
│   │   ├── main.rs          # 入口文件
│   │   ├── commands/        # Tauri Commands
│   │   │   ├── mod.rs
│   │   │   ├── config.rs    # 配置管理
│   │   │   ├── image.rs     # 图片处理
│   │   │   ├── openai.rs    # OpenAI 集成
│   │   │   └── wordpress.rs # WordPress 上传
│   │   ├── models/          # 数据模型
│   │   │   ├── mod.rs
│   │   │   ├── config.rs
│   │   │   └── task.rs
│   │   └── utils/           # 工具函数
│   │       ├── mod.rs
│   │       ├── file.rs      # 文件操作
│   │       └── http.rs      # HTTP 客户端
│   ├── Cargo.toml
│   ├── tauri.conf.json      # Tauri 配置
│   └── icons/               # 应用图标
├── src/                     # 前端代码
│   ├── components/
│   │   └── image-optimizer/ # 复用现有组件
│   ├── lib/
│   │   └── tauri-api.ts    # Tauri API 封装
│   ├── types/
│   └── App.tsx             # 主应用
├── docs/
│   └── TAURI_MIGRATION_GUIDE.md
└── package.json
```

---

## 🚀 开发步骤

### 第一步：初始化 Tauri 项目

#### 1. 安装 Tauri CLI

```bash
# 使用 npm/yarn/pnpm
npm install -g @tauri-apps/cli

# 或使用 cargo
cargo install tauri-cli
```

#### 2. 在现有项目中添加 Tauri

```bash
# 在项目根目录执行
cd /path/to/fx-toolbox
npm install -D @tauri-apps/cli
npm install @tauri-apps/api
```

#### 3. 初始化 Tauri

```bash
npx tauri init
```

配置选项：
- App name: `FX Toolbox`
- Window title: `FX Toolbox - 图片优化器`
- Web assets location: `../dist/client`
- Dev server URL: `http://localhost:5173`
- Frontend dev command: `npm run dev`
- Frontend build command: `npm run build:client`

#### 4. 修改 `tauri.conf.json`

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build:client",
    "devPath": "http://localhost:5173",
    "distDir": "../dist/client"
  },
  "package": {
    "productName": "FX Toolbox",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "fs": {
        "all": false,
        "readFile": true,
        "writeFile": true,
        "createDir": true,
        "removeFile": true,
        "scope": ["$APPDATA/*", "$TEMP/*"]
      },
      "dialog": {
        "all": true,
        "open": true,
        "save": true
      },
      "http": {
        "all": false,
        "request": true,
        "scope": [
          "https://api.openai.com/*",
          "https://**"
        ]
      }
    },
    "windows": [
      {
        "title": "FX Toolbox",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ]
  }
}
```

---

### 第二步：配置管理（Rust 后端）

#### 1. 数据模型定义

创建 `src-tauri/src/models/config.rs`：

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub openai: Option<OpenAIConfig>,
    pub wordpress_sites: Vec<WordPressSite>,
    pub image_optimizer: ImageOptimizerConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIConfig {
    pub api_url: String,
    pub api_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordPressSite {
    pub id: String,
    pub site_url: String,
    pub username: String,
    pub app_password: String,
    pub context: Option<String>,
    pub convert_to_webp: Option<bool>,
    pub quality: Option<u8>,
    pub max_width: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageOptimizerConfig {
    pub convert_to_webp: bool,
    pub max_width: u32,
    pub quality: u8,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            openai: None,
            wordpress_sites: Vec::new(),
            image_optimizer: ImageOptimizerConfig {
                convert_to_webp: true,
                max_width: 1920,
                quality: 85,
            },
        }
    }
}
```

#### 2. 配置文件管理

创建 `src-tauri/src/commands/config.rs`：

```rust
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use crate::models::config::AppConfig;

/// 获取配置文件路径
fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app.path_resolver()
        .app_data_dir()
        .ok_or("Failed to get app data directory")?;

    // 确保目录存在
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app directory: {}", e))?;

    Ok(app_dir.join("config.json"))
}

/// 读取配置
#[tauri::command]
pub async fn get_config(app: AppHandle) -> Result<AppConfig, String> {
    let config_path = get_config_path(&app)?;

    if !config_path.exists() {
        return Ok(AppConfig::default());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;

    let config: AppConfig = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config: {}", e))?;

    Ok(config)
}

/// 保存配置
#[tauri::command]
pub async fn save_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    let config_path = get_config_path(&app)?;

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))?;

    Ok(())
}

/// 验证 OpenAI 配置
#[tauri::command]
pub async fn validate_openai_config(api_url: String, api_key: String) -> Result<bool, String> {
    let client = reqwest::Client::new();

    let response = client
        .get(format!("{}/models", api_url.trim_end_matches('/')))
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    Ok(response.status().is_success())
}

/// 验证 WordPress 配置
#[tauri::command]
pub async fn validate_wordpress_config(
    site_url: String,
    username: String,
    app_password: String,
) -> Result<bool, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/wp-json/wp/v2/users/me", site_url.trim_end_matches('/'));

    let response = client
        .get(&url)
        .basic_auth(username, Some(app_password))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    Ok(response.status().is_success())
}
```

#### 3. 添加依赖到 `Cargo.toml`

```toml
[dependencies]
tauri = { version = "1.5", features = ["dialog-all", "fs-all", "http-all"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
reqwest = { version = "0.11", features = ["json"] }
tokio = { version = "1", features = ["full"] }
```

---

### 第三步：图片处理和上传（Rust 后端）

#### 1. 任务模型

创建 `src-tauri/src/models/task.rs`：

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageTask {
    pub id: String,
    pub filename: String,
    pub status: TaskStatus,
    pub error: Option<String>,
    pub progress: TaskProgress,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    Pending,
    Processing,
    Analyzing,
    Uploading,
    Completed,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskProgress {
    pub step: String,
    pub percentage: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub filename: String,
    pub mime_type: String,
    pub original_size: u64,
    pub processed_size: u64,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessImageRequest {
    pub image_data: String, // base64
    pub metadata: ImageMetadata,
    pub target_site_id: String,
}
```

#### 2. OpenAI 集成

创建 `src-tauri/src/commands/openai.rs`：

```rust
use serde::{Deserialize, Serialize};
use crate::models::config::OpenAIConfig;

#[derive(Debug, Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<Message>,
    max_tokens: u32,
}

#[derive(Debug, Serialize)]
struct Message {
    role: String,
    content: Vec<Content>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type")]
enum Content {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "image_url")]
    ImageUrl { image_url: ImageUrl },
}

#[derive(Debug, Serialize)]
struct ImageUrl {
    url: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: ResponseMessage,
}

#[derive(Debug, Deserialize)]
struct ResponseMessage {
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageAnalysis {
    pub title: String,
    pub description: String,
    pub alt_text: String,
    pub tags: Vec<String>,
}

/// 调用 OpenAI Vision API 分析图片
pub async fn analyze_image(
    config: &OpenAIConfig,
    image_base64: &str,
    context: Option<&str>,
) -> Result<ImageAnalysis, String> {
    let client = reqwest::Client::new();

    let system_prompt = format!(
        "你是一个专业的图片分析助手。{}根据图片内容生成适合的标题、描述、Alt文本和标签。\
        请以JSON格式返回：{{\"title\":\"...\",\"description\":\"...\",\"alt_text\":\"...\",\"tags\":[\"...\"]}}",
        context.map(|c| format!("网站背景：{}。", c)).unwrap_or_default()
    );

    let request = OpenAIRequest {
        model: "gpt-4o".to_string(),
        messages: vec![
            Message {
                role: "system".to_string(),
                content: vec![Content::Text { text: system_prompt }],
            },
            Message {
                role: "user".to_string(),
                content: vec![
                    Content::Text {
                        text: "请分析这张图片".to_string(),
                    },
                    Content::ImageUrl {
                        image_url: ImageUrl {
                            url: format!("data:image/jpeg;base64,{}", image_base64),
                        },
                    },
                ],
            },
        ],
        max_tokens: 500,
    };

    let response = client
        .post(format!("{}/chat/completions", config.api_url.trim_end_matches('/')))
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("OpenAI request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("OpenAI API error: {}", error_text));
    }

    let openai_response: OpenAIResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse OpenAI response: {}", e))?;

    let content = openai_response
        .choices
        .first()
        .ok_or("No response from OpenAI")?
        .message
        .content
        .clone();

    // 提取 JSON 内容（可能被包裹在 markdown 代码块中）
    let json_content = if content.contains("```json") {
        content
            .split("```json")
            .nth(1)
            .and_then(|s| s.split("```").next())
            .unwrap_or(&content)
            .trim()
    } else if content.contains("```") {
        content
            .split("```")
            .nth(1)
            .unwrap_or(&content)
            .trim()
    } else {
        content.trim()
    };

    serde_json::from_str(json_content)
        .map_err(|e| format!("Failed to parse analysis result: {}", e))
}
```

#### 3. WordPress 上传

创建 `src-tauri/src/commands/wordpress.rs`：

```rust
use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};
use crate::commands::openai::ImageAnalysis;
use crate::models::config::WordPressSite;

#[derive(Debug, Serialize)]
struct CreateMediaRequest {
    title: String,
    alt_text: String,
    caption: String,
    description: String,
}

#[derive(Debug, Deserialize)]
struct MediaResponse {
    id: u64,
    source_url: String,
}

/// 上传图片到 WordPress
pub async fn upload_to_wordpress(
    site: &WordPressSite,
    image_base64: &str,
    filename: &str,
    analysis: &ImageAnalysis,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    // 解码 base64 图片
    let image_bytes = general_purpose::STANDARD
        .decode(image_base64)
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    // 第一步：上传图片文件
    let upload_url = format!(
        "{}/wp-json/wp/v2/media",
        site.site_url.trim_end_matches('/')
    );

    let form = reqwest::multipart::Form::new()
        .part(
            "file",
            reqwest::multipart::Part::bytes(image_bytes)
                .file_name(filename.to_string())
                .mime_str("image/jpeg")
                .map_err(|e| format!("Invalid mime type: {}", e))?,
        );

    let upload_response = client
        .post(&upload_url)
        .basic_auth(&site.username, Some(&site.app_password))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Upload request failed: {}", e))?;

    if !upload_response.status().is_success() {
        let error_text = upload_response.text().await.unwrap_or_default();
        return Err(format!("WordPress upload failed: {}", error_text));
    }

    let media: MediaResponse = upload_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse upload response: {}", e))?;

    // 第二步：更新媒体元数据
    let update_url = format!(
        "{}/wp-json/wp/v2/media/{}",
        site.site_url.trim_end_matches('/'),
        media.id
    );

    let metadata = CreateMediaRequest {
        title: analysis.title.clone(),
        alt_text: analysis.alt_text.clone(),
        caption: analysis.description.clone(),
        description: analysis.description.clone(),
    };

    client
        .post(&update_url)
        .basic_auth(&site.username, Some(&site.app_password))
        .json(&metadata)
        .send()
        .await
        .map_err(|e| format!("Metadata update failed: {}", e))?;

    Ok(media.source_url)
}
```

#### 4. 主处理流程

创建 `src-tauri/src/commands/image.rs`：

```rust
use tauri::{AppHandle, Window};
use crate::commands::{config::get_config, openai, wordpress};
use crate::models::task::{ImageTask, ProcessImageRequest, TaskStatus};

#[tauri::command]
pub async fn process_image_task(
    app: AppHandle,
    window: Window,
    request: ProcessImageRequest,
) -> Result<String, String> {
    // 1. 读取配置
    let config = get_config(app).await?;

    let openai_config = config.openai
        .as_ref()
        .ok_or("OpenAI configuration not found")?;

    let site = config.wordpress_sites
        .iter()
        .find(|s| s.id == request.target_site_id)
        .ok_or("WordPress site not found")?;

    // 2. 更新状态：分析中
    emit_task_update(&window, &request.metadata.filename, TaskStatus::Analyzing, None);

    // 3. 调用 OpenAI 分析图片
    let analysis = openai::analyze_image(
        openai_config,
        &request.image_data,
        site.context.as_deref(),
    )
    .await
    .map_err(|e| {
        emit_task_update(&window, &request.metadata.filename, TaskStatus::Error, Some(&e));
        e
    })?;

    // 4. 更新状态：上传中
    emit_task_update(&window, &request.metadata.filename, TaskStatus::Uploading, None);

    // 5. 上传到 WordPress
    let media_url = wordpress::upload_to_wordpress(
        site,
        &request.image_data,
        &request.metadata.filename,
        &analysis,
    )
    .await
    .map_err(|e| {
        emit_task_update(&window, &request.metadata.filename, TaskStatus::Error, Some(&e));
        e
    })?;

    // 6. 更新状态：完成
    emit_task_update(&window, &request.metadata.filename, TaskStatus::Completed, None);

    Ok(media_url)
}

/// 发送任务状态更新事件到前端
fn emit_task_update(window: &Window, filename: &str, status: TaskStatus, error: Option<&str>) {
    let _ = window.emit("task-update", TaskUpdate {
        filename: filename.to_string(),
        status,
        error: error.map(|s| s.to_string()),
    });
}

#[derive(Clone, serde::Serialize)]
struct TaskUpdate {
    filename: String,
    status: TaskStatus,
    error: Option<String>,
}
```

#### 5. 注册所有 Commands

修改 `src-tauri/src/main.rs`：

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod utils;

use commands::{config, image};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            config::get_config,
            config::save_config,
            config::validate_openai_config,
            config::validate_wordpress_config,
            image::process_image_task,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

### 第四步：前端适配

#### 1. Tauri API 封装

创建 `src/lib/tauri-api.ts`：

```typescript
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

// 类型定义
export interface AppConfig {
  openai?: {
    apiUrl: string;
    apiKey: string;
  };
  wordpress_sites: WordPressSite[];
  image_optimizer: {
    convertToWebp: boolean;
    maxWidth: number;
    quality: number;
  };
}

export interface WordPressSite {
  id: string;
  site_url: string;
  username: string;
  app_password: string;
  context?: string;
  convert_to_webp?: boolean;
  quality?: number;
  max_width?: number;
}

export interface ProcessImageRequest {
  image_data: string; // base64
  metadata: {
    filename: string;
    mime_type: string;
    original_size: number;
    processed_size: number;
    width: number;
    height: number;
  };
  target_site_id: string;
}

export interface TaskUpdate {
  filename: string;
  status: 'pending' | 'processing' | 'analyzing' | 'uploading' | 'completed' | 'error';
  error?: string;
}

// API 函数
export const tauriApi = {
  // 配置管理
  async getConfig(): Promise<AppConfig> {
    return invoke('get_config');
  },

  async saveConfig(config: AppConfig): Promise<void> {
    return invoke('save_config', { config });
  },

  async validateOpenAI(apiUrl: string, apiKey: string): Promise<boolean> {
    return invoke('validate_openai_config', { apiUrl, apiKey });
  },

  async validateWordPress(
    siteUrl: string,
    username: string,
    appPassword: string
  ): Promise<boolean> {
    return invoke('validate_wordpress_config', {
      siteUrl,
      username,
      appPassword,
    });
  },

  // 图片处理
  async processImage(request: ProcessImageRequest): Promise<string> {
    return invoke('process_image_task', { request });
  },

  // 监听任务更新
  onTaskUpdate(callback: (update: TaskUpdate) => void) {
    return listen<TaskUpdate>('task-update', (event) => {
      callback(event.payload);
    });
  },
};
```

#### 2. 修改现有组件

修改 [src/client/routes/image-optimizer.tsx](src/client/routes/image-optimizer.tsx) 中的 API 调用：

```typescript
// 原来的 fetch 调用
// const response = await fetch("/api/image-optimizer/settings");

// 改为 Tauri invoke
import { tauriApi } from '@/lib/tauri-api';

async function loadSettings() {
  setLoadingSettings(true);
  setSettingsError(null);
  try {
    const data = await tauriApi.getConfig();
    setSettings(data);
    // ... 其他逻辑
  } catch (error) {
    console.error("Failed to load settings", error);
    setSettingsError("无法加载设置，请稍后重试。");
  } finally {
    setLoadingSettings(false);
  }
}

async function handleSaveOpenAI() {
  try {
    // 先验证
    const isValid = await tauriApi.validateOpenAI(
      openaiForm.apiUrl.trim() || "https://api.openai.com",
      openaiForm.apiKey.trim()
    );

    if (!isValid) {
      throw new Error("OpenAI 配置验证失败");
    }

    // 保存配置
    const newConfig = {
      ...settings,
      openai: {
        apiUrl: openaiForm.apiUrl.trim(),
        apiKey: openaiForm.apiKey.trim(),
      },
    };

    await tauriApi.saveConfig(newConfig);
    setSettings(newConfig);
    // ... 成功提示
  } catch (error) {
    // ... 错误处理
  }
}

async function uploadTask(taskId: string, siteId: string) {
  const snapshot = tasksRef.current.find((t) => t.id === taskId);
  if (!snapshot || !snapshot.processed) {
    throw new Error("处理结果不存在，无法上传");
  }

  const processed = snapshot.processed;

  try {
    // 调用 Tauri 后端处理
    const mediaUrl = await tauriApi.processImage({
      image_data: await blobToBase64(processed.processedBlob),
      metadata: {
        filename: snapshot.file.name,
        mime_type: processed.processedBlob.type || snapshot.file.type,
        original_size: processed.originalSize,
        processed_size: processed.processedSize,
        width: processed.processedWidth,
        height: processed.processedHeight,
      },
      target_site_id: siteId,
    });

    console.log("Upload success:", mediaUrl);
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
}

// 监听后端任务更新
useEffect(() => {
  const unlisten = tauriApi.onTaskUpdate((update) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.file.name === update.filename
          ? { ...task, status: update.status, error: update.error }
          : task
      )
    );
  });

  return () => {
    unlisten.then((fn) => fn());
  };
}, []);
```

#### 3. 简化路由

由于是单页应用，可以简化 TanStack Router：

```typescript
// src/App.tsx
import { ImageOptimizer } from './routes/image-optimizer';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ImageOptimizer />
    </div>
  );
}

export default App;
```

---

### 第五步：构建和打包

#### 1. 修改 `package.json` 脚本

```json
{
  "scripts": {
    "dev": "tauri dev",
    "build": "npm run build:client && tauri build",
    "build:client": "vite build --mode client",
    "tauri": "tauri"
  }
}
```

#### 2. 构建应用

```bash
# 开发模式
npm run dev

# 生产构建
npm run build
```

#### 3. 平台特定构建

**Windows:**
```bash
npm run tauri build -- --target x86_64-pc-windows-msvc
```

**macOS (M 系列):**
```bash
npm run tauri build -- --target aarch64-apple-darwin
```

**macOS (Intel):**
```bash
npm run tauri build -- --target x86_64-apple-darwin
```

#### 4. 输出文件位置

- Windows: `src-tauri/target/release/bundle/msi/FX Toolbox_1.0.0_x64_en-US.msi`
- macOS: `src-tauri/target/release/bundle/dmg/FX Toolbox_1.0.0_aarch64.dmg`

---

## 🔧 关键实现细节

### 1. 临时文件管理

在 Rust 中实现自动清理：

```rust
use std::time::SystemTime;

pub async fn cleanup_temp_files(app: &AppHandle) -> Result<(), String> {
    let temp_dir = app.path_resolver()
        .app_cache_dir()
        .ok_or("Failed to get temp directory")?;

    let entries = std::fs::read_dir(temp_dir)
        .map_err(|e| format!("Failed to read temp dir: {}", e))?;

    let now = SystemTime::now();

    for entry in entries.flatten() {
        if let Ok(metadata) = entry.metadata() {
            if let Ok(modified) = metadata.modified() {
                // 删除 1 小时前的文件
                if let Ok(duration) = now.duration_since(modified) {
                    if duration.as_secs() > 3600 {
                        let _ = std::fs::remove_file(entry.path());
                    }
                }
            }
        }
    }

    Ok(())
}

// 在 main.rs 中启动定时清理
use tauri::async_runtime::spawn;
use std::time::Duration;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            spawn(async move {
                loop {
                    tokio::time::sleep(Duration::from_secs(3600)).await;
                    let _ = cleanup_temp_files(&app_handle).await;
                }
            });
            Ok(())
        })
        // ... 其他配置
}
```

### 2. 错误处理最佳实践

```rust
// 自定义错误类型
#[derive(Debug)]
pub enum AppError {
    ConfigError(String),
    NetworkError(String),
    FileSystemError(String),
    ValidationError(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            AppError::ConfigError(msg) => write!(f, "配置错误: {}", msg),
            AppError::NetworkError(msg) => write!(f, "网络错误: {}", msg),
            AppError::FileSystemError(msg) => write!(f, "文件系统错误: {}", msg),
            AppError::ValidationError(msg) => write!(f, "验证错误: {}", msg),
        }
    }
}

// Tauri commands 返回自定义错误
impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.to_string()
    }
}
```

### 3. 性能优化

**并发处理（可选）：**

如果需要同时处理多个任务：

```rust
use futures::future::join_all;

#[tauri::command]
pub async fn process_batch_images(
    app: AppHandle,
    window: Window,
    requests: Vec<ProcessImageRequest>,
) -> Result<Vec<String>, String> {
    let tasks: Vec<_> = requests
        .into_iter()
        .map(|req| process_image_task(app.clone(), window.clone(), req))
        .collect();

    let results = join_all(tasks).await;

    results.into_iter().collect()
}
```

---

## 📝 开发 Checklist

### 阶段一：基础搭建
- [ ] 安装 Rust 和 Tauri CLI
- [ ] 初始化 Tauri 项目
- [ ] 配置 `tauri.conf.json`
- [ ] 测试基本的 Tauri command 调用

### 阶段二：配置系统
- [ ] 实现配置模型（`models/config.rs`）
- [ ] 实现配置读写（`commands/config.rs`）
- [ ] 实现 OpenAI 验证
- [ ] 实现 WordPress 验证
- [ ] 前端适配配置管理

### 阶段三：核心功能
- [ ] 实现 OpenAI Vision API 集成
- [ ] 实现 WordPress 上传功能
- [ ] 实现主处理流程
- [ ] 实现任务状态事件
- [ ] 前端适配图片上传流程

### 阶段四：优化和完善
- [ ] 实现临时文件自动清理
- [ ] 添加错误处理和日志
- [ ] 性能测试和优化
- [ ] UI/UX 调整

### 阶段五：打包和测试
- [ ] Windows 平台构建测试
- [ ] macOS 平台构建测试
- [ ] 端到端功能测试
- [ ] 准备分发包

---

## 🐛 常见问题

### 1. CORS 错误

Tauri 中不存在 CORS 问题，因为 HTTP 请求从 Rust 后端发出。

### 2. 文件路径问题

始终使用 Tauri 的 `PathResolver` 获取路径：

```rust
let app_dir = app.path_resolver().app_data_dir();
let cache_dir = app.path_resolver().app_cache_dir();
```

### 3. OpenAI API 超时

增加超时配置：

```rust
let client = reqwest::Client::builder()
    .timeout(Duration::from_secs(60))
    .build()
    .unwrap();
```

### 4. Windows 构建失败

确保安装了 Visual Studio Build Tools 和 WebView2。

### 5. macOS 代码签名

需要 Apple Developer 账号进行代码签名，否则用户需要手动信任应用。

---

## 📚 参考资源

- [Tauri 官方文档](https://tauri.app/)
- [Rust 官方教程](https://doc.rust-lang.org/book/)
- [Serde JSON 文档](https://docs.rs/serde_json/)
- [Reqwest 文档](https://docs.rs/reqwest/)
- [OpenAI API 文档](https://platform.openai.com/docs/)
- [WordPress REST API 文档](https://developer.wordpress.org/rest-api/)

---

## 🎯 下一步

1. 安装开发环境（Rust + Tauri CLI）
2. 按照本指南逐步实现功能
3. 遇到问题及时沟通调整方案
4. 完成后进行充分测试

祝开发顺利！🚀

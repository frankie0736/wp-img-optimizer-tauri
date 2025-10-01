use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use crate::models::config::AppConfig;
use base64::Engine;

/// 获取配置文件路径
fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

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

/// 验证 WordPress 配置（上传测试图片并删除）
#[tauri::command]
pub async fn validate_wordpress_config(
    site_url: String,
    username: String,
    app_password: String,
) -> Result<bool, String> {
    let client = reqwest::Client::new();

    // 第一步：验证用户权限
    let auth_url = format!("{}/wp-json/wp/v2/users/me", site_url.trim_end_matches('/'));
    let auth_response = client
        .get(&auth_url)
        .basic_auth(&username, Some(&app_password))
        .send()
        .await
        .map_err(|e| format!("Authentication failed: {}", e))?;

    if !auth_response.status().is_success() {
        return Ok(false);
    }

    // 第二步：创建一个 1x1 像素的透明 PNG 图片
    // Base64 编码的 1x1 透明 PNG
    let test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    let image_bytes = base64::engine::general_purpose::STANDARD
        .decode(test_image_base64)
        .map_err(|e| format!("Failed to decode test image: {}", e))?;

    // 第三步：上传测试图片
    let upload_url = format!("{}/wp-json/wp/v2/media", site_url.trim_end_matches('/'));
    let form = reqwest::multipart::Form::new()
        .part(
            "file",
            reqwest::multipart::Part::bytes(image_bytes)
                .file_name("test-validation.png".to_string())
                .mime_str("image/png")
                .map_err(|e| format!("Invalid mime type: {}", e))?,
        );

    let upload_response = client
        .post(&upload_url)
        .basic_auth(&username, Some(&app_password))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Upload test failed: {}", e))?;

    if !upload_response.status().is_success() {
        let error_text = upload_response.text().await.unwrap_or_default();
        return Err(format!("Upload permission denied: {}", error_text));
    }

    // 解析响应获取媒体 ID
    let media_response: serde_json::Value = upload_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let media_id = media_response["id"]
        .as_u64()
        .ok_or("Failed to get media ID")?;

    // 第四步：删除测试图片
    let delete_url = format!(
        "{}/wp-json/wp/v2/media/{}?force=true",
        site_url.trim_end_matches('/'),
        media_id
    );

    let _delete_response = client
        .delete(&delete_url)
        .basic_auth(&username, Some(&app_password))
        .send()
        .await
        .map_err(|e| format!("Failed to delete test image: {}", e))?;

    // 验证成功
    Ok(true)
}

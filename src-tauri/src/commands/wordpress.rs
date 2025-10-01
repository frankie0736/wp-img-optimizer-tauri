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
    _original_filename: &str,
    analysis: &ImageAnalysis,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    // 解码 base64 图片
    let image_bytes = general_purpose::STANDARD
        .decode(image_base64)
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    // 使用 AI 生成的文件名
    let filename = &analysis.filename;

    // 第一步：上传图片文件
    let upload_url = format!(
        "{}/wp-json/wp/v2/media",
        site.site_url.trim_end_matches('/')
    );

    // 根据文件名确定 MIME 类型
    let mime_type = if filename.ends_with(".webp") {
        "image/webp"
    } else if filename.ends_with(".png") {
        "image/png"
    } else {
        "image/jpeg"
    };

    let form = reqwest::multipart::Form::new()
        .part(
            "file",
            reqwest::multipart::Part::bytes(image_bytes)
                .file_name(filename.to_string())
                .mime_str(mime_type)
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

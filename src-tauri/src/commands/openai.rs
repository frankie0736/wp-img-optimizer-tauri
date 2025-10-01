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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageAnalysis {
    pub filename: String,
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
        "You are an SEO assistant. Generate metadata for images in ENGLISH ONLY. All fields (filename, alt, title, caption, description, tags) must be in English. Never use Chinese or other languages. Use lowercase slugs for filenames (e.g., 'sunset-beach-waves.webp'). {}Follow these guidelines:\n\
        - filename: Use lowercase letters, hyphens, 3-5 words, descriptive, end with .webp (40-60 chars)\n\
        - title: Concise, descriptive title (40-60 chars)\n\
        - alt_text: Detailed description for accessibility (100-125 chars)\n\
        - description: Longer description with context (150-200 chars)\n\
        - tags: 5-8 relevant keywords (single words or short phrases)\n\
        Return ONLY valid JSON in this exact format: {{\"filename\":\"...\",\"title\":\"...\",\"description\":\"...\",\"alt_text\":\"...\",\"tags\":[\"...\"]}}",
        context.map(|c| format!("Website context: {}. ", c)).unwrap_or_default()
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
                        text: "Analyze this image and generate SEO metadata in English. Include a descriptive filename slug.".to_string(),
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

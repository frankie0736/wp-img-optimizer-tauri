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

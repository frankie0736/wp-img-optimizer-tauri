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

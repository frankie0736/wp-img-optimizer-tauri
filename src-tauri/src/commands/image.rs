use tauri::{AppHandle, Emitter, Window};
use crate::commands::{config::get_config, openai, wordpress};
use crate::models::task::{ProcessImageRequest, TaskStatus};

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

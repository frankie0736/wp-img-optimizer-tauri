import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// 类型定义
export interface AppConfig {
  openai?: {
    api_url: string;
    api_key: string;
  };
  wordpress_sites: WordPressSite[];
  image_optimizer: {
    convert_to_webp: boolean;
    max_width: number;
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

// 辅助函数：将 Blob 转换为 base64
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // 移除 data:image/...;base64, 前缀
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

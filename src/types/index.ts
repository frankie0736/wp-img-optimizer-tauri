export interface ImageTask {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'analyzing' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  preview?: string;
  result?: {
    url: string;
    originalSize: number;
    processedSize: number;
  };
}

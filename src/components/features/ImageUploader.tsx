import { useState, useRef, useEffect } from "react";
import { Upload, Image as ImageIcon, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { tauriApi, blobToBase64, AppConfig } from "@/lib/tauri-api";
import { processImage, createPreview } from "@/lib/image-processor";
import { generateId, formatBytes } from "@/lib/utils";
import { ImageTask } from "@/types";

interface ImageUploaderProps {
  config: AppConfig;
}

export function ImageUploader({ config }: ImageUploaderProps) {
  const [tasks, setTasks] = useState<ImageTask[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Set default site
    if (config.wordpress_sites.length > 0 && !selectedSiteId) {
      setSelectedSiteId(config.wordpress_sites[0].id);
    }
  }, [config.wordpress_sites, selectedSiteId]);

  useEffect(() => {
    // Listen for task updates from Rust backend
    const unlisten = tauriApi.onTaskUpdate((update) => {
      setTasks((prev) =>
        prev.map((task) =>
          task.file.name === update.filename
            ? {
                ...task,
                status: update.status,
                error: update.error,
                progress: update.status === 'completed' ? 100 :
                         update.status === 'uploading' ? 80 :
                         update.status === 'analyzing' ? 50 : task.progress
              }
            : task
        )
      );
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    if (!config.openai) {
      alert("请先在设置中配置 OpenAI");
      return;
    }

    if (config.wordpress_sites.length === 0) {
      alert("请先在设置中配置至少一个 WordPress 站点");
      return;
    }

    const newTasks: ImageTask[] = [];

    for (let i = 0; i < Math.min(files.length, 50); i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const preview = await createPreview(file);
      const task: ImageTask = {
        id: generateId(),
        file,
        status: 'pending',
        progress: 0,
        preview,
      };

      newTasks.push(task);
    }

    setTasks((prev) => [...prev, ...newTasks]);

    // Process tasks
    for (const task of newTasks) {
      processTask(task);
    }
  }

  async function processTask(task: ImageTask) {
    try {
      // Update status to processing
      updateTaskStatus(task.id, 'processing', 10);

      // Get site config
      const site = config.wordpress_sites.find(s => s.id === selectedSiteId);
      if (!site) {
        throw new Error("未找到选择的站点");
      }

      // Process image (compress/convert)
      const processed = await processImage(task.file, {
        convertToWebp: site.convert_to_webp ?? config.image_optimizer.convert_to_webp,
        quality: site.quality ?? config.image_optimizer.quality,
        maxWidth: site.max_width ?? config.image_optimizer.max_width,
      });

      updateTaskStatus(task.id, 'processing', 30);

      // Convert to base64
      const base64Data = await blobToBase64(processed.blob);

      // Upload to backend (which will analyze with OpenAI and upload to WordPress)
      const mediaUrl = await tauriApi.processImage({
        image_data: base64Data,
        metadata: {
          filename: task.file.name.replace(/\.[^/.]+$/, ".webp"),
          mime_type: processed.blob.type,
          original_size: task.file.size,
          processed_size: processed.blob.size,
          width: processed.width,
          height: processed.height,
        },
        target_site_id: selectedSiteId,
      });

      // Update with result
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: 'completed',
                progress: 100,
                result: {
                  url: mediaUrl,
                  originalSize: task.file.size,
                  processedSize: processed.blob.size,
                },
              }
            : t
        )
      );
    } catch (error) {
      console.error("Task failed:", error);
      updateTaskStatus(task.id, 'error', 0, String(error));
    }
  }

  function updateTaskStatus(
    id: string,
    status: ImageTask['status'],
    progress: number,
    error?: string
  ) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status, progress, error } : t
      )
    );
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragging(false);
      }
      return newCounter;
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);
    handleFiles(e.dataTransfer.files);
  }

  function handleRemoveTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function handleClearCompleted() {
    setTasks((prev) => prev.filter((t) => t.status !== 'completed'));
  }

  const hasActiveTasks = tasks.some((t) =>
    t.status === 'processing' || t.status === 'analyzing' || t.status === 'uploading'
  );

  return (
    <div className="space-y-6">
      {/* Site Selector */}
      {config.wordpress_sites.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <label className="text-sm font-medium mb-2 block">目标 WordPress 站点</label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              disabled={hasActiveTasks}
            >
              {config.wordpress_sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.site_url}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {/* Drop Zone */}
      <Card>
        <CardContent className="pt-6">
          <div
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              transition-colors
              ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
            `}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              拖放图片到此处或点击选择
            </p>
            <p className="text-sm text-muted-foreground">
              支持 JPG、PNG、WebP（一次最多 50 张图片）
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      {tasks.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                上传队列 ({tasks.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCompleted}
                disabled={!tasks.some((t) => t.status === 'completed')}
              >
                清除已完成
              </Button>
            </div>

            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-3 border rounded-lg"
                >
                  {/* Preview */}
                  {task.preview && (
                    <img
                      src={task.preview}
                      alt={task.file.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatBytes(task.file.size)}
                      {task.result && (
                        <span className="ml-2">
                          → {formatBytes(task.result.processedSize)}
                          <span className="text-green-600 ml-1">
                            (-{Math.round((1 - task.result.processedSize / task.result.originalSize) * 100)}%)
                          </span>
                        </span>
                      )}
                    </p>

                    {/* Progress */}
                    {(task.status === 'processing' || task.status === 'analyzing' || task.status === 'uploading') && (
                      <div className="mt-2">
                        <Progress value={task.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {task.status === 'processing' && '处理图片中...'}
                          {task.status === 'analyzing' && 'AI 分析中...'}
                          {task.status === 'uploading' && '上传到 WordPress...'}
                        </p>
                      </div>
                    )}

                    {/* Error */}
                    {task.error && (
                      <p className="text-sm text-red-600 mt-1">{task.error}</p>
                    )}

                    {/* Result URL */}
                    {task.result && (
                      <a
                        href={task.result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline mt-1 block truncate"
                      >
                        {task.result.url}
                      </a>
                    )}
                  </div>

                  {/* Status Icon */}
                  <div>
                    {task.status === 'completed' && (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                    {task.status === 'error' && (
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    )}
                    {(task.status === 'processing' || task.status === 'analyzing' || task.status === 'uploading') && (
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    )}
                    {task.status === 'pending' && (
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  {/* Remove Button */}
                  {(task.status === 'pending' || task.status === 'completed' || task.status === 'error') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTask(task.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

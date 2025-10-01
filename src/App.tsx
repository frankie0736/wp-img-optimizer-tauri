import { useState, useEffect } from "react";
import { Upload, Settings as SettingsIcon, Loader2 } from "lucide-react";
import { tauriApi, AppConfig } from "./lib/tauri-api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { Settings } from "./components/features/Settings";
import { ImageUploader } from "./components/features/ImageUploader";

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const cfg = await tauriApi.getConfig();
      setConfig(cfg);
    } catch (error) {
      console.error("Failed to load config:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleConfigUpdate(newConfig: AppConfig) {
    setConfig(newConfig);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load configuration</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">FX Toolbox</h1>
          <p className="text-muted-foreground">
            WordPress Image Optimizer - AI-powered image processing and upload
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <ImageUploader config={config} />
          </TabsContent>

          <TabsContent value="settings">
            <Settings config={config} onConfigUpdate={handleConfigUpdate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;

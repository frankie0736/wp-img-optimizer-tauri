import { useState } from "react";
import { Settings as SettingsIcon, Plus, Trash2, Check, X, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { tauriApi, AppConfig, WordPressSite } from "@/lib/tauri-api";
import { generateId } from "@/lib/utils";

interface SettingsProps {
  config: AppConfig;
  onConfigUpdate: (config: AppConfig) => void;
}

export function Settings({ config, onConfigUpdate }: SettingsProps) {
  const [openaiUrl, setOpenaiUrl] = useState(config.openai?.api_url || "https://api.openai.com/v1");
  const [openaiKey, setOpenaiKey] = useState(config.openai?.api_key || "");
  const [validatingOpenAI, setValidatingOpenAI] = useState(false);
  const [openaiValid, setOpenaiValid] = useState<boolean | null>(null);

  const [sites, setSites] = useState<WordPressSite[]>(config.wordpress_sites);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [editingSiteData, setEditingSiteData] = useState<Partial<WordPressSite> | null>(null);
  const [newSite, setNewSite] = useState<Partial<WordPressSite> | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleValidateOpenAI() {
    if (!openaiKey.trim()) {
      setMessage("请输入 API 密钥");
      return;
    }

    setValidatingOpenAI(true);
    setOpenaiValid(null);

    try {
      const isValid = await tauriApi.validateOpenAI(openaiUrl, openaiKey);
      setOpenaiValid(isValid);

      if (isValid) {
        // Auto-save on successful validation
        const newConfig: AppConfig = {
          ...config,
          openai: {
            api_url: openaiUrl.trim(),
            api_key: openaiKey.trim(),
          },
          wordpress_sites: sites,
        };

        await tauriApi.saveConfig(newConfig);
        onConfigUpdate(newConfig);
        setMessage("✓ OpenAI 验证并保存成功！");
      } else {
        setMessage("OpenAI 验证失败");
      }
    } catch (error) {
      setOpenaiValid(false);
      setMessage(`验证错误: ${error}`);
    } finally {
      setValidatingOpenAI(false);
    }
  }

  function handleAddSite() {
    setEditingSiteId(null); // Close edit form if open
    setEditingSiteData(null);
    setNewSite({
      id: generateId(),
      site_url: "",
      username: "",
      app_password: "",
      context: "",
      convert_to_webp: true,
      quality: 85,
      max_width: 1920,
    });
  }

  async function handleSaveNewSite() {
    if (!newSite || !newSite.site_url || !newSite.username || !newSite.app_password) {
      setMessage("请填写所有必填字段");
      return;
    }

    setMessage("正在验证 WordPress 站点...");
    setSaving(true);

    try {
      // Validate WordPress connection (will upload and delete test image)
      const isValid = await tauriApi.validateWordPress(
        newSite.site_url.trim(),
        newSite.username.trim(),
        newSite.app_password.trim()
      );

      if (!isValid) {
        setMessage("WordPress 验证失败，请检查您的凭据");
        setSaving(false);
        return;
      }

      // Add site to list
      const newSites = [...sites, newSite as WordPressSite];
      setSites(newSites);

      // Auto-save configuration
      const newConfig: AppConfig = {
        ...config,
        openai: openaiKey.trim() ? {
          api_url: openaiUrl.trim(),
          api_key: openaiKey.trim(),
        } : config.openai,
        wordpress_sites: newSites,
      };

      await tauriApi.saveConfig(newConfig);
      onConfigUpdate(newConfig);

      setNewSite(null);
      setMessage("✓ WordPress 站点验证并保存成功！");
    } catch (error) {
      setMessage(`验证错误: ${error}`);
    } finally {
      setSaving(false);
    }
  }

  function handleEditSite(site: WordPressSite) {
    setEditingSiteId(site.id);
    setEditingSiteData({ ...site });
    setNewSite(null); // Close add form if open
  }

  async function handleSaveEdit() {
    if (!editingSiteData || !editingSiteId) return;

    if (!editingSiteData.site_url || !editingSiteData.username || !editingSiteData.app_password) {
      setMessage("请填写所有必填字段");
      return;
    }

    setMessage("正在验证 WordPress 站点...");
    setSaving(true);

    try {
      // Validate WordPress connection (will upload and delete test image)
      const isValid = await tauriApi.validateWordPress(
        editingSiteData.site_url.trim(),
        editingSiteData.username.trim(),
        editingSiteData.app_password.trim()
      );

      if (!isValid) {
        setMessage("WordPress 验证失败，请检查您的凭据");
        setSaving(false);
        return;
      }

      // Update site in list
      const newSites = sites.map(s => s.id === editingSiteId ? editingSiteData as WordPressSite : s);
      setSites(newSites);

      // Auto-save configuration
      const newConfig: AppConfig = {
        ...config,
        openai: openaiKey.trim() ? {
          api_url: openaiUrl.trim(),
          api_key: openaiKey.trim(),
        } : config.openai,
        wordpress_sites: newSites,
      };

      await tauriApi.saveConfig(newConfig);
      onConfigUpdate(newConfig);

      setEditingSiteId(null);
      setEditingSiteData(null);
      setMessage("✓ WordPress 站点验证并保存成功！");
    } catch (error) {
      setMessage(`验证错误: ${error}`);
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditingSiteId(null);
    setEditingSiteData(null);
  }

  function handleDeleteSite(id: string) {
    setSites(sites.filter(s => s.id !== id));
    setMessage("站点已移除！别忘了保存配置");
  }

  return (
    <div className="space-y-6">
      {/* OpenAI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            OpenAI 配置
          </CardTitle>
          <CardDescription>
            配置 OpenAI API 用于图像分析
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">API URL</label>
            <Input
              type="text"
              value={openaiUrl}
              onChange={(e) => setOpenaiUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">API Key</label>
            <Input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleValidateOpenAI}
              disabled={validatingOpenAI}
              variant="outline"
            >
              {validatingOpenAI ? "验证并保存中..." : "验证并保存"}
            </Button>

            {openaiValid !== null && (
              <div className="flex items-center gap-2">
                {openaiValid ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-red-600" />
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* WordPress Sites */}
      <Card>
        <CardHeader>
          <CardTitle>WordPress 站点</CardTitle>
          <CardDescription>
            管理您的 WordPress 站点以上传图片
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sites.map((site) => (
            <div key={site.id}>
              {editingSiteId === site.id ? (
                // Edit Form
                <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                  <Input
                    placeholder="站点 URL (https://example.com)"
                    value={editingSiteData?.site_url || ""}
                    onChange={(e) => setEditingSiteData({ ...editingSiteData, site_url: e.target.value })}
                  />
                  <Input
                    placeholder="用户名"
                    value={editingSiteData?.username || ""}
                    onChange={(e) => setEditingSiteData({ ...editingSiteData, username: e.target.value })}
                  />
                  <Input
                    type="password"
                    placeholder="应用密码"
                    value={editingSiteData?.app_password || ""}
                    onChange={(e) => setEditingSiteData({ ...editingSiteData, app_password: e.target.value })}
                  />
                  <Input
                    placeholder="上下文（可选，例如：'专注于亚洲美食和风景的旅游博客'）"
                    value={editingSiteData?.context || ""}
                    onChange={(e) => setEditingSiteData({ ...editingSiteData, context: e.target.value })}
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">转换为 WebP</label>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={editingSiteData?.convert_to_webp ? "true" : "false"}
                        onChange={(e) => setEditingSiteData({ ...editingSiteData, convert_to_webp: e.target.value === "true" })}
                      >
                        <option value="true">是</option>
                        <option value="false">否</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">质量 (1-100)</label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={editingSiteData?.quality || 85}
                        onChange={(e) => setEditingSiteData({ ...editingSiteData, quality: parseInt(e.target.value) || 85 })}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">最大宽度 (px)</label>
                      <Input
                        type="number"
                        min="100"
                        max="4000"
                        value={editingSiteData?.max_width || 1920}
                        onChange={(e) => setEditingSiteData({ ...editingSiteData, max_width: parseInt(e.target.value) || 1920 })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdit} size="sm">
                      <Check className="w-4 h-4 mr-1" />
                      保存更改
                    </Button>
                    <Button onClick={handleCancelEdit} variant="outline" size="sm">
                      <X className="w-4 h-4 mr-1" />
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                // Display View
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{site.site_url}</p>
                      <p className="text-sm text-muted-foreground">用户: {site.username}</p>
                      {site.context && (
                        <p className="text-sm text-muted-foreground mt-1">上下文: {site.context}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>WebP: {site.convert_to_webp ? '✓' : '✗'}</span>
                        <span>质量: {site.quality || 85}</span>
                        <span>最大宽度: {site.max_width || 1920}px</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditSite(site)}
                        title="编辑站点"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSite(site.id)}
                        title="删除站点"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {newSite && (
            <div className="border rounded-lg p-4 space-y-3">
              <Input
                placeholder="站点 URL (https://example.com)"
                value={newSite.site_url || ""}
                onChange={(e) => setNewSite({ ...newSite, site_url: e.target.value })}
              />
              <Input
                placeholder="用户名"
                value={newSite.username || ""}
                onChange={(e) => setNewSite({ ...newSite, username: e.target.value })}
              />
              <Input
                type="password"
                placeholder="应用密码"
                value={newSite.app_password || ""}
                onChange={(e) => setNewSite({ ...newSite, app_password: e.target.value })}
              />
              <Input
                placeholder="上下文（可选，例如：'专注于亚洲美食和风景的旅游博客'）"
                value={newSite.context || ""}
                onChange={(e) => setNewSite({ ...newSite, context: e.target.value })}
              />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">转换为 WebP</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newSite.convert_to_webp ? "true" : "false"}
                    onChange={(e) => setNewSite({ ...newSite, convert_to_webp: e.target.value === "true" })}
                  >
                    <option value="true">是</option>
                    <option value="false">否</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">质量 (1-100)</label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={newSite.quality || 85}
                    onChange={(e) => setNewSite({ ...newSite, quality: parseInt(e.target.value) || 85 })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">最大宽度 (px)</label>
                  <Input
                    type="number"
                    min="100"
                    max="4000"
                    value={newSite.max_width || 1920}
                    onChange={(e) => setNewSite({ ...newSite, max_width: parseInt(e.target.value) || 1920 })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveNewSite} size="sm">
                  <Check className="w-4 h-4 mr-1" />
                  保存站点
                </Button>
                <Button onClick={() => setNewSite(null)} variant="outline" size="sm">
                  <X className="w-4 h-4 mr-1" />
                  取消
                </Button>
              </div>
            </div>
          )}

          {!newSite && (
            <Button onClick={handleAddSite} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              添加 WordPress 站点
            </Button>
          )}
        </CardContent>
      </Card>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes("success") || message.includes("valid")
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
        }`}>
          {message}
        </div>
      )}

      {/* About */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">FX Toolbox v0.2.0</p>
            <p>开发者: <span className="font-medium">Frankie徐</span></p>
            <p>联系方式: <a href="mailto:tsuicx@qq.com" className="text-primary hover:underline">tsuicx@qq.com</a></p>
            <p className="text-xs pt-2">
              © 2025 Frankie徐. Licensed under MIT License.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

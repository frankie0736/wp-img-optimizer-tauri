import { useState } from "react";
import { Settings as SettingsIcon, Save, Plus, Trash2, Check, X, Edit } from "lucide-react";
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
      setMessage("Please enter API key");
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
        setMessage("✓ OpenAI validated and saved successfully!");
      } else {
        setMessage("OpenAI validation failed");
      }
    } catch (error) {
      setOpenaiValid(false);
      setMessage(`Validation error: ${error}`);
    } finally {
      setValidatingOpenAI(false);
    }
  }

  async function handleSaveConfig() {
    setSaving(true);
    setMessage("");

    try {
      const newConfig: AppConfig = {
        ...config,
        openai: openaiKey.trim() ? {
          api_url: openaiUrl.trim(),
          api_key: openaiKey.trim(),
        } : undefined,
        wordpress_sites: sites,
      };

      await tauriApi.saveConfig(newConfig);
      onConfigUpdate(newConfig);
      setMessage("Configuration saved successfully!");
    } catch (error) {
      setMessage(`Failed to save: ${error}`);
    } finally {
      setSaving(false);
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
      setMessage("Please fill in all required fields");
      return;
    }

    setMessage("Validating WordPress site...");
    setSaving(true);

    try {
      // Validate WordPress connection (will upload and delete test image)
      const isValid = await tauriApi.validateWordPress(
        newSite.site_url.trim(),
        newSite.username.trim(),
        newSite.app_password.trim()
      );

      if (!isValid) {
        setMessage("WordPress validation failed. Please check your credentials.");
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
      setMessage("✓ WordPress site validated and saved successfully!");
    } catch (error) {
      setMessage(`Validation error: ${error}`);
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
      setMessage("Please fill in all required fields");
      return;
    }

    setMessage("Validating WordPress site...");
    setSaving(true);

    try {
      // Validate WordPress connection (will upload and delete test image)
      const isValid = await tauriApi.validateWordPress(
        editingSiteData.site_url.trim(),
        editingSiteData.username.trim(),
        editingSiteData.app_password.trim()
      );

      if (!isValid) {
        setMessage("WordPress validation failed. Please check your credentials.");
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
      setMessage("✓ WordPress site validated and saved successfully!");
    } catch (error) {
      setMessage(`Validation error: ${error}`);
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
    setMessage("Site removed! Don't forget to save configuration.");
  }

  return (
    <div className="space-y-6">
      {/* OpenAI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            OpenAI Configuration
          </CardTitle>
          <CardDescription>
            Configure OpenAI API for image analysis
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
              {validatingOpenAI ? "Validating..." : "Validate"}
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
          <CardTitle>WordPress Sites</CardTitle>
          <CardDescription>
            Manage your WordPress sites for image upload
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sites.map((site) => (
            <div key={site.id}>
              {editingSiteId === site.id ? (
                // Edit Form
                <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                  <Input
                    placeholder="Site URL (https://example.com)"
                    value={editingSiteData?.site_url || ""}
                    onChange={(e) => setEditingSiteData({ ...editingSiteData, site_url: e.target.value })}
                  />
                  <Input
                    placeholder="Username"
                    value={editingSiteData?.username || ""}
                    onChange={(e) => setEditingSiteData({ ...editingSiteData, username: e.target.value })}
                  />
                  <Input
                    type="password"
                    placeholder="Application Password"
                    value={editingSiteData?.app_password || ""}
                    onChange={(e) => setEditingSiteData({ ...editingSiteData, app_password: e.target.value })}
                  />
                  <Input
                    placeholder="Context (optional, e.g., 'A travel blog focused on Asian cuisine and scenery')"
                    value={editingSiteData?.context || ""}
                    onChange={(e) => setEditingSiteData({ ...editingSiteData, context: e.target.value })}
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Convert to WebP</label>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={editingSiteData?.convert_to_webp ? "true" : "false"}
                        onChange={(e) => setEditingSiteData({ ...editingSiteData, convert_to_webp: e.target.value === "true" })}
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Quality (1-100)</label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={editingSiteData?.quality || 85}
                        onChange={(e) => setEditingSiteData({ ...editingSiteData, quality: parseInt(e.target.value) || 85 })}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Max Width (px)</label>
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
                      Save Changes
                    </Button>
                    <Button onClick={handleCancelEdit} variant="outline" size="sm">
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // Display View
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{site.site_url}</p>
                      <p className="text-sm text-muted-foreground">User: {site.username}</p>
                      {site.context && (
                        <p className="text-sm text-muted-foreground mt-1">Context: {site.context}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>WebP: {site.convert_to_webp ? '✓' : '✗'}</span>
                        <span>Quality: {site.quality || 85}</span>
                        <span>Max Width: {site.max_width || 1920}px</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditSite(site)}
                        title="Edit site"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSite(site.id)}
                        title="Delete site"
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
                placeholder="Site URL (https://example.com)"
                value={newSite.site_url || ""}
                onChange={(e) => setNewSite({ ...newSite, site_url: e.target.value })}
              />
              <Input
                placeholder="Username"
                value={newSite.username || ""}
                onChange={(e) => setNewSite({ ...newSite, username: e.target.value })}
              />
              <Input
                type="password"
                placeholder="Application Password"
                value={newSite.app_password || ""}
                onChange={(e) => setNewSite({ ...newSite, app_password: e.target.value })}
              />
              <Input
                placeholder="Context (optional, e.g., 'A travel blog focused on Asian cuisine and scenery')"
                value={newSite.context || ""}
                onChange={(e) => setNewSite({ ...newSite, context: e.target.value })}
              />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Convert to WebP</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newSite.convert_to_webp ? "true" : "false"}
                    onChange={(e) => setNewSite({ ...newSite, convert_to_webp: e.target.value === "true" })}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Quality (1-100)</label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={newSite.quality || 85}
                    onChange={(e) => setNewSite({ ...newSite, quality: parseInt(e.target.value) || 85 })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Max Width (px)</label>
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
                  Save Site
                </Button>
                <Button onClick={() => setNewSite(null)} variant="outline" size="sm">
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!newSite && (
            <Button onClick={handleAddSite} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add WordPress Site
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSaveConfig} disabled={saving} className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>

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
            <p className="font-medium text-foreground">FX Toolbox v0.1.0</p>
            <p>Developed by <span className="font-medium">Frankie徐</span></p>
            <p>Contact: <a href="mailto:tsuicx@qq.com" className="text-primary hover:underline">tsuicx@qq.com</a></p>
            <p className="text-xs pt-2">
              © 2025 Frankie徐. Licensed under MIT License.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

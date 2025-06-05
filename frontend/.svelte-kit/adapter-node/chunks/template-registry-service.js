import { b as browser } from "./index5.js";
class TemplateRegistryService {
  cache = /* @__PURE__ */ new Map();
  defaultCacheTtl = 3600;
  // 1 hour
  async fetchRegistry(config) {
    try {
      const cached = this.cache.get(config.url);
      const now = Date.now();
      const ttl = (config.cache_ttl || this.defaultCacheTtl) * 1e3;
      if (cached && now - cached.timestamp < ttl) {
        return cached.data;
      }
      let registry;
      if (browser) ;
      else {
        const response = await fetch(config.url, {
          headers: {
            "User-Agent": "Arcane-Template-Registry/1.0",
            Accept: "application/json"
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch registry: ${response.statusText}`);
        }
        registry = await response.json();
      }
      this.validateRegistry(registry);
      this.cache.set(config.url, { data: registry, timestamp: now });
      return registry;
    } catch (error) {
      console.error(`Error fetching template registry from ${config.url}:`, error);
      return null;
    }
  }
  async fetchTemplateContent(template) {
    try {
      if (browser) ;
      else {
        const response = await fetch(template.compose_url, {
          headers: {
            "User-Agent": "Arcane-Template-Registry/1.0",
            Accept: "text/plain, application/x-yaml, text/yaml, */*"
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch template content: ${response.statusText}`);
        }
        return await response.text();
      }
    } catch (error) {
      console.error(`Error fetching template content from ${template.compose_url}:`, error);
      return null;
    }
  }
  async fetchEnvContent(envUrl) {
    try {
      if (browser) ;
      else {
        const response = await fetch(envUrl, {
          headers: {
            "User-Agent": "Arcane-Template-Registry/1.0",
            Accept: "text/plain, */*"
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch environment content: ${response.statusText}`);
        }
        return await response.text();
      }
    } catch (error) {
      console.error(`Error fetching environment content from ${envUrl}:`, error);
      return null;
    }
  }
  convertToComposeTemplate(remote, registryName) {
    return {
      id: `${registryName}:${remote.id}`,
      name: remote.name,
      description: remote.description,
      content: "",
      // Will be loaded on demand
      isCustom: true,
      isRemote: true,
      metadata: {
        version: remote.version,
        author: remote.author,
        tags: remote.tags,
        registry: registryName,
        remoteUrl: remote.compose_url,
        envUrl: remote.env_url,
        documentationUrl: remote.documentation_url,
        iconUrl: remote.icon_url,
        updatedAt: remote.updated_at
      }
    };
  }
  validateRegistry(registry) {
    if (!registry.name || !registry.version || !Array.isArray(registry.templates)) {
      throw new Error("Invalid registry format");
    }
    for (const template of registry.templates) {
      if (!template.id || !template.name || !template.compose_url) {
        throw new Error(`Invalid template format: ${template.id}`);
      }
    }
  }
  clearCache() {
    this.cache.clear();
  }
}
const templateRegistryService = new TemplateRegistryService();
export {
  templateRegistryService as t
};

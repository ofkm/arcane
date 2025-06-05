import { promises } from 'node:fs';
import * as path from 'node:path';
import { t as templateRegistryService } from './template-registry-service-CoCZP6pF.js';
import { g as getSettings, s as saveSettings } from './settings-service-B1w8bfJq.js';

class TemplateService {
  static templatesDir = path.join(process.cwd(), "data/templates");
  static composeTemplatesDir = path.join(this.templatesDir, "compose");
  static envTemplateFile = path.join(this.templatesDir, ".env.template");
  /**
   * Get all available compose templates from the file system
   */
  static async getComposeTemplates() {
    try {
      await this.ensureDirectoriesExist();
      const files = await promises.readdir(this.composeTemplatesDir);
      const yamlFiles = files.filter((file) => (file.endsWith(".yaml") || file.endsWith(".yml")) && !file.startsWith("."));
      const templates = [];
      for (const file of yamlFiles) {
        const filePath = path.join(this.composeTemplatesDir, file);
        const content = await promises.readFile(filePath, "utf8");
        const id = path.basename(file, path.extname(file));
        const description = this.extractDescriptionFromFile(content);
        const envContent = await this.loadTemplateEnvFile(id);
        templates.push({
          id,
          name: this.formatTemplateName(id),
          description: description || "Custom Docker Compose template",
          content,
          envContent,
          isCustom: true,
          isRemote: false
        });
      }
      return templates.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("Error loading compose templates:", error);
      return [];
    }
  }
  /**
   * Load environment file for a specific template
   */
  static async loadTemplateEnvFile(templateId) {
    const envPath = path.join(this.composeTemplatesDir, `${templateId}.env`);
    try {
      return await promises.readFile(envPath, "utf8");
    } catch (error) {
      return void 0;
    }
  }
  /**
   * Get the .env template content if it exists
   */
  static async getEnvTemplate() {
    try {
      await this.ensureDirectoriesExist();
      return await promises.readFile(this.envTemplateFile, "utf8");
    } catch (error) {
      console.log("No .env template found, using default");
      return this.getDefaultEnvTemplate();
    }
  }
  /**
   * Create a new template from content
   */
  static async createTemplate(name, content, description, envContent) {
    if (!name || name.trim() === "") {
      throw new Error("Template name cannot be empty");
    }
    if (!content || content.trim() === "") {
      throw new Error("Template content cannot be empty");
    }
    const trimmedContent = content.trim();
    if (!trimmedContent.startsWith("version:") && !trimmedContent.startsWith("services:")) {
      console.warn("Template content may not be valid Docker Compose YAML - missing version or services section");
    }
    await this.ensureDirectoriesExist();
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9\s-_]/g, "").replace(/\s+/g, "-").replace(/[-_]+/g, "-").replace(/^-+|-+$/g, "");
    if (!sanitizedName) {
      throw new Error("Template name contains no valid characters");
    }
    const baseFilename = sanitizedName;
    let filename = `${baseFilename}.yaml`;
    let envFilename = `${baseFilename}.env`;
    let counter = 1;
    while (await this.fileExists(path.join(this.composeTemplatesDir, filename))) {
      filename = `${baseFilename}-${counter}.yaml`;
      envFilename = `${baseFilename}-${counter}.env`;
      counter++;
    }
    const filePath = path.join(this.composeTemplatesDir, filename);
    let fileContent = content;
    if (description && description.trim()) {
      const descriptionLines = description.trim().split("\n");
      const commentBlock = descriptionLines.map((line) => `# ${line}`).join("\n");
      fileContent = `${commentBlock}
#
${content}`;
    }
    await promises.writeFile(filePath, fileContent, "utf8");
    if (envContent && envContent.trim()) {
      const envFilePath = path.join(this.composeTemplatesDir, envFilename);
      if (!await this.fileExists(envFilePath)) {
        await promises.writeFile(envFilePath, envContent, "utf8");
      }
    }
  }
  /**
   * Helper method to check if a file exists
   */
  static async fileExists(filePath) {
    try {
      await promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Delete a template
   */
  static async deleteTemplate(id) {
    const possibleExtensions = [".yaml", ".yml"];
    let deleted = false;
    for (const ext of possibleExtensions) {
      const filePath = path.join(this.composeTemplatesDir, `${id}${ext}`);
      try {
        await promises.unlink(filePath);
        deleted = true;
        break;
      } catch (error) {
      }
    }
    try {
      const envFilePath = path.join(this.composeTemplatesDir, `${id}.env`);
      await promises.unlink(envFilePath);
    } catch (error) {
    }
    if (!deleted) {
      throw new Error(`Template with id "${id}" not found`);
    }
  }
  /**
   * Get template directory path for users to add their own templates
   */
  static getTemplateDirectoryPath() {
    return this.composeTemplatesDir;
  }
  /**
   * Get env template file path
   */
  static getEnvTemplateFilePath() {
    return this.envTemplateFile;
  }
  /**
   * Ensure template directories exist
   */
  static async ensureDirectoriesExist() {
    try {
      await promises.mkdir(this.templatesDir, { recursive: true });
      await promises.mkdir(this.composeTemplatesDir, { recursive: true });
      const readmePath = path.join(this.templatesDir, "README.md");
      try {
        await promises.access(readmePath);
      } catch {
        await this.createReadmeFile();
      }
    } catch (error) {
      console.error("Error ensuring template directories exist:", error);
    }
  }
  /**
   * Create a helpful README file for users
   */
  static async createReadmeFile() {
    const readmeContent = `# Arcane Templates

This directory contains templates for creating Docker Compose stacks.

## Directory Structure

- \`compose/\` - Docker Compose template files (.yaml or .yml)
- \`.env.template\` - Default environment variables template

## Adding Templates

1. **Local Templates**: Place your Docker Compose files in the \`compose/\` directory
   - Use \`.yaml\` or \`.yml\` extension
   - Optionally add a matching \`.env\` file with the same name (e.g., \`my-app.yaml\` and \`my-app.env\`)
   - Add a comment at the top to describe the template:
     \`\`\`yaml
     # My Custom Application Stack
     services:
       app:
         image: nginx:alpine
         # ... rest of your compose file
     \`\`\`

2. **Template Environment Files**: Create \`.env\` files alongside your templates
   - File name should match your template: \`wordpress.yaml\` → \`wordpress.env\`
   - These will be loaded automatically when the template is selected
   - Example structure:
     \`\`\`
     compose/
     ├── wordpress.yaml
     ├── wordpress.env
     ├── nextjs.yaml
     └── nextjs.env
     \`\`\`

3. **Remote Templates**: Configure remote registries in the Template Settings page
   - Access community-maintained templates
   - Automatically synced from registry sources
   - Can include both compose and environment files

4. **Environment Template**: Create or edit \`.env.template\` to set default environment variables
   - This will be used as fallback when templates don't provide their own environment
   - Use KEY=value format

## Template Naming

- File names will be converted to display names
- \`my-web-app.yaml\` becomes "My Web App"
- Use hyphens or underscores to separate words

## Example Templates

You can find example templates in community registries or create your own:
- wordpress.yaml + wordpress.env - WordPress with MySQL
- nextjs.yaml + nextjs.env - Next.js application
- postgres.yaml + postgres.env - PostgreSQL database

All templates added here will automatically appear in the Arcane UI when creating new stacks.
`;
    await promises.writeFile(path.join(this.templatesDir, "README.md"), readmeContent, "utf8");
  }
  /**
   * Extract description from file comment
   */
  static extractDescriptionFromFile(content) {
    const lines = content.split("\n");
    const firstLine = lines[0]?.trim();
    if (firstLine?.startsWith("#")) {
      return firstLine.substring(1).trim();
    }
    return null;
  }
  /**
   * Format template name for display
   */
  static formatTemplateName(id) {
    return id.split(/[-_]/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }
  /**
   * Get default .env template content
   */
  static getDefaultEnvTemplate() {
    return `# Environment Variables
# These variables will be available to your stack services
# Format: VARIABLE_NAME=value

# Web Server Configuration
NGINX_HOST=localhost
NGINX_PORT=80

# Database Configuration
POSTGRES_DB=myapp
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_PORT=5432

# Example Additional Variables
# API_KEY=your_api_key_here
# SECRET_KEY=your_secret_key_here
# DEBUG=false
`;
  }
  /**
   * Load all templates (local and remote)
   */
  async loadAllTemplates() {
    const templates = [];
    templates.push(...await this.loadLocalTemplates());
    templates.push(...await this.loadRemoteTemplates());
    return templates;
  }
  /**
   * Load local templates from the file system
   */
  async loadLocalTemplates() {
    try {
      await TemplateService.ensureDirectoriesExist();
      const files = await promises.readdir(TemplateService.composeTemplatesDir);
      const yamlFiles = files.filter((file) => (file.endsWith(".yaml") || file.endsWith(".yml")) && !file.startsWith("."));
      const templates = [];
      for (const file of yamlFiles) {
        const filePath = path.join(TemplateService.composeTemplatesDir, file);
        const content = await promises.readFile(filePath, "utf8");
        const id = path.basename(file, path.extname(file));
        const description = TemplateService.extractDescriptionFromFile(content);
        const envContent = await TemplateService.loadTemplateEnvFile(id);
        templates.push({
          id,
          name: TemplateService.formatTemplateName(id),
          description: description || "Custom Docker Compose template",
          content,
          envContent,
          isCustom: true,
          isRemote: false
        });
      }
      return templates.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("Error loading local templates:", error);
      return [];
    }
  }
  /**
   * Load remote templates
   */
  async loadRemoteTemplates() {
    const templates = [];
    const settings = await getSettings();
    const registryConfigs = settings.templateRegistries || [];
    for (const config of registryConfigs) {
      if (!config.enabled) continue;
      const registry = await templateRegistryService.fetchRegistry(config);
      if (!registry) continue;
      for (const remoteTemplate of registry.templates) {
        const template = templateRegistryService.convertToComposeTemplate(remoteTemplate, config.name);
        templates.push(template);
      }
    }
    return templates;
  }
  /**
   * Load template content and environment
   */
  async loadTemplateContent(template) {
    if (template.isRemote && template.metadata?.remoteUrl) {
      const content = await templateRegistryService.fetchTemplateContent({
        id: template.id,
        name: template.name,
        description: template.description,
        version: template.metadata.version || "1.0.0",
        compose_url: template.metadata.remoteUrl,
        env_url: template.metadata.envUrl,
        updated_at: template.metadata.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
      });
      let envContent;
      if (template.metadata.envUrl) {
        try {
          envContent = await templateRegistryService.fetchEnvContent(template.metadata.envUrl) || void 0;
        } catch (error) {
          if (error instanceof Error && !error.message.includes("404") && !error.message.includes("Not Found")) {
            console.error("Error fetching env content:", error);
          }
          envContent = void 0;
        }
      }
      return {
        content: content || template.content,
        envContent: envContent || template.envContent
      };
    }
    return {
      content: template.content,
      envContent: template.envContent
    };
  }
  /**
   * Load just the compose content for a template (without env file)
   */
  async loadComposeContent(template) {
    if (!template.isRemote) {
      return template.content;
    }
    if (!template.metadata?.remoteUrl) {
      throw new Error("Remote template missing compose URL");
    }
    const remoteTemplate = {
      id: template.id,
      name: template.name,
      description: template.description,
      version: template.metadata.version || "1.0.0",
      compose_url: template.metadata.remoteUrl,
      env_url: template.metadata.envUrl,
      updated_at: template.metadata.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    const content = await templateRegistryService.fetchTemplateContent(remoteTemplate);
    if (!content) {
      throw new Error("Failed to fetch template content");
    }
    return content;
  }
  /**
   * Add a registry configuration
   */
  async addRegistry(config) {
    const settings = await getSettings();
    settings.templateRegistries = settings.templateRegistries || [];
    const isDuplicate = settings.templateRegistries.some((existingRegistry) => existingRegistry.url === config.url);
    if (!isDuplicate) {
      settings.templateRegistries.push(config);
    }
    await saveSettings(settings);
  }
  /**
   * Remove a registry configuration
   */
  async removeRegistry(url) {
    const settings = await getSettings();
    settings.templateRegistries = (settings.templateRegistries || []).filter((c) => c.url !== url);
    await saveSettings(settings);
  }
  /**
   * Update a registry configuration
   */
  async updateRegistry(url, updates) {
    const settings = await getSettings();
    const registryIndex = (settings.templateRegistries || []).findIndex((c) => c.url === url);
    if (registryIndex !== -1) {
      settings.templateRegistries[registryIndex] = {
        ...settings.templateRegistries[registryIndex],
        ...updates
      };
      await saveSettings(settings);
    }
  }
  /**
   * Get all registry configurations
   */
  async getRegistries() {
    const settings = await getSettings();
    return settings.templateRegistries || [];
  }
}

export { TemplateService as T };
//# sourceMappingURL=template-service-CSNZG-20.js.map

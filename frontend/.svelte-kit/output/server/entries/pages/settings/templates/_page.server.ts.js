import { T as TemplateService } from "../../../../chunks/template-service.js";
import { g as getSettings } from "../../../../chunks/settings-service.js";
import "../../../../chunks/index.js";
const load = async () => {
  try {
    const templateService = new TemplateService();
    const settings = await getSettings();
    const templates = await templateService.loadAllTemplates();
    const localTemplateCount = templates.filter((t) => !t.isRemote).length;
    const remoteTemplateCount = templates.filter((t) => t.isRemote).length;
    return {
      settings,
      localTemplateCount,
      remoteTemplateCount
    };
  } catch (error) {
    console.error("Error loading template settings:", error);
    const fallbackSettings = await getSettings();
    return {
      settings: fallbackSettings,
      localTemplateCount: 0,
      remoteTemplateCount: 0,
      error: error instanceof Error ? error.message : "Failed to load template data"
    };
  }
};
export {
  load
};

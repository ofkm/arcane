import { j as json, e as error } from "../../../../../chunks/index.js";
import { T as TemplateService } from "../../../../../chunks/template-service.js";
const templateService = new TemplateService();
const GET = async () => {
  try {
    const [allTemplates, registries] = await Promise.all([templateService.loadAllTemplates(), templateService.getRegistries()]);
    const localTemplates = allTemplates.filter((t) => !t.isRemote);
    const remoteTemplates = allTemplates.filter((t) => t.isRemote);
    const stats = {
      total: allTemplates.length,
      local: localTemplates.length,
      remote: remoteTemplates.length,
      registries: registries.length,
      enabledRegistries: registries.filter((r) => r.enabled).length,
      templatesWithEnv: allTemplates.filter((t) => t.envContent || t.metadata?.envUrl).length
    };
    return json(stats);
  } catch (err) {
    console.error("Error fetching template stats:", err);
    return error(500, { message: "Failed to fetch template statistics" });
  }
};
export {
  GET
};

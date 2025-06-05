import { j as json, e as error } from "../../../../../chunks/index.js";
import { T as TemplateService } from "../../../../../chunks/template-service.js";
import { t as templateRegistryService } from "../../../../../chunks/template-registry-service.js";
const templateService = new TemplateService();
const GET = async () => {
  try {
    const registries = await templateService.getRegistries();
    return json(registries);
  } catch (err) {
    console.error("Error fetching registries:", err);
    return error(500, { message: "Failed to fetch registries" });
  }
};
const POST = async ({ request }) => {
  try {
    const config = await request.json();
    if (!config.url || !config.name) {
      return error(400, { message: "URL and name are required" });
    }
    const registry = await templateRegistryService.fetchRegistry(config);
    if (!registry) {
      return error(400, { message: "Failed to fetch registry or invalid format" });
    }
    await templateService.addRegistry(config);
    return json({
      success: true,
      message: "Registry added successfully",
      registry: config
    });
  } catch (err) {
    console.error("Error adding registry:", err);
    return error(500, { message: "Failed to add registry" });
  }
};
export {
  GET,
  POST
};

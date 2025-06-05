import { e as error, j as json } from "../../../../../chunks/index.js";
import { T as TemplateService } from "../../../../../chunks/template-service.js";
const GET = async ({ params }) => {
  try {
    const { id } = params;
    const templates = await TemplateService.getComposeTemplates();
    const template = templates.find((t) => t.id === id);
    if (!template) {
      return error(404, { message: "Template not found" });
    }
    return json(template);
  } catch (err) {
    console.error("Error fetching template:", err);
    return error(500, { message: "Failed to fetch template" });
  }
};
const PUT = async ({ params, request }) => {
  try {
    const { id } = params;
    const { name, content, description, envContent } = await request.json();
    if (!name || !content) {
      return error(400, { message: "Name and content are required" });
    }
    await TemplateService.deleteTemplate(id);
    await TemplateService.createTemplate(name, content, description, envContent);
    return json({
      success: true,
      message: "Template updated successfully"
    });
  } catch (err) {
    console.error("Error updating template:", err);
    return error(500, { message: "Failed to update template" });
  }
};
const DELETE = async ({ params }) => {
  try {
    const { id } = params;
    await TemplateService.deleteTemplate(id);
    return json({
      success: true,
      message: "Template deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting template:", err);
    return error(500, { message: "Failed to delete template" });
  }
};
export {
  DELETE,
  GET,
  PUT
};

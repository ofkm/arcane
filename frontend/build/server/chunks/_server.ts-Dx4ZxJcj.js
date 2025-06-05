import { e as error, j as json } from './index-Ddp2AB5f.js';
import { T as TemplateService } from './template-service-CSNZG-20.js';
import 'node:fs';
import 'node:path';
import './template-registry-service-CoCZP6pF.js';
import './index5-HpJcNJHQ.js';
import './false-CRHihH2U.js';
import './settings-service-B1w8bfJq.js';
import 'proper-lockfile';
import './encryption-service-C1I869gF.js';
import 'node:crypto';
import 'node:fs/promises';
import 'node:util';
import './schema-CDkq0ub_.js';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './settings-db-service-DyTlfQVT.js';
import './index4-SoK3Vczo.js';

const templateService = new TemplateService();
const GET = async ({ params }) => {
  try {
    const { id } = params;
    const templates = await templateService.loadAllTemplates();
    const template = templates.find((t) => t.id === id);
    if (!template) {
      return error(404, { message: "Template not found" });
    }
    const templateContent = await templateService.loadTemplateContent(template);
    return json({
      id: template.id,
      name: template.name,
      description: template.description,
      content: templateContent.content,
      envContent: templateContent.envContent,
      isRemote: template.isRemote,
      metadata: template.metadata
    });
  } catch (err) {
    console.error("Error fetching template content:", err);
    return error(500, { message: "Failed to fetch template content" });
  }
};

export { GET };
//# sourceMappingURL=_server.ts-Dx4ZxJcj.js.map

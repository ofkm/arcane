import { j as json, e as error } from './index-Ddp2AB5f.js';
import { T as TemplateService } from './template-service-CSNZG-20.js';
import { t as templateRegistryService } from './template-registry-service-CoCZP6pF.js';
import 'node:fs';
import 'node:path';
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
import './index5-HpJcNJHQ.js';
import './false-CRHihH2U.js';

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

export { GET, POST };
//# sourceMappingURL=_server.ts-BGxOZ1rH.js.map

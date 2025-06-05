import { j as json, e as error } from './index-Ddp2AB5f.js';
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

export { GET };
//# sourceMappingURL=_server.ts-Btp2cWbM.js.map

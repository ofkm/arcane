import { j as json } from './index-Ddp2AB5f.js';
import { g as getDockerInfo } from './core-C8NMHkc_.js';
import 'dockerode';
import './settings-service-B1w8bfJq.js';
import 'proper-lockfile';
import './encryption-service-C1I869gF.js';
import 'node:crypto';
import 'node:fs/promises';
import 'node:path';
import 'node:util';
import './schema-CDkq0ub_.js';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './settings-db-service-DyTlfQVT.js';
import './index4-SoK3Vczo.js';

const GET = async ({ url }) => {
  const hostToTest = url.searchParams.get("host");
  if (!hostToTest) {
    return json(
      { success: false, error: 'Missing "host" query parameter.' },
      { status: 400 }
      // Bad Request
    );
  }
  try {
    await getDockerInfo();
    return json({
      success: true,
      message: `Successfully connected to Docker Engine at ${hostToTest}.`
    });
  } catch (error) {
    console.error(`Docker connection test failed for host ${hostToTest}:`, error);
    return json(
      {
        success: false,
        error: error.message || `Failed to connect to Docker Engine at ${hostToTest}.`
      },
      { status: 503 }
    );
  }
};

export { GET };
//# sourceMappingURL=_server.ts-CW8pMs0b.js.map

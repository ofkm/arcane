import { j as json } from "../../../../../chunks/index.js";
import { a as getDockerInfo } from "../../../../../chunks/core.js";
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
export {
  GET
};

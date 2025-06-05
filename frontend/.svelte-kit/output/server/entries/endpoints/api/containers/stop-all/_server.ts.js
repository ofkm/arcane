import { j as json } from "../../../../../chunks/index.js";
import { l as listContainers, a as stopContainer } from "../../../../../chunks/container-service.js";
import { A as ApiErrorCode } from "../../../../../chunks/errors.type.js";
import { e as extractDockerErrorMessage } from "../../../../../chunks/errors.util.js";
import { t as tryCatch } from "../../../../../chunks/try-catch.js";
const POST = async () => {
  const result = await tryCatch(
    (async () => {
      const containers = await listContainers(true);
      const running = containers.filter((c) => c.State === "running");
      if (running.length === 0) {
        return { count: 0, message: "No running containers to stop." };
      }
      await Promise.all(running.map((c) => stopContainer(c.Id)));
      console.log(`API: Stopped ${running.length} containers.`);
      return { count: running.length, message: `Successfully stopped ${running.length} container(s).` };
    })()
  );
  if (result.error) {
    console.error("API Error (stopAllRunning):", result.error);
    const response = {
      success: false,
      error: extractDockerErrorMessage(result.error),
      code: ApiErrorCode.DOCKER_API_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  return json({
    success: true,
    count: result.data.count,
    message: result.data.message
  });
};
export {
  POST
};

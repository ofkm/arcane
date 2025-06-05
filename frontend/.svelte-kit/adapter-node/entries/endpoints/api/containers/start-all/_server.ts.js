import { j as json } from "../../../../../chunks/index.js";
import { l as listContainers, s as startContainer } from "../../../../../chunks/container-service.js";
import { A as ApiErrorCode } from "../../../../../chunks/errors.type.js";
import { e as extractDockerErrorMessage } from "../../../../../chunks/errors.util.js";
import { t as tryCatch } from "../../../../../chunks/try-catch.js";
const POST = async () => {
  const result = await tryCatch(
    (async () => {
      const containers = await listContainers(true);
      const stopped = containers.filter((c) => c.State === "exited");
      if (stopped.length === 0) {
        return { count: 0, message: "No stopped containers to start." };
      }
      await Promise.all(stopped.map((c) => startContainer(c.Id)));
      return { count: stopped.length, message: `Successfully started ${stopped.length} container(s).` };
    })()
  );
  if (result.error) {
    console.error("API Error (startAllStopped):", result.error);
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

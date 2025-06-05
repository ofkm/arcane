import { g as getVolume, i as isVolumeInUse, r as removeVolume } from "../../../../chunks/volume-service.js";
import { e as error, r as redirect, f as fail } from "../../../../chunks/index.js";
import { N as NotFoundError, D as DockerApiError, C as ConflictError } from "../../../../chunks/errors.js";
const load = async ({ params }) => {
  const volumeName = params.volumeName;
  try {
    const [volume, inUse] = await Promise.all([
      getVolume(volumeName),
      isVolumeInUse(volumeName).catch((err) => {
        console.error(`Failed to check if volume ${volumeName} is in use:`, err);
        return true;
      })
    ]);
    return {
      volume,
      inUse
    };
  } catch (err) {
    console.error(`Failed to load volume ${volumeName}:`, err);
    if (err instanceof NotFoundError) {
      error(404, { message: err.message });
    } else if (err instanceof DockerApiError) {
      error(err.status || 500, { message: err.message });
    } else if (err instanceof Error) {
      error(500, { message: err.message || `Failed to load volume details for "${volumeName}".` });
    } else {
      error(500, { message: `An unexpected error occurred while loading volume "${volumeName}".` });
    }
  }
};
const actions = {
  remove: async ({ params, url }) => {
    const volumeName = params.volumeName;
    const force = url.searchParams.get("force") === "true";
    try {
      await removeVolume(volumeName, force);
      redirect(303, "/volumes");
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof ConflictError || err instanceof DockerApiError) {
        return fail(err.status || 500, { error: err.message });
      }
      const message = err instanceof Error ? err.message : "An unexpected error occurred during removal.";
      return fail(500, { error: message });
    }
  }
};
export {
  actions,
  load
};

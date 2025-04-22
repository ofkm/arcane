import type { PageServerLoad, Actions } from "./$types";
import {
  getContainer,
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  getContainerLogs,
} from "$lib/services/docker-service";
import { error, fail, redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ params }) => {
  const containerId = params.id;

  try {
    const [container, logs] = await Promise.all([
      getContainer(containerId),
      getContainerLogs(containerId, { tail: 100 }).catch((err) => {
        console.error(`Failed to retrieve logs for ${containerId}:`, err);
        return "Failed to load logs. This could be because the container hasn't been started yet.";
      }),
    ]);

    if (!container) {
      error(404, {
        message: `Container with ID "${containerId}" not found.`,
      });
    }

    return {
      container,
      logs,
    };
  } catch (err: any) {
    console.error(`Failed to load container ${containerId}:`, err);
    error(500, {
      message:
        err.message || `Failed to load container details for "${containerId}".`,
    });
  }
};

// Define Form Actions
export const actions: Actions = {
  start: async ({ params }) => {
    const containerId = params.id;
    try {
      await startContainer(containerId);
      return { success: true, message: "Container started." };
    } catch (err: any) {
      return fail(500, { error: err.message });
    }
  },
  stop: async ({ params }) => {
    const containerId = params.id;
    try {
      await stopContainer(containerId);
      return { success: true, message: "Container stopped." };
    } catch (err: any) {
      return fail(500, { error: err.message });
    }
  },
  restart: async ({ params }) => {
    const containerId = params.id;
    try {
      await restartContainer(containerId);
      return { success: true, message: "Container restarted." };
    } catch (err: any) {
      return fail(500, { error: err.message });
    }
  },
  remove: async ({ params }) => {
    const containerId = params.id;
    try {
      // Consider adding a 'force' option from form data if needed
      // const formData = await request.formData();
      // const force = formData.get('force') === 'true';
      await removeContainer(containerId /*, force */);
      // Redirect to the containers list after successful removal
      redirect(303, "/containers");
      // Note: Redirect prevents returning a success message directly here
    } catch (err: any) {
      return fail(500, { error: err.message });
    }
  },
};

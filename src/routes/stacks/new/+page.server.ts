import { redirect } from "@sveltejs/kit";
import { createStack } from "$lib/services/compose";

/** @type {import('./$types').Actions} */
export const actions = {
  default: async ({ request }) => {
    const formData = await request.formData();

    const name = formData.get("name")?.toString() || "";
    const composeContent = formData.get("composeContent")?.toString() || "";

    if (!name) {
      return {
        success: false,
        error: "Stack name is required",
      };
    }

    if (!composeContent) {
      return {
        success: false,
        error: "Compose file content is required",
      };
    }

    try {
      const stack = await createStack(name, composeContent);
      if (stack && stack.id) {
        throw redirect(303, `/stacks/${stack.id}`);
      }

      return {
        success: true,
        stack: stack,
      };
    } catch (err) {
      // Don't catch redirects
      if (
        err instanceof Response ||
        (err &&
          typeof err === "object" &&
          "status" in err &&
          err.status === 303)
      ) {
        throw err;
      }

      console.error("Error creating stack:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to create stack",
      };
    }
  },
};

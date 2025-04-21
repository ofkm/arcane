import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { removeImage } from "$lib/services/docker-service";

export const DELETE: RequestHandler = async ({ params, url }) => {
  const { id } = params;
  const force = url.searchParams.get("force") === "true";

  try {
    await removeImage(id, force);
    return json({ success: true });
  } catch (error: any) {
    console.error("API Error removing image:", error);
    return json(
      { error: `Failed to remove image: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
};

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { pullImage } from "$lib/services/docker-service";

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    // Get the full path from the catch-all route
    const fullPath = params.name;

    if (!fullPath) {
      return json({ error: "Image reference is required." }, { status: 400 });
    }

    // Parse body for additional options
    const body = await request.json();
    const platform = body?.platform;
    const tag = body?.tag || "latest";

    // The fullPath might already include a tag, so we need to check
    let imageRef = fullPath.includes(":") ? fullPath : `${fullPath}:${tag}`;

    console.log(`API: Pulling image "${imageRef}"...`);
    await pullImage(imageRef, platform);

    return json(
      {
        success: true,
        message: `Image "${imageRef}" pulled successfully.`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("API Error pulling image:", error);
    return json(
      { error: `Failed to pull image: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
};

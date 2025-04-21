import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { pullImage } from "$lib/services/docker-service";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    if (
      !body.imageRef ||
      typeof body.imageRef !== "string" ||
      body.imageRef.trim() === ""
    ) {
      return json({ error: "Image reference is required." }, { status: 400 });
    }

    const imageRef = body.imageRef.trim();
    const platform = body.platform;

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

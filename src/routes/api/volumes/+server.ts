import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createVolume } from "$lib/services/docker-service";
import type { VolumeCreateOptions } from "dockerode";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = (await request.json()) as VolumeCreateOptions;

    if (
      !body.Name ||
      typeof body.Name !== "string" ||
      body.Name.trim() === ""
    ) {
      return json({ error: "Volume name is required." }, { status: 400 });
    }

    const options: VolumeCreateOptions = {
      Name: body.Name.trim(),
      Driver: body.Driver || "local",
      Labels: body.Labels || {},
      DriverOpts: body.DriverOpts || {},
    };

    const volumeInfo = await createVolume(options);

    return json(
      {
        success: true,
        volume: {
          ...volumeInfo,
          Name: body.Name.trim(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("API Error creating volume:", error);
    return json(
      { error: `Failed to create volume: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
};

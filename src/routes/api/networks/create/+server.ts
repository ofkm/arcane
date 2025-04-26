import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createNetwork } from "$lib/services/docker-service";
import type { NetworkCreateOptions } from "dockerode";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const options: NetworkCreateOptions = await request.json();

    if (!options.Name) {
      throw error(400, "Network name (Name) is required");
    }

    // Add default CheckDuplicate if not provided, common use case
    if (options.CheckDuplicate === undefined) {
      options.CheckDuplicate = true;
    }

    // Call the service function
    const networkInfo = await createNetwork(options);

    // Return the details of the created network
    return json({
      success: true,
      network: {
        // Map inspectInfo to ServiceNetwork shape if needed, or return full info
        id: networkInfo.Id,
        name: networkInfo.Name,
        driver: networkInfo.Driver,
        scope: networkInfo.Scope,
        subnet: networkInfo.IPAM?.Config?.[0]?.Subnet ?? null,
        gateway: networkInfo.IPAM?.Config?.[0]?.Gateway ?? null,
        created: networkInfo.Created,
        // Add other relevant fields from NetworkInspectInfo if desired
      },
      message: `Network "${networkInfo.Name}" created successfully.`,
    });
  } catch (err: any) {
    // Handle specific SvelteKit errors or re-throw them
    if (err.status >= 400 && err.status < 600) {
      throw err;
    }
    // Handle errors from createNetwork
    console.error("API Error creating network:", err);
    throw error(500, err.message || "Failed to create network");
  }
};

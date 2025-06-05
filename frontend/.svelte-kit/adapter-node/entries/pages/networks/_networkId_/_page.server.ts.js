import { g as getNetwork } from "../../../../chunks/network-service.js";
import { e as error } from "../../../../chunks/index.js";
import { N as NotFoundError } from "../../../../chunks/errors.js";
const load = async ({ params }) => {
  const networkId = params.networkId;
  try {
    const network = await getNetwork(networkId);
    return {
      network
    };
  } catch (err) {
    console.error(`Failed to load network ${networkId}:`, err);
    if (err instanceof NotFoundError) {
      error(404, { message: err.message });
    } else {
      const statusCode = err && typeof err === "object" && "status" in err ? err.status : 500;
      error(statusCode, {
        message: err instanceof Error ? err.message : `Failed to load network details for "${networkId}".`
      });
    }
  }
};
export {
  load
};

import { j as json } from "../../../../../../chunks/index.js";
import { validateStackConfiguration } from "../../../../../../chunks/stack-custom-service.js";
async function GET({ params, url }) {
  try {
    const stackId = params.stackId;
    if (!stackId) {
      return json({ error: "Stack ID is required" }, { status: 400 });
    }
    const mode = url.searchParams.get("mode") || "default";
    if (!["default", "strict", "loose"].includes(mode)) {
      return json({ error: "Invalid validation mode. Use: default, strict, or loose" }, { status: 400 });
    }
    const validation = await validateStackConfiguration(stackId, mode);
    return json({
      stackId,
      mode,
      ...validation
    });
  } catch (error) {
    console.error("Stack validation error:", error);
    return json({ error: "Failed to validate stack configuration" }, { status: 500 });
  }
}
export {
  GET
};

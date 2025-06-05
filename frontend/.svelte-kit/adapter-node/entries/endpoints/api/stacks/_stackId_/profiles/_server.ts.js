import { j as json } from "../../../../../../chunks/index.js";
import { getStackProfiles } from "../../../../../../chunks/stack-custom-service.js";
import { t as tryCatch } from "../../../../../../chunks/try-catch.js";
async function GET({ params }) {
  const { stackId } = params;
  const result = await tryCatch(getStackProfiles(stackId));
  if (result.error) {
    return json({ error: result.error.message }, { status: 500 });
  }
  return json(result.data);
}
export {
  GET
};

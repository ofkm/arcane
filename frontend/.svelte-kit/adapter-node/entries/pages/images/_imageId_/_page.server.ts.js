import { g as getImage } from "../../../../chunks/image-service.js";
import { e as error } from "../../../../chunks/index.js";
import { N as NotFoundError } from "../../../../chunks/errors.js";
const load = async ({ params }) => {
  const imageId = params.imageId;
  try {
    const image = await getImage(imageId);
    return {
      image
    };
  } catch (err) {
    console.error(`Failed to load image ${imageId}:`, err);
    if (err instanceof NotFoundError) {
      error(404, { message: err.message });
    } else {
      error(err.status || 500, {
        message: err.message || `Failed to load image details for "${imageId}".`
      });
    }
  }
};
export {
  load
};

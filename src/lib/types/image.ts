import type { ServiceImage } from "$lib/services/docker-service";

export type EnhancedImageInfo = ServiceImage & {
  inUse: boolean;
};

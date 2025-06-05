import { parseAll } from '@swimlane/docker-reference';

function parseImageNameForRegistry(imageName) {
  try {
    const parsed = parseAll(imageName);
    return { registry: parsed.domain ?? "docker.io" };
  } catch (error) {
    console.error(`Failed to parse image name: ${imageName}`, error);
    return { registry: "docker.io" };
  }
}
function areRegistriesEquivalent(url1, url2) {
  const normalize = (url) => {
    let normalized = url.toLowerCase();
    if (normalized.startsWith("http://")) normalized = normalized.substring(7);
    if (normalized.startsWith("https://")) normalized = normalized.substring(8);
    if (normalized.endsWith("/")) normalized = normalized.slice(0, -1);
    if (normalized === "index.docker.io" || normalized === "registry-1.docker.io" || normalized === "auth.docker.io") {
      return "docker.io";
    }
    return normalized;
  };
  return normalize(url1) === normalize(url2);
}

export { areRegistriesEquivalent as a, parseImageNameForRegistry as p };
//# sourceMappingURL=registry.utils-rtYanQFp.js.map

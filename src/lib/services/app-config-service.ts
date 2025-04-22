import { version as currentVersion } from "$app/environment";
import type { AppVersionInformation } from "$lib/types/application-configuration";

export default class AppConfigService {
  /**
   * Fetches version information from GitHub or a configured API
   */
  async getVersionInformation(): Promise<AppVersionInformation> {
    try {
      // GitHub API URL for releases - adjust with your repository details
      const apiUrl =
        "https://api.github.com/repos/yourusername/arcane/releases/latest";

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch version info: ${response.status}`);
      }

      const data = await response.json();

      // GitHub release tag usually starts with 'v' (e.g., 'v1.0.0')
      // Remove the 'v' prefix if present to compare versions properly
      const newestVersion = data.tag_name.replace(/^v/, "");
      const currentVersionClean = currentVersion.replace(/^v/, "");

      // Simple version comparison (you might want a more robust solution)
      const updateAvailable = this.isNewerVersion(
        newestVersion,
        currentVersionClean
      );

      return {
        currentVersion: currentVersion,
        newestVersion: newestVersion,
        updateAvailable: updateAvailable,
        releaseUrl: data.html_url,
        releaseNotes: data.body,
      };
    } catch (error) {
      console.error("Error fetching version information:", error);
      // Return only current version if fetch fails
      return { currentVersion };
    }
  }

  /**
   * Compare versions to determine if an update is available
   * Simple version comparison, assumes semantic versioning (x.y.z)
   */
  private isNewerVersion(latest: string, current: string): boolean {
    if (!latest || !current) return false;

    const latestParts = latest.split(".").map(Number);
    const currentParts = current.split(".").map(Number);

    for (let i = 0; i < 3; i++) {
      if ((latestParts[i] || 0) > (currentParts[i] || 0)) return true;
      if ((latestParts[i] || 0) < (currentParts[i] || 0)) return false;
    }

    return false; // Versions are equal
  }
}

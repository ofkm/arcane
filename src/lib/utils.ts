import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function debounced<T extends (...args: any[]) => void>(
  func: T,
  delay: number
) {
  let debounceTimeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    if (debounceTimeout !== undefined) {
      clearTimeout(debounceTimeout);
    }

    debounceTimeout = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const capitalizeFirstLetter = (text: string) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export function getStatusColor(status: string): { bg: string; text: string } {
  const statusLower = status.toLowerCase();

  if (statusLower === "running") {
    return { bg: "green-100", text: "green-900" };
  } else if (statusLower === "created" || statusLower === "restarting") {
    return { bg: "blue-100", text: "blue-900" };
  } else if (statusLower === "paused") {
    return { bg: "amber-100", text: "amber-900" };
  } else if (statusLower === "exited" || statusLower === "dead") {
    return { bg: "red-100", text: "red-900" };
  } else {
    return { bg: "gray-100", text: "gray-900" }; // Default for unknown status
  }
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return "Unknown";
  try {
    return new Date(dateString).toLocaleString();
  } catch (e) {
    return "Invalid Date";
  }
}

// Function to format logs with some basic highlighting
export function formatLogLine(line: string): string {
  if (
    line.includes("ERROR") ||
    line.includes("FATAL") ||
    line.includes("WARN")
  ) {
    return `<span class="text-red-400">${line}</span>`;
  }
  if (line.includes("INFO")) {
    return `<span class="text-blue-400">${line}</span>`;
  }
  return line;
}

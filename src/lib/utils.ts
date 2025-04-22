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

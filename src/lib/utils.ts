import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function debounced<T extends (...args: any[]) => void>(func: T, delay: number) {
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
	if (!+bytes) return '0 Bytes';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString: string | undefined | null): string {
	if (!dateString) return 'Unknown';
	try {
		return new Date(dateString).toLocaleString();
	} catch (e) {
		return 'Invalid Date';
	}
}

// Function to format logs with some basic highlighting
export function formatLogLine(line: string): string {
	if (line.includes('ERROR') || line.includes('FATAL') || line.includes('WARN')) {
		return `<span class="text-red-400">${line}</span>`;
	}
	if (line.includes('INFO')) {
		return `<span class="text-blue-400">${line}</span>`;
	}
	return line;
}

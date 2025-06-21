import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

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

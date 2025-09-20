import type { User } from '$lib/types/user.type';

declare global {
	namespace App {
		interface Error {
			message: string;
			status?: number;
		}
		interface Locals {
			user?: User | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Window {
		workbox?: any;
	}

	interface Navigator {
		standalone?: boolean;
	}

	// PWA types
	interface BeforeInstallPromptEvent extends Event {
		readonly platforms: string[];
		readonly userChoice: Promise<{
			outcome: 'accepted' | 'dismissed';
			platform: string;
		}>;
		prompt(): Promise<void>;
	}

	interface WindowEventMap {
		beforeinstallprompt: BeforeInstallPromptEvent;
		appinstalled: Event;
	}

	// Service Worker types
	declare let self: ServiceWorkerGlobalScope;
}

export {};

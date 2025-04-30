import type { VolumeInspectInfo as OriginalVolumeInspectInfo } from 'dockerode';
import type { User } from '$lib/types/user.type';
import type { UserSession } from '$lib/types/session.type';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: User | null;
			session?: UserSession | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module 'dockerode' {
	// Re-declare the interface adding the missing property
	interface VolumeInspectInfo extends OriginalVolumeInspectInfo {
		CreatedAt: string;
	}
}

export {};

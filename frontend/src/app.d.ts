import type { VolumeInspectInfo as OriginalVolumeInspectInfo } from 'dockerode';
import type { User } from '$lib/types/user.type';

declare global {
	namespace App {
		interface Error {
			message: string;
			status?: number;
		}
		interface Locals {
			user?: User | null;
			session: Session<SessionData>;
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

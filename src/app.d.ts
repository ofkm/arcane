import type { VolumeInspectInfo as OriginalVolumeInspectInfo } from 'dockerode';
import type { User } from '$lib/types/user.type';

declare global {
	namespace App {
		// interface Error {}
		declare global {
			namespace App {
				interface Locals {
					user?: User;
					session?: {
						id: string;
						userId: string;
						username: string;
						created: string;
						expires: string;
						ip?: string;
						userAgent?: string;
					};
				}
			}
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

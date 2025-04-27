import type { VolumeInspectInfo as OriginalVolumeInspectInfo } from 'dockerode';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
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

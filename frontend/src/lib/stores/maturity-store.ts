import { writable } from 'svelte/store';
import type { ImageMaturity } from '$lib/types/docker/image.type';

export type MaturityState = {
	lastChecked: Date | null;
	maturityData: Record<string, ImageMaturity>;
	isChecking: boolean;
};

const initialState: MaturityState = {
	lastChecked: null,
	maturityData: {},
	isChecking: false
};

export const maturityStore = writable<MaturityState>(initialState);

// Function to update maturity for a specific image
export function updateImageMaturity(imageId: string, maturity: ImageMaturity | undefined): void {
	maturityStore.update((state) => {
		const newData = { ...state.maturityData };

		if (maturity) {
			newData[imageId] = maturity;
		} else {
			delete newData[imageId];
		}

		return {
			...state,
			maturityData: newData
		};
	});
}

// Update the checking status
export function setMaturityChecking(isChecking: boolean): void {
	maturityStore.update((state) => ({
		...state,
		isChecking,
		lastChecked: isChecking ? state.lastChecked : new Date()
	}));
}

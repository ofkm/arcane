import { writable } from 'svelte/store';
import type { ImageUpdateData } from '$lib/services/api/image-update-api-service';
import { imageUpdateAPI } from '$lib/services/api';

export type ImageUpdateState = {
    lastChecked: Date | null;
    updateData: Record<string, ImageUpdateData>;
    isChecking: boolean;
};

const initialState: ImageUpdateState = {
    lastChecked: null,
    updateData: {},
    isChecking: false
};

export const imageUpdateStore = writable<ImageUpdateState>(initialState);

export function updateImageUpdate(imageId: string, updateData: ImageUpdateData | undefined): void {
    imageUpdateStore.update((state) => {
        const newData = { ...state.updateData };

        if (updateData) {
            const processedUpdate = {
                ...updateData,
                checkTime: normalizeDate(updateData.checkTime)
            };
            newData[imageId] = processedUpdate;
        } else {
            delete newData[imageId];
        }

        return {
            ...state,
            updateData: newData
        };
    });
}

function normalizeDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return new Date().toISOString();
        }
        return date.toISOString();
    } catch {
        return new Date().toISOString();
    }
}

export async function triggerBulkImageUpdateCheck(imageIds: string[]): Promise<boolean> {
    imageUpdateStore.update(state => ({ ...state, isChecking: true }));
    
    try {
        const results = await imageUpdateAPI.checkMultipleImages(imageIds.map(id => `image:${id}`));
        
        Object.entries(results).forEach(([imageRef, updateData]) => {
            const imageId = imageRef.replace('image:', '');
            updateImageUpdate(imageId, updateData);
        });

        imageUpdateStore.update(state => ({
            ...state,
            lastChecked: new Date(),
            isChecking: false
        }));

        return true;
    } catch (error) {
        console.error('Failed to check image updates:', error);
        imageUpdateStore.update(state => ({ ...state, isChecking: false }));
        return false;
    }
}

export function enhanceImagesWithUpdates(images: any[], updateData: Record<string, ImageUpdateData>) {
    return images.map(image => ({
        ...image,
        updateInfo: updateData[image.Id]
    }));
}
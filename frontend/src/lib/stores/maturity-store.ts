import { writable } from 'svelte/store';
import type { ImageMaturity } from '$lib/models/image.type';
import { environmentAPI } from '$lib/services/api';

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

export function updateImageMaturity(imageId: string, maturity: ImageMaturity | undefined): void {
    maturityStore.update((state) => {
        const newData = { ...state.maturityData };

        if (maturity) {
            const processedMaturity = {
                ...maturity,
                date: normalizeDate(maturity.date)
            };
            newData[imageId] = processedMaturity;
        } else {
            delete newData[imageId];
        }

        return {
            ...state,
            maturityData: newData
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

export function setMaturityChecking(isChecking: boolean): void {
    maturityStore.update((state) => ({
        ...state,
        isChecking,
        lastChecked: isChecking ? state.lastChecked : new Date()
    }));
}

export async function loadImageMaturityBatch(imageIds: string[]): Promise<void> {
    if (imageIds.length === 0) return;

    try {
        const BATCH_SIZE = 2;
        for (let i = 0; i < imageIds.length; i += BATCH_SIZE) {
            const batch = imageIds.slice(i, i + BATCH_SIZE);
            
            for (const imageId of batch) {
                try {
                    const response = await environmentAPI.getImageMaturity(imageId);
                    if (response && response.data) {
                        updateImageMaturity(imageId, response.data);
                    }
                } catch (error) {
                    console.error(`Failed to load maturity for image ${imageId}:`, error);
                    updateImageMaturity(imageId, {
                        version: 'unknown',
                        date: new Date().toISOString(),
                        status: 'Unknown',
                        updatesAvailable: false
                    });
                }
            }

            if (i + BATCH_SIZE < imageIds.length) {
                await new Promise((resolve) => setTimeout(resolve, 50));
            }
        }
    } catch (error) {
        console.error('Error loading maturity data batch:', error);
    }
}

export async function loadTopImagesMaturity(images: any[]): Promise<void> {
    if (!images || images.length === 0) return;

    const topImageIds = [...images]
        .sort((a, b) => (b.Size || 0) - (a.Size || 0))
        .slice(0, 5)
        .filter((img) => {
            if (!img.RepoTags || img.RepoTags.length === 0) return false;
            const repoTag = img.RepoTags[0];
            return repoTag !== '<none>:<none>';
        })
        .map((img) => img.Id);

    await loadImageMaturityBatch(topImageIds);
}

export async function triggerBulkMaturityCheck(imageIds?: string[]): Promise<{ success: boolean; message: string }> {
    setMaturityChecking(true);

    try {
        const result = await environmentAPI.triggerMaturityCheck(imageIds);
        return result;
    } catch (error) {
        console.error('Bulk maturity check error:', error);
        return { success: false, message: 'Failed to trigger maturity check' };
    } finally {
        setMaturityChecking(false);
    }
}

export function enhanceImagesWithMaturity(images: any[], maturityData: Record<string, ImageMaturity>): any[] {
    return images.map((image) => {
        let repo = '<none>';
        let tag = '<none>';
        if (image.RepoTags && image.RepoTags.length > 0) {
            const repoTag = image.RepoTags[0];
            if (repoTag !== '<none>:<none>' && repoTag.includes(':')) {
                [repo, tag] = repoTag.split(':');
            } else if (repoTag !== '<none>:<none>') {
                repo = repoTag;
                tag = 'latest';
            }
        }

        const storedMaturity = maturityData[image.Id];

        return {
            ...image,
            repo,
            tag,
            inUse: image.Containers > 0,
            maturity: storedMaturity !== undefined ? storedMaturity : image.maturity
        };
    });
}

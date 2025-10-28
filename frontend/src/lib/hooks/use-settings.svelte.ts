import { getContext } from 'svelte';
import { get } from 'svelte/store';
import settingsStore from '$lib/stores/config-store';
import { settingsService } from '$lib/services/settings-service';
import type { Settings } from '$lib/types/settings.type';

/**
 * Configuration for a setting that should preview changes in real-time
 */
interface PreviewConfig<T = any> {
	/** Function to apply the preview */
	apply: (value: T) => void;
	/** Optional function to reset the preview (defaults to apply with original value) */
	reset?: (value: T) => void;
}

/**
 * Options for the useSettings hook
 */
interface UseSettingsOptions<T extends Partial<Settings>> {
	/** Initial values for the settings */
	initialValues: T;
	/** Optional preview configurations for settings that should update in real-time */
	previews?: Partial<Record<keyof T, PreviewConfig>>;
	/** Success callback after save */
	onSuccess?: () => void;
	/** Error callback after save fails */
	onError?: (error: any) => void;
}

/**
 * Simple, unified settings state management hook
 *
 * Usage:
 * ```ts
 * const settings = useSettings({
 *   initialValues: { accentColor: '#000', enableGravatar: true },
 *   previews: {
 *     accentColor: { apply: (color) => applyAccentColor(color) }
 *   },
 *   onSuccess: () => toast.success('Saved!'),
 *   onError: () => toast.error('Failed!')
 * });
 *
 * // In your template:
 * <input bind:value={settings.values.accentColor} />
 * ```
 */
export function useSettings<T extends Partial<Settings>>(options: UseSettingsOptions<T>) {
	const { initialValues, onSuccess, onError } = options;
	const previews = (options.previews || {}) as Record<string, PreviewConfig>;

	// Get form state from context
	const formState = getContext('settingsFormState') as any;

	// Reactive state
	let values = $state<T>({ ...initialValues });
	let original = $state<T>({ ...initialValues });
	let isLoading = $state(false);
	let isSaving = false; // Internal flag to prevent store sync during save

	// Derived state
	const hasChanges = $derived.by(() => {
		return (Object.keys(values) as Array<keyof T>).some((key) => values[key] !== original[key]);
	});

	// Apply preview for a changed value
	function applyPreview<K extends keyof T>(key: K, value: T[K]) {
		const preview = previews[key as string];
		if (preview) {
			preview.apply(value);
		}
	}

	// Update a value and apply preview if configured
	function setValue<K extends keyof T>(key: K, value: T[K]) {
		values[key] = value;
		applyPreview(key, value);
	}

	// Reset all values to original
	function reset() {
		// Reset values
		(Object.keys(original) as Array<keyof T>).forEach((key) => {
			values[key] = original[key];
		});

		// Reset previews
		Object.keys(previews).forEach((key) => {
			const preview = previews[key];
			const value = original[key as keyof T];
			if (preview) {
				if (preview.reset) {
					preview.reset(value);
				} else {
					preview.apply(value);
				}
			}
		});
	}

	// Save changes to server
	async function save() {
		isLoading = true;
		isSaving = true;

		try {
			// Get only changed values
			const changes: Partial<Settings> = {};
			(Object.keys(values) as Array<keyof T>).forEach((key) => {
				if (values[key] !== original[key]) {
					changes[key as keyof Settings] = values[key] as any;
				}
			});

			// Nothing to save
			if (Object.keys(changes).length === 0) {
				return true;
			}

			// Save to server
			await settingsService.updateSettings(changes as any);

			// Update original to match current (makes hasChanges false)
			original = { ...values };

			// Update the store
			const currentSettings = get(settingsStore);
			settingsStore.set({ ...currentSettings, ...changes });
			await settingsStore.reload();

			// Call success callback
			onSuccess?.();

			return true;
		} catch (error) {
			console.error('Failed to save settings:', error);
			onError?.(error);
			return false;
		} finally {
			isLoading = false;
			// Allow store updates after a short delay
			setTimeout(() => {
				isSaving = false;
			}, 100);
		}
	}

	// Update from external store changes (but not during save)
	function syncFromStore(newValues: Partial<T>) {
		if (isSaving) return;
		(Object.keys(newValues) as Array<keyof T>).forEach((key) => {
			original[key] = newValues[key]!;
			values[key] = newValues[key]!;
		});
	}

	// Sync with form state context
	$effect(() => {
		if (formState) {
			formState.hasChanges = hasChanges;
			formState.isLoading = isLoading;
			formState.saveFunction = save;
			formState.resetFunction = reset;
		}
	});

	return {
		/** Current form values (reactive) */
		values,
		/** Original persisted values (reactive) */
		original,
		/** Whether there are unsaved changes (reactive) */
		hasChanges,
		/** Whether currently saving (reactive) */
		isLoading,
		/** Update a single value */
		setValue,
		/** Reset all values to original */
		reset,
		/** Save changes to server */
		save,
		/** Sync from external store updates */
		syncFromStore
	};
}

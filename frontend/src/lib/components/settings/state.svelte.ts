import { type Settings } from '$lib/types/settings.type';
import { settingsService } from '$lib/services/settings-service';
import type { PreviewSetting, SettingDefinition } from './types';
import { getContext } from 'svelte';

/**
 * Unified settings state manager that handles:
 * - Tracking changes for individual settings
 * - Preview settings that apply immediately but don't persist until save
 * - Regular settings that only apply on save
 * - Consistent save/reset patterns
 * - Automatic schema generation from setting definitions
 */
export class SettingsStateManager<TSchema extends Record<string, any>> {
	// Current form values
	#values = $state<TSchema>({} as TSchema);

	// Original persisted values
	#originalValues = $state<TSchema>({} as TSchema);

	// Settings configuration map
	#settingsConfig: Map<keyof TSchema, SettingDefinition>;

	// Loading state (reactive)
	#isLoading = $state(false);

	// Flag to prevent external updates during save
	#isSaving = false;

	// Has changes state (reactive, derived)
	#hasChanges = $derived.by(() => {
		return Object.keys(this.#values).some((key) => {
			const typedKey = key as keyof TSchema;
			return this.#values[typedKey] !== this.#originalValues[typedKey];
		});
	});

	constructor(initialValues: TSchema, settingsConfig: SettingDefinition[]) {
		this.#originalValues = { ...initialValues };
		this.#values = { ...initialValues };
		this.#settingsConfig = new Map(settingsConfig.map((config) => [config.key as keyof TSchema, config]));
	}

	/**
	 * Get reactive values for all settings
	 */
	get values(): TSchema {
		return this.#values;
	}

	/**
	 * Get the original (persisted) values
	 */
	get originalValues(): TSchema {
		return this.#originalValues;
	}

	/**
	 * Check if there are unsaved changes
	 */
	get hasChanges(): boolean {
		return this.#hasChanges;
	}

	/**
	 * Check if currently loading
	 */
	get isLoading(): boolean {
		return this.#isLoading;
	}

	/**
	 * Update a single setting value
	 * For preview settings, applies the change immediately
	 * For regular settings, just updates the internal state
	 */
	setValue<K extends keyof TSchema>(key: K, value: TSchema[K]): void {
		this.#values[key] = value;

		// If this is a preview setting, apply it immediately
		const config = this.#settingsConfig.get(key);
		if (config && isPreviewSetting(config)) {
			this.#applyPreview(key, value, config);
		}
	}

	/**
	 * Apply preview for a setting
	 */
	#applyPreview<K extends keyof TSchema>(key: K, value: TSchema[K], config: PreviewSetting<TSchema[K]>): void {
		config.previewFn(value);
	}

	/**
	 * Reset all values to their original state
	 * For preview settings, also reverts the preview
	 */
	reset(): void {
		// Reset all values
		Object.keys(this.#originalValues).forEach((key) => {
			const typedKey = key as keyof TSchema;
			this.#values[typedKey] = this.#originalValues[typedKey];
		});

		// Reset previews for preview settings
		this.#settingsConfig.forEach((config, key) => {
			if (isPreviewSetting(config)) {
				const value = this.#originalValues[key];
				if (config.resetPreviewFn) {
					config.resetPreviewFn(value);
				} else {
					config.previewFn(value);
				}
			}
		});
	}

	/**
	 * Update the original values and current values (e.g., from external store changes)
	 * This is used when the settings store updates from outside this component
	 * Skips update if we're currently saving to prevent overwriting synced state
	 */
	updateFromStore(newValues: Partial<TSchema>): void {
		// Don't update if we're in the middle of a save operation
		if (this.#isSaving) {
			return;
		}

		Object.assign(this.#originalValues, newValues);
		Object.assign(this.#values, newValues);
	}

	/**
	 * Sync original values with current values after a successful save
	 */
	#syncOriginalValues(): void {
		this.#originalValues = { ...this.#values };
	}

	/**
	 * Save the current values to the server
	 * Only saves changed values
	 */
	async save(onSuccess?: (data: Partial<Settings>) => void, onError?: (error: any) => void): Promise<boolean> {
		this.#isLoading = true;
		this.#isSaving = true;

		try {
			// Get only the changed values
			const changedValues: Partial<Settings> = {};
			Object.keys(this.#values).forEach((key) => {
				const typedKey = key as keyof TSchema;
				if (this.#values[typedKey] !== this.#originalValues[typedKey]) {
					changedValues[typedKey as keyof Settings] = this.#values[typedKey] as any;
				}
			});

			// If no changes, return early
			if (Object.keys(changedValues).length === 0) {
				return true;
			}

			// Save to server
			await settingsService.updateSettings(changedValues as any);

			// Sync original values to match current values
			// This ensures hasChanges becomes false immediately
			this.#syncOriginalValues();

			// Call success callback
			if (onSuccess) {
				onSuccess(changedValues);
			}

			return true;
		} catch (error) {
			console.error('Failed to save settings:', error);

			// Call error callback
			if (onError) {
				onError(error);
			}

			return false;
		} finally {
			this.#isLoading = false;
			// Reset saving flag after a short delay to allow store effects to settle
			setTimeout(() => {
				this.#isSaving = false;
			}, 100);
		}
	}

	/**
	 * Validate the current values (can be extended with custom validation)
	 */
	validate(): boolean {
		// Override this method in subclasses for custom validation
		return true;
	}

	/**
	 * Create form integration helpers
	 */
	createFormIntegration(
		formState: any,
		toastSuccess: string | (() => void),
		toastError: string | ((error: any) => void) = 'Failed to save settings. Please try again.'
	) {
		const onSubmit = async () => {
			await this.save(
				() => {
					if (typeof toastSuccess === 'function') {
						toastSuccess();
					}
				},
				(error) => {
					console.error('Failed to save settings:', error);
					if (typeof toastError === 'function') {
						toastError(error);
					}
				}
			);
		};

		const resetForm = () => {
			this.reset();
		};

		// Set up form state
		if (formState) {
			formState.saveFunction = onSubmit;
			formState.resetFunction = resetForm;
		}

		return { onSubmit, resetForm };
	}

	/**
	 * Create component binding helpers
	 */
	createBindings() {
		return {
			// Text input binding
			textInput: <K extends keyof TSchema>(key: K) => ({
				bind: this.#values[key],
				onChange: (value: TSchema[K]) => this.setValue(key, value)
			}),

			// Switch binding
			switch: <K extends keyof TSchema>(key: K) => ({
				checked: this.#values[key],
				onCheckedChange: (checked: TSchema[K]) => this.setValue(key, checked)
			}),

			// Color picker binding
			colorPicker: <K extends keyof TSchema>(key: K) => ({
				previousColor: this.#originalValues[key],
				bind: this.#values[key],
				onChange: (color: TSchema[K]) => this.setValue(key, color)
			})
		};
	}

	/**
	 * Create a complete settings page setup
	 * Handles everything: form integration, store sync, and component bindings
	 */
	createPageSetup(
		toastSuccess: string | (() => void),
		toastError: string | ((error: any) => void) = 'Failed to save settings. Please try again.'
	) {
		const formState = getContext('settingsFormState') as any;

		// Create form integration
		const { onSubmit, resetForm } = this.createFormIntegration(formState, toastSuccess, toastError);

		// Create component bindings
		const bindings = this.createBindings();

		// Set up automatic store sync
		const setupStoreSync = (store: any, storeKeys: (keyof TSchema)[]) => {
			$effect(() => {
				if (store) {
					const storeValues: Partial<TSchema> = {};
					storeKeys.forEach((key) => {
						storeValues[key] = store[key];
					});
					this.updateFromStore(storeValues);
				}
			});
		};

		// Set up form state sync
		$effect(() => {
			syncWithFormState(this, formState);
		});

		return {
			onSubmit,
			resetForm,
			bindings,
			setupStoreSync,
			values: this.values,
			originalValues: this.originalValues,
			isLoading: this.isLoading,
			hasChanges: this.hasChanges
		};
	}
}

/**
 * Type guard to check if a setting is a PreviewSetting
 */
function isPreviewSetting(config: SettingDefinition): config is PreviewSetting {
	return 'previewFn' in config;
}

/**
 * Create a settings state manager instance
 */
export function createSettingsState<TSchema extends Record<string, any>>(
	initialValues: TSchema,
	settingsConfig: SettingDefinition[]
): SettingsStateManager<TSchema> {
	return new SettingsStateManager(initialValues, settingsConfig);
}

/**
 * Helper to integrate settings state with form state context
 * Call this in a $effect to sync with the layout's form state
 */
export function syncWithFormState(settingsState: SettingsStateManager<any>, formState: any): void {
	if (formState) {
		formState.hasChanges = settingsState.hasChanges;
		formState.isLoading = settingsState.isLoading;
	}
}

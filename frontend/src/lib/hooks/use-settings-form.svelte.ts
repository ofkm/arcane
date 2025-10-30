import { getContext } from 'svelte';
import settingsStore from '$lib/stores/config-store';
import { settingsService } from '$lib/services/settings-service';
import type { Settings } from '$lib/types/settings.type';
import { tryCatch } from '$lib/utils/try-catch';

type SettingsFormState = {
	hasChanges: boolean;
	isLoading: boolean;
	saveFunction?: () => Promise<void> | void;
	resetFunction?: () => void;
};

type Options = {
	hasChangesChecker: () => boolean;
};

export class UseSettingsForm {
	#hasChanges = $state(false);
	#isLoading = $state(false);
	private formState: SettingsFormState | undefined;
	private hasChangesChecker: () => boolean;

	constructor({ hasChangesChecker }: Options) {
		this.hasChangesChecker = hasChangesChecker;

		try {
			this.formState = getContext('settingsFormState') as SettingsFormState | undefined;
		} catch {
			// Context not available
		}

		$effect(() => {
			this.#hasChanges = this.hasChangesChecker();
			if (this.formState) {
				this.formState.hasChanges = this.#hasChanges;
				this.formState.isLoading = this.#isLoading;
			}
		});
	}

	async updateSettings(updatedSettings: Partial<Settings>) {
		const result = await tryCatch(settingsService.updateSettings(updatedSettings as any));

		if (result.error) {
			console.error('Error updating settings:', result.error);
			throw result.error;
		}

		await settingsStore.reload();
	}

	registerFormActions(saveFunction: () => Promise<void> | void, resetFunction: () => void) {
		if (this.formState) {
			this.formState.saveFunction = saveFunction;
			this.formState.resetFunction = resetFunction;
		}
	}

	setLoading(loading: boolean) {
		this.#isLoading = loading;
	}

	get hasChanges() {
		return this.#hasChanges;
	}

	get isLoading() {
		return this.#isLoading;
	}
}

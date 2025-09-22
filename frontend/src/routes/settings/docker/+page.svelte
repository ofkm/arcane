<script lang="ts">
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';
	import UiConfigDisabledTag from '$lib/components/ui-config-disabled-tag.svelte';
	import DockerSettingsForm from '../forms/docker-settings-form.svelte';
	import BoxesIcon from '@lucide/svelte/icons/boxes';
	import { m } from '$lib/paraglide/messages';
	import { getContext } from 'svelte';

	let { data } = $props();
	let currentSettings = $state<Settings>(data.settings);
	let hasChanges = $state(false);
	let isLoading = $state(false);
	
	const isReadOnly = $derived.by(() => $settingsStore.uiConfigDisabled);

	const formState = getContext('settingsFormState') as any;

	$effect(() => {
		if (formState) {
			formState.hasChanges = hasChanges;
			formState.isLoading = isLoading;
		}
	});

	async function updateSettingsConfig(updatedSettings: Partial<Settings>) {
		try {
			await settingsAPI.updateSettings(updatedSettings as any);

			currentSettings = { ...currentSettings, ...updatedSettings };

			settingsStore.set(currentSettings);
			settingsStore.reload();
		} catch (error) {
			console.error('Error updating settings:', error);
			throw error;
		}
	}
</script>

<div class="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
	<div
		class="from-background/60 via-background/40 to-background/60 relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 shadow-sm sm:p-6"
	>
		<div class="bg-primary/10 pointer-events-none absolute -right-10 -top-10 size-40 rounded-full blur-3xl"></div>
		<div class="bg-muted/40 pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full blur-3xl"></div>
		<div class="relative flex items-start gap-3 sm:gap-4">
			<div
				class="bg-primary/10 text-primary ring-primary/20 flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 sm:size-10"
			>
				<BoxesIcon class="size-4 sm:size-5" />
			</div>
			<div class="min-w-0 flex-1">
				<div class="flex items-start justify-between gap-3">
					<h1 class="settings-title text-xl sm:text-3xl min-w-0">{m.docker_title()}</h1>
					{#if isReadOnly}
						<div class="shrink-0">
							<UiConfigDisabledTag />
						</div>
					{/if}
				</div>
				<p class="text-muted-foreground mt-1 text-sm sm:text-base">{m.docker_description()}</p>
			</div>
		</div>
	</div>

	<div class="mt-6 sm:mt-8">
		<DockerSettingsForm settings={currentSettings} callback={updateSettingsConfig} bind:hasChanges bind:isLoading />
	</div>
</div>


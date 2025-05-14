<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Save, RefreshCw } from '@lucide/svelte';
	import type { PageData } from './$types';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import AppSettings from './tabs/app-settings.svelte';
	import UserManagement from './tabs/user-management.svelte';
	import Authentication from './tabs/authentication.svelte';
	import { saveSettingsToServer, updateSettingsStore } from '$lib/stores/settings-store';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import DockerSettings from './tabs/docker-settings.svelte';

	let { data } = $props<{ data: PageData }>();

	$effect(() => {
		if (data.settings) {
			updateSettingsStore(data.settings);
		}
	});

	let settingsPageStates = $state({
		start: false,
		error: <string | null>null,
		activeTab: 'app-settings'
	});

	let isLoading = $state({
		saving: false
	});

	const tabs = [
		{ id: 'app-settings', label: 'General', component: AppSettings },
		{ id: 'docker-settings', label: 'Docker', component: DockerSettings },
		{ id: 'user-management', label: 'User Management', component: UserManagement },
		{ id: 'authentication', label: 'Authentication', component: Authentication }
	];

	async function saveSettings() {
		if (isLoading.saving) return;
		isLoading.saving = true;
		settingsPageStates.error = null;

		handleApiResultWithCallbacks({
			result: await tryCatch(saveSettingsToServer()),
			message: 'Error Saving Settings',
			setLoadingState: (value) => (isLoading.saving = value),
			onSuccess: async () => {
				toast.success(`Settings Saved Successfully`);
				await invalidateAll();
			}
		});
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Settings</h1>
			<p class="text-sm text-muted-foreground mt-1">Configure Arcane's settings and permissions</p>
		</div>

		<Button onclick={saveSettings} disabled={isLoading.saving} class="h-10">
			{#if isLoading.saving}
				<RefreshCw class="animate-spin size-4" />
				Saving...
			{:else}
				<Save class="size-4" />
				Save Settings
			{/if}
		</Button>
	</div>

	<Tabs.Root value={settingsPageStates.activeTab} onValueChange={(val) => (settingsPageStates.activeTab = val)} class="w-full">
		<Tabs.List class="grid grid-cols-4 md:w-full md:max-w-3xl mb-4 dark:bg-slate-900">
			{#each tabs as tab, i (tab.id)}
				<Tabs.Trigger value={tab.id} class="whitespace-nowrap data-[state=active]:border data-[state=active]:border-primary/60">
					{tab.label}
				</Tabs.Trigger>
			{/each}
		</Tabs.List>

		<div id="settings-container">
			<input type="hidden" id="csrf_token" value={data.csrf} />
			{#each tabs as tab (tab.id)}
				<Tabs.Content value={tab.id} class="space-y-4">
					<tab.component {data} />
				</Tabs.Content>
			{/each}
		</div>
	</Tabs.Root>
</div>

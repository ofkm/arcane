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

	let { data } = $props<{ data: PageData }>();

	$effect(() => {
		if (data.settings) {
			updateSettingsStore(data.settings);
		}
	});

	let activeTab = $state('app-settings');
	let saving = $state(false);
	let error = $state<string | null>(null);

	const tabs = [
		{ id: 'app-settings', label: 'General', component: AppSettings },
		{ id: 'user-management', label: 'User Management', component: UserManagement },
		{ id: 'authentication', label: 'Authentication', component: Authentication }
	];

	async function saveSettings() {
		if (saving) return;
		saving = true;
		error = null;

		try {
			await saveSettingsToServer();
			toast.success('Settings saved successfully');
			await invalidateAll();
		} catch (err: unknown) {
			console.error('Error saving settings:', err);
			error = err instanceof Error ? err.message : 'An error occurred while saving settings';
			if (error) toast.error(error);
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Settings</h1>
			<p class="text-sm text-muted-foreground mt-1">Configure Arcane's settings and permissions</p>
		</div>

		<Button onclick={saveSettings} disabled={saving} class="h-10">
			{#if saving}
				<RefreshCw class="mr-2 h-4 w-4 animate-spin" />
				Saving...
			{:else}
				<Save class="mr-2 h-4 w-4" />
				Save Settings
			{/if}
		</Button>
	</div>

	<Tabs.Root value={activeTab} onValueChange={(val) => (activeTab = val)} class="w-full">
		<Tabs.List class="grid grid-cols-3 md:w-full md:max-w-3xl mb-4">
			{#each tabs as tab, i (tab.id)}
				<Tabs.Trigger value={tab.id} class="whitespace-nowrap">
					{tab.label}
				</Tabs.Trigger>
			{/each}
		</Tabs.List>

		<div id="settings-container">
			<input type="hidden" id="csrf_token" value={data.csrf} />
			{#each tabs as tab, i (tab.id)}
				<Tabs.Content value={tab.id} class="space-y-4">
					<tab.component {data} />
				</Tabs.Content>
			{/each}
		</div>
	</Tabs.Root>
</div>

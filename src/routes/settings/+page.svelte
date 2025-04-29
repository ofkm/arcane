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
	import RbacSettings from './tabs/rbac-settings.svelte';
	import ExternalServices from './tabs/external-services.svelte';

	let { data } = $props<{ data: PageData }>();

	// Track active tab
	let activeTab = $state('app-settings');
	let saving = $state(false);
	let error = $state<string | null>(null);

	// Keep the tab IDs consistent with the trigger values
	const tabs = [
		{ id: 'app-settings', label: 'General', component: AppSettings },
		{
			id: 'user-management',
			label: 'User Management',
			component: UserManagement
		},
		{
			id: 'authentication',
			label: 'Authentication',
			component: Authentication
		},
		{ id: 'rbac', label: 'RBAC', component: RbacSettings },
		{
			id: 'external-services',
			label: 'External Services',
			component: ExternalServices
		}
	];

	// New function to handle settings update via API
	async function saveSettings() {
		if (saving) return;

		saving = true;
		error = null;

		try {
			// Gather all form values from the settings form
			const form = document.getElementById('settings-form') as HTMLFormElement;
			const formData = new FormData(form);

			// Basic settings (direct properties)
			const settingsData: any = {
				dockerHost: formData.get('dockerHost')?.toString() || '',
				stacksDirectory: formData.get('stacksDirectory')?.toString() || '',
				autoUpdateInterval: parseInt(formData.get('autoUpdateInterval')?.toString() || '60', 10),
				pollingInterval: parseInt(formData.get('pollingInterval')?.toString() || '10', 10),
				pruneMode: formData.get('pruneMode')?.toString() || 'all'
			};

			// Boolean fields
			const booleanFields = ['autoUpdate', 'pollingEnabled', 'rbacEnabled', 'enableLocalAuth', 'enableOAuth', 'enableLDAP'];

			booleanFields.forEach((field) => {
				settingsData[field] = formData.has(field);
			});

			// Authentication settings
			settingsData.authentication = {
				enableLocalAuth: formData.has('enableLocalAuth'),
				enableOAuth: formData.has('enableOAuth'),
				enableLDAP: formData.has('enableLDAP'),
				sessionTimeout: parseInt(formData.get('sessionTimeout')?.toString() || '60', 10),
				passwordPolicy: formData.get('passwordPolicy')?.toString() || 'medium'
			};

			// External services - Valkey
			if (formData.has('valkeyEnabled')) {
				settingsData.externalServices = {
					valkey: {
						enabled: true,
						host: formData.get('valkeyHost')?.toString() || 'localhost',
						port: parseInt(formData.get('valkeyPort')?.toString() || '6379', 10),
						username: formData.get('valkeyUsername')?.toString() || '',
						password: formData.get('valkeyPassword')?.toString() || '',
						keyPrefix: formData.get('valkeyKeyPrefix')?.toString() || 'arcane:'
					}
				};
			} else {
				settingsData.externalServices = {
					valkey: {
						enabled: false
					}
				};
			}

			// Registry credentials
			const registryData = [];
			let registriesJSON = formData.get('registryCredentials');
			if (registriesJSON && typeof registriesJSON === 'string') {
				try {
					const parsedRegistry = JSON.parse(registriesJSON);
					if (Array.isArray(parsedRegistry)) {
						settingsData.registryCredentials = parsedRegistry;
					}
				} catch (e) {
					console.error('Error parsing registry credentials', e);
				}
			}

			// Send the data to the API
			const response = await fetch('/api/settings', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(settingsData)
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || `HTTP error! status: ${response.status}`);
			}

			toast.success('Settings saved successfully');
			await invalidateAll();
		} catch (err: any) {
			console.error('Error saving settings:', err);
			error = err.message || 'An error occurred while saving settings';
			if (error) toast.error(error);
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
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

	<!-- Tabs Navigation -->
	<Tabs.Root value={activeTab} onValueChange={(val) => (activeTab = val)} class="w-full">
		<Tabs.List class="grid grid-cols-5 sm:grid-cols-5 md:w-full md:max-w-3xl mb-4">
			{#each tabs as tab}
				<Tabs.Trigger value={tab.id} class="whitespace-nowrap">
					{tab.label}
				</Tabs.Trigger>
			{/each}
		</Tabs.List>

		<!-- Wrap tab content in a form for easy data collection -->
		<form
			id="settings-form"
			onsubmit={(e) => {
				e.preventDefault();
				saveSettings();
			}}
		>
			<!-- Add a hidden input with a CSRF token -->
			<input type="hidden" name="csrf_token" value={data.csrf} />

			{#each tabs as tab}
				<Tabs.Content value={tab.id} class="space-y-4">
					<tab.component {data} />
				</Tabs.Content>
			{/each}
		</form>
	</Tabs.Root>
</div>

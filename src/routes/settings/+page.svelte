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
			// Instead of using FormData, collect settings directly from the DOM
			// Basic settings (direct properties)
			const settingsData: any = {
				dockerHost: getInputValue('dockerHost', ''),
				stacksDirectory: getInputValue('stacksDirectory', ''),
				autoUpdateInterval: parseInt(getInputValue('autoUpdateInterval', '60')),
				pollingInterval: parseInt(getInputValue('pollingInterval', '10')),
				pruneMode: getInputValue('pruneMode', 'all')
			};

			// Boolean fields - check if the switch elements are checked
			const booleanFields = ['autoUpdate', 'pollingEnabled', 'rbacEnabled', 'enableLocalAuth', 'enableOAuth', 'enableLDAP'];
			booleanFields.forEach((field) => {
				const element = document.getElementById(field) as HTMLInputElement;
				settingsData[field] = element?.checked || false;
			});

			// Authentication settings
			settingsData.authentication = {
				enableLocalAuth: isSwitchChecked('enableLocalAuth'),
				enableOAuth: isSwitchChecked('enableOAuth'),
				enableLDAP: isSwitchChecked('enableLDAP'),
				sessionTimeout: parseInt(getInputValue('sessionTimeout', '60')),
				passwordPolicy: getInputValue('passwordPolicy', 'medium')
			};

			// External services - Valkey
			if (isSwitchChecked('valkeyEnabled')) {
				settingsData.externalServices = {
					valkey: {
						enabled: true,
						host: getInputValue('valkeyHost', 'localhost'),
						port: parseInt(getInputValue('valkeyPort', '6379')),
						username: getInputValue('valkeyUsername', ''),
						password: getInputValue('valkeyPassword', ''),
						keyPrefix: getInputValue('valkeyKeyPrefix', 'arcane:')
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
			const registryCredentialsInput = document.getElementById('registryCredentials') as HTMLInputElement;
			if (registryCredentialsInput?.value) {
				try {
					const parsedRegistry = JSON.parse(registryCredentialsInput.value);
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

	// Helper function to get input values from the DOM
	function getInputValue(id: string, defaultValue: string = ''): string {
		const element = document.getElementById(id) as HTMLInputElement;
		return element?.value || defaultValue;
	}

	// Helper function to check if a switch is checked
	function isSwitchChecked(id: string): boolean {
		const element = document.getElementById(id) as HTMLInputElement;
		return element?.checked || false;
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

		<!-- Replace form with div to avoid refresh errors -->
		<div id="settings-container">
			<!-- Add a hidden input with a CSRF token -->
			<input type="hidden" id="csrf_token" value={data.csrf} />

			{#each tabs as tab}
				<Tabs.Content value={tab.id} class="space-y-4">
					<tab.component {data} />
				</Tabs.Content>
			{/each}
		</div>
	</Tabs.Root>
</div>

<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Trash2, Plus, ExternalLink, RefreshCw, FileText, Globe, FolderOpen, Save, Users, Copy } from '@lucide/svelte';
	import type { PageData } from './$types';
	import { settingsStore, saveSettingsToServer, updateSettingsStore } from '$lib/stores/settings-store';
	import { templateRegistryService } from '$lib/services/template-registry-service';
	import type { TemplateRegistryConfig } from '$lib/types/settings.type';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';

	let { data }: { data: PageData } = $props();

	// Form state - only need URL now
	let newRegistryUrl = $state('');

	// Loading states
	let isLoading = $state({
		saving: false,
		addingRegistry: false,
		refreshing: new Set<string>(),
		removing: new Set<string>()
	});

	// Initialize settings from page data
	$effect(() => {
		if (data.settings) {
			updateSettingsStore(data.settings);
		}
	});

	// Get template registries from settings store
	const templateRegistries = $derived($settingsStore.templateRegistries || []);

	// Helper function to save settings and handle result
	async function saveSettingsAndHandle(successMessage: string) {
		const result = await tryCatch(saveSettingsToServer());
		if (result.error) {
			toast.error(result.error.message || 'Failed to save settings');
			return false;
		} else {
			toast.success(successMessage);
			await invalidateAll();
			return true;
		}
	}

	// Add registry function
	async function addRegistry() {
		if (!newRegistryUrl.trim()) {
			toast.error('Registry URL is required');
			return;
		}

		if (isLoading.addingRegistry) return;
		isLoading.addingRegistry = true;

		try {
			// Test the registry first to get its name
			const testConfig: TemplateRegistryConfig = {
				url: newRegistryUrl.trim(),
				name: 'Loading...', // Temporary name
				enabled: true
			};

			console.log('Testing registry URL:', testConfig.url);
			const registry = await templateRegistryService.fetchRegistry(testConfig);
			if (!registry) {
				toast.error('Failed to fetch registry or invalid format');
				return;
			}

			// Create config with the registry's actual name
			const config: TemplateRegistryConfig = {
				url: newRegistryUrl.trim(),
				name: registry.name, // Use name from registry JSON
				enabled: true
			};

			console.log('Registry test successful, adding to store with name:', registry.name);

			// Add to settings store
			settingsStore.update((settings) => ({
				...settings,
				templateRegistries: [...(settings.templateRegistries || []), config]
			}));

			// Save immediately
			const saved = await saveSettingsAndHandle(`Registry "${registry.name}" added and saved successfully`);
			if (saved) {
				// Clear form only if save was successful
				newRegistryUrl = '';
			}
		} catch (error) {
			console.error('Error adding registry:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to add registry');
		} finally {
			isLoading.addingRegistry = false;
		}
	}

	// Remove registry function
	async function removeRegistry(url: string) {
		if (isLoading.removing.has(url)) return;
		isLoading.removing.add(url);

		try {
			settingsStore.update((settings) => ({
				...settings,
				templateRegistries: (settings.templateRegistries || []).filter((r) => r.url !== url)
			}));

			// Save immediately
			await saveSettingsAndHandle('Registry removed and saved successfully');
		} catch (error) {
			toast.error('Failed to remove registry');
		} finally {
			isLoading.removing.delete(url);
		}
	}

	// Refresh registry function
	async function refreshRegistry(url: string) {
		if (isLoading.refreshing.has(url)) return;
		isLoading.refreshing.add(url);

		try {
			const registries = $settingsStore.templateRegistries || [];
			const config = registries.find((r) => r.url === url);

			if (!config) {
				toast.error('Registry not found');
				return;
			}

			// Clear cache and refetch
			templateRegistryService.clearCache();
			const registry = await templateRegistryService.fetchRegistry(config);

			if (!registry) {
				toast.error('Failed to refresh registry');
				return;
			}

			// Update last_updated timestamp and name (in case it changed)
			settingsStore.update((settings) => ({
				...settings,
				templateRegistries: (settings.templateRegistries || []).map((r) =>
					r.url === url
						? {
								...r,
								name: registry.name, // Update name from registry
								last_updated: new Date().toISOString()
							}
						: r
				)
			}));

			// Save immediately
			await saveSettingsAndHandle('Registry refreshed and saved successfully');
		} catch (error) {
			toast.error('Failed to refresh registry');
		} finally {
			isLoading.refreshing.delete(url);
		}
	}

	// Manual save settings function (for any other changes)
	async function saveSettings() {
		if (isLoading.saving) return;
		isLoading.saving = true;

		console.log('Saving settings to server:', $settingsStore);

		handleApiResultWithCallbacks({
			result: await tryCatch(saveSettingsToServer()),
			message: 'Error Saving Settings',
			setLoadingState: (value) => (isLoading.saving = value),
			onSuccess: async () => {
				toast.success('Settings saved successfully');
				await invalidateAll();
			}
		});
	}

	function copyToClipboard(text: string) {
		navigator.clipboard
			.writeText(text)
			.then(() => {
				toast.success('Copied to clipboard');
			})
			.catch(() => {
				toast.error('Failed to copy');
			});
	}
</script>

<svelte:head>
	<title>Template Settings - Arcane</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Template Settings</h1>
			<p class="text-sm text-muted-foreground mt-1">
				Manage Docker Compose template sources and registries
				<a href="https://arcane.ofkm.dev/docs/templates/use-templates" class="text-primary hover:underline ml-1">→ Learn more</a>
			</p>
		</div>

		<!-- Keep save button for any future manual settings that might be added -->
		<Button onclick={saveSettings} disabled={isLoading.saving} class="h-10 arcane-button-save" variant="outline">
			{#if isLoading.saving}
				<RefreshCw class="animate-spin size-4" />
				Saving...
			{:else}
				<Save class="size-4" />
				Save Settings
			{/if}
		</Button>
	</div>

	<!-- Template Statistics -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<Card class="p-4">
			<div class="flex items-center gap-3">
				<FolderOpen class="size-8 text-blue-500" />
				<div>
					<p class="text-2xl font-bold">{data.localTemplateCount}</p>
					<p class="text-sm text-muted-foreground">Local Templates</p>
				</div>
			</div>
		</Card>
		<Card class="p-4">
			<div class="flex items-center gap-3">
				<Globe class="size-8 text-green-500" />
				<div>
					<p class="text-2xl font-bold">{data.remoteTemplateCount}</p>
					<p class="text-sm text-muted-foreground">Remote Templates</p>
				</div>
			</div>
		</Card>
		<Card class="p-4">
			<div class="flex items-center gap-3">
				<FileText class="size-8 text-purple-500" />
				<div>
					<p class="text-2xl font-bold">{templateRegistries.length}</p>
					<p class="text-sm text-muted-foreground">Registries</p>
				</div>
			</div>
		</Card>
	</div>

	<Separator />

	<!-- Local Templates Info -->
	<div class="space-y-4">
		<h2 class="text-xl font-semibold">Local Templates</h2>
		<Alert.Root>
			<FolderOpen class="size-4" />
			<Alert.Title>Local Template Directory</Alert.Title>
			<Alert.Description>
				Place your custom Docker Compose templates in the <code class="bg-muted px-1 rounded text-xs">data/templates/compose/</code> directory. Templates should be YAML files with a descriptive filename. You can also include matching <code class="bg-muted px-1 rounded text-xs">.env</code> files for environment variables.
			</Alert.Description>
		</Alert.Root>
	</div>

	<Separator />

	<!-- Remote Template Registries -->
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-xl font-semibold">Remote Template Registries</h2>
		</div>

		<Alert.Root>
			<Globe class="size-4" />
			<Alert.Title>Remote Registries</Alert.Title>
			<Alert.Description>Add remote template registries to access community templates. Registry names are automatically detected from the JSON manifest. Changes are saved automatically.</Alert.Description>
		</Alert.Root>

		<Alert.Root class="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
			<Users class="size-4" />
			<Alert.Title>Community Registry</Alert.Title>
			<Alert.Description class="space-y-2">
				<p>Get started quickly with our community registry containing popular templates:</p>
				<div class="flex items-center gap-2 mt-2">
					<code class="bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs"> https://templates.arcane.ofkm.dev/registry.json </code>
					<Button size="sm" variant="outline" onclick={() => copyToClipboard('https://templates.arcane.ofkm.dev/registry.json')}>
						<Copy class="size-3 mr-1" />
						Copy
					</Button>
				</div>
			</Alert.Description>
		</Alert.Root>

		<!-- Add New Registry Form -->
		<Card class="p-4">
			<h3 class="font-medium mb-3">Add Registry</h3>
			<div class="space-y-3">
				<div>
					<Label for="url">Registry URL</Label>
					<Input id="url" bind:value={newRegistryUrl} type="url" placeholder="https://raw.githubusercontent.com/username/repo/main/registry.json" disabled={isLoading.addingRegistry} required />
					<p class="text-xs text-muted-foreground mt-1">The registry name will be automatically detected from the JSON file</p>
				</div>
				<Button onclick={addRegistry} disabled={isLoading.addingRegistry || !newRegistryUrl.trim()}>
					<Plus class="size-4 mr-2" />
					{isLoading.addingRegistry ? 'Testing & Adding...' : 'Add Registry'}
				</Button>
			</div>
		</Card>

		<!-- Registry List -->
		{#if templateRegistries.length > 0}
			<div class="space-y-3">
				{#each templateRegistries as registry}
					<Card class="p-4">
						<div class="flex items-center justify-between">
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-1">
									<h4 class="font-medium">{registry.name}</h4>
									<Badge variant={registry.enabled ? 'default' : 'secondary'}>
										{registry.enabled ? 'Enabled' : 'Disabled'}
									</Badge>
								</div>
								<p class="text-sm text-muted-foreground break-all">{registry.url}</p>
								{#if registry.last_updated}
									<p class="text-xs text-muted-foreground mt-1">
										Last updated: {new Date(registry.last_updated).toLocaleString()}
									</p>
								{/if}
							</div>
							<div class="flex items-center gap-2">
								<Button variant="outline" size="sm" onclick={() => refreshRegistry(registry.url)} disabled={isLoading.refreshing.has(registry.url)}>
									<RefreshCw class={`size-4 ${isLoading.refreshing.has(registry.url) ? 'animate-spin' : ''}`} />
								</Button>

								<Button variant="outline" size="sm" onclick={() => window.open(registry.url, '_blank')}>
									<ExternalLink class="size-4" />
								</Button>

								<Button variant="destructive" size="sm" onclick={() => removeRegistry(registry.url)} disabled={isLoading.removing.has(registry.url)}>
									<Trash2 class="size-4" />
								</Button>
							</div>
						</div>
					</Card>
				{/each}
			</div>
		{:else}
			<div class="text-center py-6 text-muted-foreground">
				<Globe class="size-12 mx-auto mb-4 opacity-50" />
				<p class="mb-2">No registries configured</p>
				<p class="text-sm">Add a remote template registry to access community templates</p>
			</div>
		{/if}
	</div>
</div>

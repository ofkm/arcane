<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Trash2, Plus, ExternalLink, RefreshCw, FileText, Globe, FolderOpen } from '@lucide/svelte';
	import type { TemplateRegistryConfig } from '$lib/types/template-registry';
	import { TemplateService } from '$lib/services/template-service';
	import { templateRegistryService } from '$lib/services/template-registry-service';

	let registries = $state<TemplateRegistryConfig[]>([]);
	let localTemplateCount = $state(0);
	let remoteTemplateCount = $state(0);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	const templateService = new TemplateService();

	let newRegistryUrl = $state('');
	let newRegistryName = $state('');

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		try {
			registries = templateService.getRegistries();
			const templates = await templateService.loadAllTemplates();
			localTemplateCount = templates.filter((t) => !t.isRemote).length;
			remoteTemplateCount = templates.filter((t) => t.isRemote).length;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load template data';
		}
	}

	async function handleAddRegistry() {
		if (!newRegistryUrl || !newRegistryName) return;

		isLoading = true;
		error = null;

		try {
			const config: TemplateRegistryConfig = {
				url: newRegistryUrl,
				name: newRegistryName,
				enabled: true
			};

			// Test the registry before adding
			const registry = await templateRegistryService.fetchRegistry(config);
			if (!registry) {
				throw new Error('Failed to fetch registry or invalid format');
			}

			templateService.addRegistry(config);
			registries = templateService.getRegistries();

			newRegistryUrl = '';
			newRegistryName = '';

			await loadData(); // Refresh counts
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add registry';
		} finally {
			isLoading = false;
		}
	}

	async function handleRemoveRegistry(url: string) {
		templateService.removeRegistry(url);
		registries = templateService.getRegistries();
		await loadData(); // Refresh counts
	}

	async function handleRefreshRegistry(url: string) {
		isLoading = true;
		error = null;

		try {
			const config = registries.find((r) => r.url === url);
			if (!config) return;

			// Clear cache and refetch
			templateRegistryService.clearCache();
			const registry = await templateRegistryService.fetchRegistry(config);

			if (registry) {
				// Update last_updated timestamp
				config.last_updated = new Date().toISOString();
				await loadData(); // Refresh counts
			} else {
				throw new Error('Failed to refresh registry');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to refresh registry';
		} finally {
			isLoading = false;
		}
	}

	function clearError() {
		error = null;
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold">Template Settings</h1>
		<p class="text-muted-foreground">Manage Docker Compose template sources and registries</p>
	</div>

	<!-- Error Alert -->
	{#if error}
		<Alert.Root variant="destructive">
			<Alert.Title>Error</Alert.Title>
			<Alert.Description class="flex items-center justify-between">
				<span>{error}</span>
				<Button variant="ghost" size="sm" onclick={clearError}>Dismiss</Button>
			</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- Template Statistics -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<Card class="p-4">
			<div class="flex items-center gap-3">
				<FolderOpen class="size-8 text-blue-500" />
				<div>
					<p class="text-2xl font-bold">{localTemplateCount}</p>
					<p class="text-sm text-muted-foreground">Local Templates</p>
				</div>
			</div>
		</Card>
		<Card class="p-4">
			<div class="flex items-center gap-3">
				<Globe class="size-8 text-green-500" />
				<div>
					<p class="text-2xl font-bold">{remoteTemplateCount}</p>
					<p class="text-sm text-muted-foreground">Remote Templates</p>
				</div>
			</div>
		</Card>
		<Card class="p-4">
			<div class="flex items-center gap-3">
				<FileText class="size-8 text-purple-500" />
				<div>
					<p class="text-2xl font-bold">{registries.length}</p>
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
				Place your custom Docker Compose templates in the <code class="bg-muted px-1 rounded text-xs">data/templates/compose/</code> directory. Templates should be YAML files with a descriptive filename.
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
			<Alert.Description>Add remote template registries to access community templates. Registries should provide a JSON manifest with template metadata and download URLs.</Alert.Description>
		</Alert.Root>

		<!-- Add New Registry -->
		<Card class="p-4">
			<h3 class="font-medium mb-3">Add Registry</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div>
					<Label for="registry-name">Name</Label>
					<Input id="registry-name" bind:value={newRegistryName} placeholder="My Templates" disabled={isLoading} />
				</div>
				<div>
					<Label for="registry-url">Registry URL</Label>
					<Input id="registry-url" bind:value={newRegistryUrl} placeholder="https://example.com/templates.json" disabled={isLoading} />
				</div>
			</div>
			<Button onclick={handleAddRegistry} class="mt-3" disabled={!newRegistryUrl || !newRegistryName || isLoading}>
				<Plus class="size-4 mr-2" />
				{isLoading ? 'Adding...' : 'Add Registry'}
			</Button>
		</Card>

		<!-- Registry List -->
		{#if registries.length > 0}
			<div class="space-y-3">
				{#each registries as registry}
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
								<Button variant="outline" size="sm" onclick={() => handleRefreshRegistry(registry.url)} disabled={isLoading}>
									<RefreshCw class="size-4" />
								</Button>
								<Button variant="outline" size="sm" onclick={() => window.open(registry.url, '_blank')}>
									<ExternalLink class="size-4" />
								</Button>
								<Button variant="destructive" size="sm" onclick={() => handleRemoveRegistry(registry.url)} disabled={isLoading}>
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

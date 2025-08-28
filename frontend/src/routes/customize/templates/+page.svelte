<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Snippet } from '$lib/components/ui/snippet';
	import { Trash2, Plus, ExternalLink, RefreshCw, FileText, Globe, FolderOpen, Users } from '@lucide/svelte';
	import { templateAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';
	import AddTemplateRegistrySheet from '$lib/components/sheets/add-template-registry-sheet.svelte';
	import StatCard from '$lib/components/stat-card.svelte';

	let { data } = $props();

	let templates = $state(data.templates);
	let registries = $state(data.registries);

	let isLoading = $state({
		addingRegistry: false,
		removing: new Set<string>(),
		updating: new Set<string>()
	});

	let showAddRegistrySheet = $state(false);

	const localTemplateCount = $derived(templates.filter((t) => !t.isRemote).length);
	const remoteTemplateCount = $derived(templates.filter((t) => t.isRemote).length);

	async function updateRegistry(id: string, updates: { enabled?: boolean }) {
		if (isLoading.updating.has(id)) return;
		isLoading.updating.add(id);

		try {
			const registry = registries.find((r) => r.id === id);
			if (!registry) {
				toast.error('Registry not found');
				return;
			}

			await templateAPI.updateRegistry(id, {
				name: registry.name,
				url: registry.url,
				description: registry.description,
				enabled: updates.enabled ?? registry.enabled
			});

			registries = await templateAPI.getRegistries();
			toast.success('Registry updated successfully');
		} catch (error) {
			console.error('Error updating registry:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to update registry');
		} finally {
			isLoading.updating.delete(id);
		}
	}

	async function removeRegistry(id: string) {
		if (isLoading.removing.has(id)) return;
		isLoading.removing.add(id);

		try {
			await templateAPI.deleteRegistry(id);
			registries = registries.filter((r) => r.id !== id);
			registries = await templateAPI.getRegistries();
			toast.success('Registry removed successfully');
		} catch (error) {
			console.error('Error removing registry:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to remove registry');
		} finally {
			isLoading.removing.delete(id);
		}
	}

	async function refreshTemplates() {
		try {
			templates = await templateAPI.loadAll();
			toast.success('Templates refreshed successfully');
		} catch (error) {
			console.error('Error refreshing templates:', error);
			toast.error('Failed to refresh templates');
		}
	}

	async function handleRegistrySubmit(registry: { name: string; url: string; description?: string; enabled: boolean }) {
		isLoading.addingRegistry = true;

		try {
			const created = await templateAPI.addRegistry({
				name: registry.name.trim(),
				url: registry.url.trim(),
				description: registry.description?.trim() || undefined,
				enabled: registry.enabled
			});

			registries = await templateAPI.getRegistries();
			showAddRegistrySheet = false;

			toast.success('Registry added successfully');
		} catch (error) {
			console.error('Error adding registry:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to add registry');
		} finally {
			isLoading.addingRegistry = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Template Settings</h1>
			<p class="text-muted-foreground mt-1 text-sm">
				Manage Docker Compose template sources and registries
				<a href="https://arcane.ofkm.dev/docs/templates/use-templates" class="text-primary ml-1 hover:underline">→ Learn more</a>
			</p>
		</div>

		<Button onclick={refreshTemplates} class="h-10" variant="outline">
			<RefreshCw class="mr-2 size-4" />
			Refresh Templates
		</Button>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<StatCard
			title="Local Templates"
			value={localTemplateCount}
			icon={FolderOpen}
			iconColor="text-blue-500"
			class="border-l-4 border-l-blue-500"
		/>
		<StatCard
			title="Remote Templates"
			value={remoteTemplateCount}
			icon={Globe}
			iconColor="text-green-500"
			class="border-l-4 border-l-green-500"
		/>
		<StatCard
			title="Registries"
			value={registries.length}
			icon={FileText}
			iconColor="text-purple-500"
			class="border-l-4 border-l-purple-500"
		/>
	</div>

	<Separator />

	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-xl font-semibold">Template Registries</h2>
			<Button onclick={() => (showAddRegistrySheet = true)}>
				<Plus class="mr-2 size-4" />
				Add Registry
			</Button>
		</div>
		{#if registries.length == 0}
			<Alert.Root>
				<Globe class="size-4" />
				<Alert.Title>Remote Registries</Alert.Title>
				<Alert.Description
					>Add remote template registries to access community templates. Registries should provide a JSON manifest with template
					definitions and download URLs.</Alert.Description
				>
			</Alert.Root>

			<Alert.Root class="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
				<Users class="size-4" />
				<Alert.Title>Community Registry</Alert.Title>
				<Alert.Description class="space-y-2">
					<p>Get started quickly with our community registry containing popular templates:</p>
					<div class="flex w-full max-w-[475px] flex-col gap-2">
						<Snippet text="https://templates.arcane.ofkm.dev/registry.json" />
					</div>
				</Alert.Description>
			</Alert.Root>
		{/if}
		{#if registries.length > 0}
			<div class="space-y-3">
				{#each registries as registry}
					<Card class="p-4">
						<div class="flex items-center justify-between">
							<div class="flex-1">
								<div class="mb-1 flex items-center gap-2">
									<h4 class="font-medium">{registry.name}</h4>
									<Badge variant={registry.enabled ? 'default' : 'secondary'}>
										{registry.enabled ? 'Enabled' : 'Disabled'}
									</Badge>
								</div>
								<p class="text-muted-foreground break-all text-sm">{registry.url}</p>
								{#if registry.description}
									<p class="text-muted-foreground mt-1 text-sm">{registry.description}</p>
								{/if}
							</div>
							<div class="flex items-center gap-2">
								<Switch
									checked={registry.enabled}
									onCheckedChange={(checked) => updateRegistry(registry.id, { enabled: checked })}
									disabled={isLoading.updating.has(registry.id)}
								/>

								<Button variant="outline" size="sm" onclick={() => window.open(registry.url, '_blank')}>
									<ExternalLink class="size-4" />
								</Button>

								<Button
									variant="destructive"
									size="sm"
									onclick={() => removeRegistry(registry.id)}
									disabled={isLoading.removing.has(registry.id)}
								>
									{#if isLoading.removing.has(registry.id)}
										<RefreshCw class="size-4 animate-spin" />
									{:else}
										<Trash2 class="size-4" />
									{/if}
								</Button>
							</div>
						</div>
					</Card>
				{/each}
			</div>
		{:else}
			<div class="text-muted-foreground py-6 text-center">
				<Globe class="mx-auto mb-4 size-12 opacity-50" />
				<p class="mb-2">No registries configured</p>
				<p class="text-sm">Add a remote template registry to access community templates</p>
			</div>
		{/if}
	</div>

	<AddTemplateRegistrySheet
		bind:open={showAddRegistrySheet}
		onSubmit={handleRegistrySubmit}
		isLoading={isLoading.addingRegistry}
	/>
</div>

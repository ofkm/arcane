<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import {
		Trash2,
		Plus,
		ExternalLink,
		RefreshCw,
		FileText,
		Globe,
		FolderOpen,
		Users,
		Copy,
		AlertCircle,
		CheckCircle
	} from '@lucide/svelte';
	import type { PageData } from '../../settings/templates/$types';
	import { templateAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	// Reactive data
	let templates = $state(data.templates || []);
	let registries = $state(data.registries || []);

	// Form state for new registry
	let newRegistry = $state({
		name: '',
		url: '',
		description: '',
		enabled: true
	});

	// Loading states
	let isLoading = $state({
		addingRegistry: false,
		refreshing: new Set<number>(),
		removing: new Set<number>(),
		updating: new Set<number>(),
		validating: false
	});

	// Validation state
	let validationResult = $state<{
		valid: boolean;
		errors: string[];
		warnings: string[];
	} | null>(null);

	// Computed values
	const localTemplateCount = $derived(templates.filter((t) => !t.isRemote).length);
	const remoteTemplateCount = $derived(templates.filter((t) => t.isRemote).length);

	// Validate registry URL
	async function validateRegistryUrl(url: string) {
		if (!url.trim()) {
			validationResult = null;
			return;
		}

		isLoading.validating = true;
		try {
			new URL(url);

			const data = await templateAPI.fetchRegistry(url);

			if (!data.name || !data.templates || !Array.isArray(data.templates)) {
				throw new Error('Invalid registry format: missing required fields (name, templates)');
			}

			validationResult = {
				valid: true,
				errors: [],
				warnings: data.templates.length === 0 ? ['Registry contains no templates'] : []
			};

			if (!newRegistry.name.trim()) {
				newRegistry.name = data.name;
			}
		} catch (error) {
			validationResult = {
				valid: false,
				errors: [error instanceof Error ? error.message : 'Invalid registry URL'],
				warnings: []
			};
		} finally {
			isLoading.validating = false;
		}
	}

	// Add new registry
	async function addRegistry() {
		if (!newRegistry.url.trim() || !newRegistry.name.trim()) {
			toast.error('Registry URL and name are required');
			return;
		}

		if (validationResult && !validationResult.valid) {
			toast.error('Please fix validation errors before adding the registry');
			return;
		}

		if (isLoading.addingRegistry) return;
		isLoading.addingRegistry = true;

		try {
			const created = await templateAPI.addRegistry({
				name: newRegistry.name.trim(),
				url: newRegistry.url.trim(),
				description: newRegistry.description.trim() || undefined,
				enabled: newRegistry.enabled
			});

			registries = [...registries, created];

			// Clear form
			newRegistry = {
				name: '',
				url: '',
				description: '',
				enabled: true
			};
			validationResult = null;

			toast.success('Registry added successfully');
			await invalidateAll();
		} catch (error) {
			console.error('Error adding registry:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to add registry');
		} finally {
			isLoading.addingRegistry = false;
		}
	}

	// Update registry
	async function updateRegistry(id: number, updates: Partial<typeof newRegistry>) {
		if (isLoading.updating.has(id)) return;
		isLoading.updating.add(id);

		try {
			const registry = registries.find((r) => r.id === id);
			if (!registry) {
				toast.error('Registry not found');
				return;
			}

			await templateAPI.updateRegistry(id, {
				name: updates.name ?? registry.name,
				url: updates.url ?? registry.url,
				description: updates.description ?? registry.description,
				enabled: updates.enabled ?? registry.enabled
			});

			// Update local state
			registries = registries.map((r) => (r.id === id ? { ...r, ...updates } : r));

			toast.success('Registry updated successfully');
			await invalidateAll();
		} catch (error) {
			console.error('Error updating registry:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to update registry');
		} finally {
			isLoading.updating.delete(id);
		}
	}

	// Remove registry
	async function removeRegistry(id: number) {
		if (isLoading.removing.has(id)) return;
		isLoading.removing.add(id);

		try {
			await templateAPI.deleteRegistry(id);
			registries = registries.filter((r) => r.id !== id);
			toast.success('Registry removed successfully');
			await invalidateAll();
		} catch (error) {
			console.error('Error removing registry:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to remove registry');
		} finally {
			isLoading.removing.delete(id);
		}
	}

	// Refresh templates (reload all data)
	async function refreshTemplates() {
		try {
			await invalidateAll();
			toast.success('Templates refreshed successfully');
		} catch (error) {
			console.error('Error refreshing templates:', error);
			toast.error('Failed to refresh templates');
		}
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

	// Watch URL changes for validation
	$effect(() => {
		if (newRegistry.url.trim()) {
			const timeoutId = setTimeout(() => {
				validateRegistryUrl(newRegistry.url);
			}, 500); // Debounce validation

			return () => clearTimeout(timeoutId);
		} else {
			validationResult = null;
		}
	});
</script>

<svelte:head>
	<title>Template Settings - Arcane</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Template Settings</h1>
			<p class="text-muted-foreground mt-1 text-sm">
				Manage Docker Compose template sources and registries
				<a
					href="https://arcane.ofkm.dev/docs/templates/use-templates"
					class="text-primary ml-1 hover:underline">→ Learn more</a
				>
			</p>
		</div>

		<Button onclick={refreshTemplates} class="h-10" variant="outline">
			<RefreshCw class="mr-2 size-4" />
			Refresh Templates
		</Button>
	</div>

	<!-- Template Statistics -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<Card class="p-4">
			<div class="flex items-center gap-3">
				<FolderOpen class="size-8 text-blue-500" />
				<div>
					<p class="text-2xl font-bold">{localTemplateCount}</p>
					<p class="text-muted-foreground text-sm">Local Templates</p>
				</div>
			</div>
		</Card>
		<Card class="p-4">
			<div class="flex items-center gap-3">
				<Globe class="size-8 text-green-500" />
				<div>
					<p class="text-2xl font-bold">{remoteTemplateCount}</p>
					<p class="text-muted-foreground text-sm">Remote Templates</p>
				</div>
			</div>
		</Card>
		<Card class="p-4">
			<div class="flex items-center gap-3">
				<FileText class="size-8 text-purple-500" />
				<div>
					<p class="text-2xl font-bold">{registries.length}</p>
					<p class="text-muted-foreground text-sm">Registries</p>
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
			<Alert.Description
				>Local templates are stored in the database and can be managed through the templates page.
				You can create, edit, and delete custom templates that are stored locally on your server.</Alert.Description
			>
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
			<Alert.Description
				>Add remote template registries to access community templates. Registries should provide a
				JSON manifest with template definitions and download URLs.</Alert.Description
			>
		</Alert.Root>

		<Alert.Root class="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
			<Users class="size-4" />
			<Alert.Title>Community Registry</Alert.Title>
			<Alert.Description class="space-y-2">
				<p>Get started quickly with our community registry containing popular templates:</p>
				<div class="mt-2 flex items-center gap-2">
					<code class="rounded bg-white px-2 py-1 text-xs dark:bg-gray-800">
						https://templates.arcane.ofkm.dev/registry.json
					</code>
					<Button
						size="sm"
						variant="outline"
						onclick={() => copyToClipboard('https://templates.arcane.ofkm.dev/registry.json')}
					>
						<Copy class="mr-1 size-3" />
						Copy
					</Button>
				</div>
			</Alert.Description>
		</Alert.Root>

		<!-- Add New Registry Form -->
		<Card class="p-4">
			<h3 class="mb-3 font-medium">Add Registry</h3>
			<div class="space-y-4">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<Label for="registry-url">Registry URL *</Label>
						<Input
							id="registry-url"
							bind:value={newRegistry.url}
							type="url"
							placeholder="https://raw.githubusercontent.com/username/repo/main/registry.json"
							disabled={isLoading.addingRegistry}
							class={validationResult && !validationResult.valid ? 'border-red-500' : ''}
							required
						/>
						{#if isLoading.validating}
							<p class="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
								<RefreshCw class="size-3 animate-spin" />
								Validating...
							</p>
						{:else if validationResult}
							{#if validationResult.valid}
								<p class="mt-1 flex items-center gap-1 text-xs text-green-600">
									<CheckCircle class="size-3" />
									Valid registry
								</p>
							{:else}
								<p class="mt-1 flex items-center gap-1 text-xs text-red-600">
									<AlertCircle class="size-3" />
									{validationResult.errors[0]}
								</p>
							{/if}
						{/if}
					</div>
					<div>
						<Label for="registry-name">Registry Name *</Label>
						<Input
							id="registry-name"
							bind:value={newRegistry.name}
							placeholder="My Template Registry"
							disabled={isLoading.addingRegistry}
							required
						/>
						<p class="text-muted-foreground mt-1 text-xs">Auto-filled from registry manifest</p>
					</div>
				</div>

				<div>
					<Label for="registry-description">Description (Optional)</Label>
					<Textarea
						id="registry-description"
						bind:value={newRegistry.description}
						placeholder="A collection of useful Docker Compose templates"
						disabled={isLoading.addingRegistry}
						rows={2}
					/>
				</div>

				<div class="flex items-center gap-2">
					<Switch bind:checked={newRegistry.enabled} disabled={isLoading.addingRegistry} />
					<Label>Enable registry</Label>
				</div>

				{#if validationResult && validationResult.warnings.length > 0}
					<Alert.Root
						class="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950"
					>
						<AlertCircle class="size-4" />
						<Alert.Title>Warnings</Alert.Title>
						<Alert.Description>
							<ul class="list-inside list-disc">
								{#each validationResult.warnings as warning}
									<li>{warning}</li>
								{/each}
							</ul>
						</Alert.Description>
					</Alert.Root>
				{/if}

				<Button
					onclick={addRegistry}
					disabled={isLoading.addingRegistry ||
						!newRegistry.url.trim() ||
						!newRegistry.name.trim() ||
						(validationResult && !validationResult.valid)}
				>
					<Plus class="mr-2 size-4" />
					{isLoading.addingRegistry ? 'Adding Registry...' : 'Add Registry'}
				</Button>
			</div>
		</Card>

		<!-- Registry List -->
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
								<p class="text-muted-foreground text-sm break-all">{registry.url}</p>
								{#if registry.description}
									<p class="text-muted-foreground mt-1 text-sm">{registry.description}</p>
								{/if}
								<p class="text-muted-foreground mt-1 text-xs">
									Updated: {new Date(registry.updatedAt).toLocaleString()}
								</p>
							</div>
							<div class="flex items-center gap-2">
								<!-- Toggle enabled/disabled -->
								<Switch
									checked={registry.enabled}
									onCheckedChange={(checked) => updateRegistry(registry.id, { enabled: checked })}
									disabled={isLoading.updating.has(registry.id)}
								/>

								<!-- Open registry URL -->
								<Button
									variant="outline"
									size="sm"
									onclick={() => window.open(registry.url, '_blank')}
								>
									<ExternalLink class="size-4" />
								</Button>

								<!-- Remove registry -->
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
</div>

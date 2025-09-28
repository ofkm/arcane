<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Snippet } from '$lib/components/ui/snippet';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
	import UsersIcon from '@lucide/svelte/icons/users';
	import { toast } from 'svelte-sonner';
	import AddTemplateRegistrySheet from '$lib/components/sheets/add-template-registry-sheet.svelte';
	import { m } from '$lib/paraglide/messages';
	import { templateService } from '$lib/services/template-service.js';
	import { ResourcePageLayout, type ActionButton, type StatCardConfig } from '$lib/layouts/index.js';

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
				toast.error(m.templates_registry_not_found());
				return;
			}

			await templateService.updateRegistry(id, {
				name: registry.name,
				url: registry.url,
				description: registry.description,
				enabled: updates.enabled ?? registry.enabled
			});

			registries = await templateService.getRegistries();
			toast.success(m.registries_update_success());
		} catch (error) {
			console.error('Error updating registry:', error);
			toast.error(error instanceof Error ? error.message : m.registries_save_failed());
		} finally {
			isLoading.updating.delete(id);
		}
	}

	async function removeRegistry(id: string) {
		if (isLoading.removing.has(id)) return;
		isLoading.removing.add(id);

		try {
			const reg = registries.find((r) => r.id === id);
			await templateService.deleteRegistry(id);
			registries = registries.filter((r) => r.id !== id);
			registries = await templateService.getRegistries();
			toast.success(reg ? m.registries_delete_success({ url: reg.url }) : m.templates_registry_removed_success());
		} catch (error) {
			console.error('Error removing registry:', error);
			toast.error(error instanceof Error ? error.message : m.registries_save_failed());
		} finally {
			isLoading.removing.delete(id);
		}
	}

	async function refreshTemplates() {
		try {
			templates = await templateService.loadAll();
			toast.success(m.templates_refreshed());
		} catch (error) {
			console.error('Error refreshing templates:', error);
			toast.error(m.templates_refresh_failed());
		}
	}

	async function handleRegistrySubmit(registry: { name: string; url: string; description?: string; enabled: boolean }) {
		isLoading.addingRegistry = true;

		try {
			const created = await templateService.addRegistry({
				name: registry.name.trim(),
				url: registry.url.trim(),
				description: registry.description?.trim() || undefined,
				enabled: registry.enabled
			});

			registries = await templateService.getRegistries();
			showAddRegistrySheet = false;

			toast.success(m.registries_create_success());
		} catch (error) {
			console.error('Error adding registry:', error);
			toast.error(error instanceof Error ? error.message : m.registries_save_failed());
		} finally {
			isLoading.addingRegistry = false;
		}
	}

	const actionButtons: ActionButton[] = [
		{
			id: 'refresh',
			action: 'restart',
			label: m.templates_refresh(),
			onclick: refreshTemplates
		}
	];

	const statCards: StatCardConfig[] = $derived([
		{
			title: m.templates_local_templates(),
			value: localTemplateCount,
			icon: FolderOpenIcon,
			iconColor: 'text-blue-500',
			class: 'border-l-4 border-l-blue-500'
		},
		{
			title: m.templates_remote_templates(),
			value: remoteTemplateCount,
			icon: GlobeIcon,
			iconColor: 'text-green-500',
			class: 'border-l-4 border-l-green-500'
		},
		{
			title: m.templates_registries(),
			value: registries.length,
			icon: FileTextIcon,
			iconColor: 'text-purple-500',
			class: 'border-l-4 border-l-purple-500'
		}
	]);
</script>

<ResourcePageLayout
	title={m.templates_title()}
	subtitle={`${m.templates_subtitle()} `}
	{actionButtons}
	{statCards}
	statCardsColumns={3}
>
	{#snippet mainContent()}
		<div class="space-y-6">
			<Separator />

			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold">{m.templates_registries_section_title()}</h2>
					<Button onclick={() => (showAddRegistrySheet = true)}>
						<PlusIcon class="mr-2 size-4" />
						{m.registries_add_button()}
					</Button>
				</div>
				{#if registries.length == 0}
					<Alert.Root>
						<GlobeIcon class="size-4" />
						<Alert.Title>{m.templates_alert_remote_registries_title()}</Alert.Title>
						<Alert.Description>{m.templates_alert_remote_registries_description()}</Alert.Description>
					</Alert.Root>

					<Alert.Root class="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
						<UsersIcon class="size-4" />
						<Alert.Title>{m.templates_community_registry_title()}</Alert.Title>
						<Alert.Description class="space-y-2">
							<p>{m.templates_community_registry_description()}</p>
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
												{registry.enabled ? m.common_enabled() : m.common_disabled()}
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

										<Button
											variant="outline"
											size="sm"
											onclick={() => window.open(registry.url, '_blank', 'noopener,noreferrer')}
										>
											<ExternalLinkIcon class="size-4" />
										</Button>

										<Button
											variant="destructive"
											size="sm"
											onclick={() => removeRegistry(registry.id)}
											disabled={isLoading.removing.has(registry.id)}
										>
											{#if isLoading.removing.has(registry.id)}
												<RefreshCwIcon class="size-4 animate-spin" />
											{:else}
												<Trash2Icon class="size-4" />
											{/if}
										</Button>
									</div>
								</div>
							</Card>
						{/each}
					</div>
				{:else}
					<div class="text-muted-foreground py-6 text-center">
						<GlobeIcon class="mx-auto mb-4 size-12 opacity-50" />
						<p class="mb-2">{m.templates_no_registries_title()}</p>
						<p class="text-sm">{m.templates_no_registries_description()}</p>
					</div>
				{/if}
			</div>
		</div>
	{/snippet}

	{#snippet additionalContent()}
		<AddTemplateRegistrySheet
			bind:open={showAddRegistrySheet}
			onSubmit={handleRegistrySubmit}
			isLoading={isLoading.addingRegistry}
		/>
	{/snippet}
</ResourcePageLayout>

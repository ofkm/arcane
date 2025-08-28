<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { FileText, Globe, FolderOpen, Settings, Download, Loader2, ChevronDown, ChevronRight } from '@lucide/svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { templateAPI } from '$lib/services/api';
	import type { Template } from '$lib/types/template.type';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';

	import { toast } from 'svelte-sonner';

	interface Props {
		open: boolean;
		templates?: Template[];
		onSelect: (template: Template) => void;
		onDownloadSuccess?: () => void;
	}

	let { open = $bindable(), templates = [], onSelect, onDownloadSuccess }: Props = $props();

	let loadingStates = $state(new Map<string, boolean>());
	const allTemplates = $derived(templates ?? []);

	// UI state
	let sortBy = $state<'name-asc' | 'name-desc'>('name-asc');
	let groupByRegistry = $state(true);
	let openGroups = $state<Set<string>>(new Set());

	function normalizeTags(template: Template): string[] {
		const raw = template.metadata?.tags;
		let list: unknown = raw;

		if (typeof raw === 'string') {
			const s = raw.trim();
			if (s.startsWith('[')) {
				try {
					list = JSON.parse(s);
				} catch {
					list = s.split(',').map((t) => t.trim());
				}
			} else {
				list = s.split(',').map((t) => t.trim());
			}
		}

		const arr = Array.isArray(list) ? list : [];
		return arr
			.map((t) => String(t).trim())
			.filter(Boolean)
			.map((t) => t.replace(/^["']|["']$/g, '')) // strip quotes
			.map((t) => t.charAt(0).toUpperCase() + t.slice(1)); // capitalize first letter
	}

	function getRegistryName(t: Template): string {
		return t.registry?.name ?? (t.isRemote ? 'Remote' : 'Local');
	}

	function sortTemplates(items: Template[]): Template[] {
		const sorted = [...items];
		if (sortBy === 'name-asc') {
			sorted.sort((a, b) => a.name.localeCompare(b.name));
		} else {
			sorted.sort((a, b) => b.name.localeCompare(a.name));
		}
		return sorted;
	}

	type Group = { key: string; name: string; items: Template[] };

	const filters = {
		'name-asc': 'Name (A-Z)',
		'name-desc': 'Name (Z-A)'
	};

	const grouped: Group[] = $derived(
		!groupByRegistry
			? []
			: Array.from(
					allTemplates.reduce((map, t) => {
						const key = getRegistryName(t);
						const arr = map.get(key) ?? [];
						arr.push(t);
						map.set(key, arr);
						return map;
					}, new Map<string, Template[]>())
				)
					.map(([key, items]) => ({
						key,
						name: key,
						items: sortTemplates(items)
					}))
					.sort((a, b) => a.name.localeCompare(b.name))
	);

	async function handleSelect(template: Template) {
		loadingStates.set(template.id, true);
		loadingStates = new Map(loadingStates);

		try {
			const details = await templateAPI.getTemplateContent(template.id);
			if (!details?.content) {
				toast.error('Failed to load template content');
				return;
			}
			onSelect({
				...details.template,
				content: details.content,
				envContent: details.envContent
			});
			open = false;
			toast.success(`Template "${template.name}" loaded successfully!`);
		} catch (error) {
			console.error('Error loading template:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to load template content');
		} finally {
			loadingStates.delete(template.id);
			loadingStates = new Map(loadingStates);
		}
	}

	async function handleDownload(template: Template) {
		if (!template.isRemote) return;

		const templateId = template.id;
		loadingStates.set(`download-${templateId}`, true);
		loadingStates = new Map(loadingStates);

		try {
			const result = await templateAPI.download(templateId);

			if (result) {
				toast.success(`Template "${template.name}" downloaded successfully!`);
				onDownloadSuccess?.();
			} else {
				toast.error('Failed to download template');
			}
		} catch (error) {
			console.error('Error downloading template:', error);
			let errorMessage = 'Failed to download template';
			if (error instanceof Error) errorMessage = error.message;
			toast.error(errorMessage);
		} finally {
			loadingStates.delete(`download-${templateId}`);
			loadingStates = new Map(loadingStates);
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-screen overflow-y-auto sm:max-w-[900px]">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<FileText class="size-5" />
				Choose a Template
			</Dialog.Title>
			<Dialog.Description>
				Browse templates from your registries or local downloads. Scroll to see more, select to use immediately, or download for
				offline use.
			</Dialog.Description>
		</Dialog.Header>

		<div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-3">
				<SwitchWithLabel
					id="groupByRegistrySwitch"
					label="Group by registry"
					description="Enable Collapsible Sections for each registry"
					bind:checked={groupByRegistry}
				/>
			</div>
			<div class="flex items-center gap-3">
				<Label for="sortBy" class="whitespace-nowrap text-sm font-medium">Sort by</Label>
				<Select.Root bind:value={sortBy} type="single">
					<Select.Trigger id="sortBy" class="bg-background h-9 rounded-md border px-2 text-sm">
						{filters[sortBy]}
					</Select.Trigger>
					<Select.Content>
						{#each Object.entries(filters) as [value, label]}
							<Select.Item {value}>{label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>

		<div class="py-2">
			<ScrollArea class="max-h-[65vh]">
				{#if (allTemplates?.length ?? 0) === 0}
					<div class="text-muted-foreground py-10 text-center">
						<FileText class="mx-auto mb-4 size-12 opacity-50" />
						<p class="mb-2">No templates available</p>
						<p class="text-sm">
							Add a template registry in
							<a href="/settings/templates" class="text-primary hover:underline">Template Settings</a>
							to access community templates.
						</p>
					</div>
				{:else if groupByRegistry && grouped.length}
					<div class="space-y-3">
						{#each grouped as group}
							<Collapsible.Root class="w-full">
								<Card class="border-2">
									<Collapsible.Trigger class="flex w-full items-center justify-between px-4 py-3 text-left">
										<div class="flex items-center gap-2">
											<ChevronDown class="hidden size-4 data-[state=open]:block" />
											<ChevronRight class="block size-4 data-[state=open]:hidden" />
											<span class="font-semibold">{group.name}</span>
											<Badge variant="secondary" class="ml-2">{group.items.length}</Badge>
										</div>
									</Collapsible.Trigger>
									<Collapsible.Content>
										<div class="px-6 pb-6">
											<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
												{#each group.items as template}
													<Card class="hover:bg-muted/50 hover:border-primary/20 border transition-colors">
														<div class="p-4">
															<div class="mb-2 flex items-start justify-between gap-2">
																<h4 class="truncate pr-2 font-semibold">{template.name}</h4>
																<div class="ml-2 flex flex-shrink-0 flex-wrap items-center gap-1">
																	{#if template.metadata?.version}
																		<Badge variant="outline" class="text-xs">v{template.metadata.version}</Badge>
																	{/if}
																	{#if template.metadata?.envUrl || template.envContent}
																		<Badge variant="secondary" class="text-xs">
																			<Settings class="mr-1 size-3" />
																			ENV
																		</Badge>
																	{/if}
																</div>
															</div>

															<p class="text-muted-foreground mb-3 line-clamp-2 text-sm">
																{template.description}
															</p>

															{#if normalizeTags(template).length > 0}
																<div class="mb-3 flex flex-wrap gap-1">
																	{#each normalizeTags(template) as tag}
																		<Badge variant="outline" class="text-[10px]">{tag}</Badge>
																	{/each}
																</div>
															{/if}

															<div class="flex items-center justify-between gap-2">
																<div class="text-muted-foreground text-xs">
																	{template.isRemote ? 'Remote template' : 'Local template'}
																</div>
																<div class="flex gap-2">
																	{#if template.isRemote}
																		<Button
																			variant="outline"
																			size="sm"
																			onclick={() => handleDownload(template)}
																			disabled={loadingStates.get(`download-${template.id}`)}
																		>
																			{#if loadingStates.get(`download-${template.id}`)}
																				<Loader2 class="mr-1 size-3 animate-spin" />
																				Downloading...
																			{:else}
																				<Download class="mr-1 size-3" />
																				Download
																			{/if}
																		</Button>
																	{/if}
																	<Button
																		size="sm"
																		onclick={() => handleSelect(template)}
																		disabled={loadingStates.get(template.id)}
																	>
																		{#if loadingStates.get(template.id)}
																			<Loader2 class="mr-1 size-3 animate-spin" />
																			Loading...
																		{:else}
																			Use Now
																		{/if}
																	</Button>
																</div>
															</div>
														</div>
													</Card>
												{/each}
											</div>
										</div>
									</Collapsible.Content>
								</Card>
							</Collapsible.Root>
						{/each}
					</div>
				{:else}
					<!-- Flat grid (no grouping) -->
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						{#each sortTemplates(allTemplates) as template}
							<Card class="hover:bg-muted/50 hover:border-primary/20 border-2 transition-colors">
								<div class="p-4">
									<div class="mb-2 flex items-start justify-between gap-2">
										<h4 class="truncate pr-2 font-semibold">{template.name}</h4>
										<div class="ml-2 flex flex-shrink-0 flex-wrap items-center gap-1">
											{#if template.metadata?.version}
												<Badge variant="outline" class="text-xs">v{template.metadata.version}</Badge>
											{/if}
											{#if template.metadata?.envUrl || template.envContent}
												<Badge variant="secondary" class="text-xs">
													<Settings class="mr-1 size-3" />
													ENV
												</Badge>
											{/if}
										</div>
									</div>

									<div class="mb-2">
										<Badge variant="secondary" class="text-xs">
											{#if template.isRemote}
												<Globe class="mr-1 size-3" />
											{:else}
												<FolderOpen class="mr-1 size-3" />
											{/if}
											{getRegistryName(template)}
										</Badge>
									</div>

									<p class="text-muted-foreground mb-3 line-clamp-2 text-sm">
										{template.description}
									</p>

									{#if normalizeTags(template).length > 0}
										<div class="mb-3 flex flex-wrap gap-1">
											{#each normalizeTags(template) as tag}
												<Badge variant="outline" class="text-[10px]">{tag}</Badge>
											{/each}
										</div>
									{/if}

									<div class="flex items-center justify-between gap-2">
										<div class="text-muted-foreground text-xs">
											{template.isRemote ? 'Remote template' : 'Local template'}
										</div>
										<div class="flex gap-2">
											{#if template.isRemote}
												<Button
													variant="outline"
													size="sm"
													onclick={() => handleDownload(template)}
													disabled={loadingStates.get(`download-${template.id}`)}
												>
													{#if loadingStates.get(`download-${template.id}`)}
														<Loader2 class="mr-1 size-3 animate-spin" />
														Downloading...
													{:else}
														<Download class="mr-1 size-3" />
														Download
													{/if}
												</Button>
											{/if}
											<Button size="sm" onclick={() => handleSelect(template)} disabled={loadingStates.get(template.id)}>
												{#if loadingStates.get(template.id)}
													<Loader2 class="mr-1 size-3 animate-spin" />
													Loading...
												{:else}
													Use Now
												{/if}
											</Button>
										</div>
									</div>
								</div>
							</Card>
						{/each}
					</div>
				{/if}
			</ScrollArea>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>

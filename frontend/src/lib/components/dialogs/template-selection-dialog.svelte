<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import type { Template } from '$lib/types/template.type';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';

	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages';
	import { templateService } from '$lib/services/template-service';

	interface Props {
		open: boolean;
		templates?: Template[];
		onSelect: (template: Template) => void;
		onDownloadSuccess?: () => void;
	}

	let { open = $bindable(), templates = [], onSelect, onDownloadSuccess }: Props = $props();

	let loadingStates = $state(new Map<string, boolean>());
	const allTemplates = $derived(templates ?? []);

	let sortBy = $state<'name-asc' | 'name-desc'>('name-asc');
	let groupByRegistry = $state(true);

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
		return t.registry?.name ?? (t.isRemote ? m.templates_remote() : m.templates_local());
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
		'name-asc': m.templates_sort_name_asc(),
		'name-desc': m.templates_sort_name_desc()
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
			const details = await templateService.getTemplateContent(template.id);
			if (!details) {
				toast.error(m.templates_load_failed());
				return;
			}
			const compose = typeof details.content === 'string' ? details.content : '';
			const env = typeof details.envContent === 'string' ? details.envContent : '';
			onSelect({
				...details.template,
				content: compose,
				envContent: env
			});
			open = false;
			toast.success(m.templates_loaded_success({ name: template.name }));
		} catch (error) {
			console.error('Error loading template:', error);
			toast.error(error instanceof Error ? error.message : m.templates_load_failed());
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
			const result = await templateService.download(templateId);

			if (result) {
				toast.success(m.templates_downloaded_success({ name: template.name }));
				onDownloadSuccess?.();
			} else {
				toast.error(m.templates_download_failed());
			}
		} catch (error) {
			console.error('Error downloading template:', error);
			let errorMessage = m.templates_download_failed();
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
				<FileTextIcon class="size-5" />
				{m.templates_choose_title()}
			</Dialog.Title>
			<Dialog.Description>{m.templates_choose_description()}</Dialog.Description>
		</Dialog.Header>

		<div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-3">
				<SwitchWithLabel
					id="groupByRegistrySwitch"
					label={m.templates_group_by_registry_label()}
					description={m.templates_group_by_registry_description()}
					bind:checked={groupByRegistry}
				/>
			</div>
			<div class="flex items-center gap-3">
				<Label for="sortBy" class="whitespace-nowrap text-sm font-medium">{m.common_sort_by()}</Label>
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
						<FileTextIcon class="mx-auto mb-4 size-12 opacity-50" />
						<p class="mb-2">{m.templates_no_templates()}</p>
						<p class="text-sm">
							{m.templates_add_registry_prompt_part1()}
							<a href="/customize/templates" class="text-primary hover:underline">{m.templates_template_settings()}</a>
							{m.templates_add_registry_prompt_part2()}
						</p>
					</div>
				{:else if groupByRegistry && grouped.length}
					<div class="space-y-3">
						{#each grouped as group}
							<Collapsible.Root class="w-full">
								<Card class="border-2">
									<Collapsible.Trigger class="flex w-full items-center justify-between px-4 py-3 text-left">
										<div class="flex items-center gap-2">
											<ChevronDownIcon class="hidden size-4 data-[state=open]:block" />
											<ChevronRightIcon class="block size-4 data-[state=open]:hidden" />
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
																			<SettingsIcon class="mr-1 size-3" />
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
																	{template.isRemote ? m.templates_remote_template_label() : m.templates_local_template_label()}
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
																				<Spinner class="mr-1 size-3" />
																				{m.templates_downloading()}
																			{:else}
																				<DownloadIcon class="mr-1 size-3" />
																				{m.templates_download()}
																			{/if}
																		</Button>
																	{/if}
																	<Button
																		size="sm"
																		onclick={() => handleSelect(template)}
																		disabled={loadingStates.get(template.id)}
																	>
																		{#if loadingStates.get(template.id)}
																			<Spinner class="mr-1 size-3" />
																			{m.templates_loading()}
																		{:else}
																			{m.templates_use_now()}
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
													<SettingsIcon class="mr-1 size-3" />
													ENV
												</Badge>
											{/if}
										</div>
									</div>

									<div class="mb-2">
										<Badge variant="secondary" class="text-xs">
											{#if template.isRemote}
												<GlobeIcon class="mr-1 size-3" />
											{:else}
												<FolderOpenIcon class="mr-1 size-3" />
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
											{template.isRemote ? m.templates_remote_template_label() : m.templates_local_template_label()}
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
														<Spinner class="mr-1 size-3" />
														{m.templates_downloading()}
													{:else}
														<DownloadIcon class="mr-1 size-3" />
														{m.templates_download()}
													{/if}
												</Button>
											{/if}
											<Button size="sm" onclick={() => handleSelect(template)} disabled={loadingStates.get(template.id)}>
												{#if loadingStates.get(template.id)}
													<Spinner class="mr-1 size-3" />
													{m.templates_loading()}
												{:else}
													{m.templates_use_now()}
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
			<Button variant="outline" onclick={() => (open = false)}>{m.common_cancel()}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>

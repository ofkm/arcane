<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import SearchIcon from '@lucide/svelte/icons/search';
	import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import { m } from '$lib/paraglide/messages';
	import type { Template } from '$lib/types/template.type';

	let {
		templates,
		searchQuery = $bindable(''),
		onViewTemplate
	}: {
		templates: Template[];
		searchQuery: string;
		onViewTemplate: (template: Template) => void;
	} = $props();

	const filteredTemplates = $derived(
		templates.filter((t: Template) => {
			if (!searchQuery) return true;
			const query = searchQuery.toLowerCase();
			const tags = Array.isArray(t.metadata?.tags)
				? t.metadata.tags
				: typeof t.metadata?.tags === 'string'
					? [t.metadata.tags]
					: [];
			return (
				t.name?.toLowerCase().includes(query) ||
				t.description?.toLowerCase().includes(query) ||
				tags.some((tag: string) => tag.toLowerCase().includes(query))
			);
		})
	);

	const localTemplates = $derived(filteredTemplates.filter((t: Template) => !t.isRemote));
	const remoteTemplates = $derived(filteredTemplates.filter((t: Template) => t.isRemote));
</script>

<div class="space-y-6">
	<div class="relative">
		<SearchIcon class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
		<Input bind:value={searchQuery} placeholder={m.templates_search_placeholder()} class="pl-10" />
	</div>

	{#if filteredTemplates.length === 0}
		<div class="text-muted-foreground flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12">
			<LayersIcon class="mb-4 size-12 opacity-50" />
			<h3 class="mb-2 text-lg font-semibold">{m.templates_no_templates()}</h3>
			<p class="text-sm">
				{searchQuery ? 'Try a different search term' : 'Add a registry to get started with templates'}
			</p>
		</div>
	{:else}
		{#if localTemplates.length > 0}
			<div class="space-y-3">
				<div class="flex items-center gap-2">
					<FolderOpenIcon class="size-4 text-blue-500" />
					<h3 class="text-base font-semibold">{m.templates_local_templates()}</h3>
					<Badge variant="secondary" class="text-xs">{localTemplates.length}</Badge>
				</div>
				<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each localTemplates as template}
						<Card.Root variant="subtle" onclick={() => onViewTemplate(template)}>
							<Card.Content class="flex flex-col gap-2 p-3">
								<div class="flex items-start gap-3">
									<div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
										<FolderOpenIcon class="size-4 text-blue-500" />
									</div>
									<div class="min-w-0 flex-1">
										<h3 class="truncate text-sm leading-tight font-semibold" title={template.name}>
											{template.name}
										</h3>
										<p class="text-muted-foreground mt-1 line-clamp-2 text-xs">
											{template.description || 'No description available'}
										</p>
									</div>
								</div>
								{#if template.metadata?.tags && template.metadata.tags.length > 0}
									{@const tags = template.metadata.tags}
									<div class="flex flex-wrap gap-1">
										{#each tags.slice(0, 3) as tag}
											<Badge variant="outline" class="text-[10px]">{tag}</Badge>
										{/each}
										{#if tags.length > 3}
											<Badge variant="outline" class="text-[10px]">+{tags.length - 3}</Badge>
										{/if}
									</div>
								{/if}
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			</div>
		{/if}

		{#if remoteTemplates.length > 0}
			<div class="space-y-3">
				<div class="flex items-center gap-2">
					<GlobeIcon class="size-4 text-green-500" />
					<h3 class="text-base font-semibold">{m.templates_remote_templates()}</h3>
					<Badge variant="secondary" class="text-xs">{remoteTemplates.length}</Badge>
				</div>
				<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each remoteTemplates as template}
						<Card.Root variant="subtle" onclick={() => onViewTemplate(template)}>
							<Card.Content class="flex flex-col gap-2 p-4">
								<div class="flex items-start gap-3">
									<div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
										<GlobeIcon class="size-4 text-green-500" />
									</div>
									<div class="min-w-0 flex-1">
										<h3 class="truncate text-sm leading-tight font-semibold" title={template.name}>
											{template.name}
										</h3>
										<p class="text-muted-foreground mt-1 line-clamp-3 text-xs">
											{template.description || 'No description available'}
										</p>
									</div>
								</div>
								{#if template.metadata?.tags && (Array.isArray(template.metadata.tags) ? template.metadata.tags.length > 0 : true)}
									{@const tags = Array.isArray(template.metadata.tags) ? template.metadata.tags : [template.metadata.tags]}
									<div class="flex flex-wrap gap-1">
										{#each tags.slice(0, 3) as tag}
											<Badge variant="outline" class="text-[10px]">{tag}</Badge>
										{/each}
										{#if tags.length > 3}
											<Badge variant="outline" class="text-[10px]">+{tags.length - 3}</Badge>
										{/if}
									</div>
								{/if}
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

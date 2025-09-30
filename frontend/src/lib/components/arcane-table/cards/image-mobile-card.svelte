<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import ImageUpdateItem from '$lib/components/image-update-item.svelte';
	import { format } from 'date-fns';
	import bytes from 'bytes';
	import type { ImageSummaryDto } from '$lib/types/image.type';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';

	let {
		item,
		rowActions,
		showUpdateInfo = true,
		showSize = true,
		showCreated = true,
		class: className = '',
		onclick
	}: {
		item: ImageSummaryDto;
		rowActions?: Snippet<[{ item: ImageSummaryDto }]>;
		showUpdateInfo?: boolean;
		showSize?: boolean;
		showCreated?: boolean;
		class?: string;
		onclick?: (item: ImageSummaryDto) => void;
	} = $props();

	function extractRepoAndTag(repoTags: string[]) {
		if (!repoTags || repoTags.length === 0) return { repo: '<none>', tag: '<none>' };
		const [repo, tag] = repoTags[0].split(':');
		return { repo: repo || '<none>', tag: tag || '<none>' };
	}

	function handleClick(e: MouseEvent) {
		if (onclick) {
			// Check if the clicked element is interactive (button, link, or has onclick)
			const target = e.target as HTMLElement;
			const isInteractive = target.closest('button, a, [onclick], [role="button"]');

			if (!isInteractive) {
				onclick(item);
			}
		}
	}
</script>

<Card.Root
	class={cn('p-4', onclick ? 'hover:bg-muted/50 cursor-pointer transition-colors' : '', className)}
	onclick={onclick ? handleClick : undefined}
>
	<Card.Content class="p-0">
		<div class="space-y-3">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0 flex-1">
					{#if item.repoTags && item.repoTags.length > 0 && item.repoTags[0] !== '<none>:<none>'}
						<a class="block truncate text-base font-medium hover:underline" href="/images/{item.id}/">
							{item.repoTags[0]}
						</a>
					{:else}
						<span class="text-muted-foreground text-base italic">{m.images_untagged()}</span>
					{/if}
					<div class="text-muted-foreground truncate font-mono text-sm">
						{String(item.id).substring(0, 12)}
					</div>
				</div>
				<div class="flex flex-shrink-0 items-center gap-2">
					{#if item.inUse}
						<StatusBadge text={m.common_in_use()} variant="green" />
					{:else}
						<StatusBadge text={m.common_unused()} variant="amber" />
					{/if}
					{#if rowActions}
						{@render rowActions({ item })}
					{/if}
				</div>
			</div>

			<div class="space-y-2">
				{#if showSize}
					<div class="flex items-start justify-between gap-2">
						<span class="text-muted-foreground min-w-0 flex-shrink-0 text-sm font-medium">
							{m.images_size()}:
						</span>
						<span class="min-w-0 flex-1 text-right text-sm">
							{bytes.format(Number(item.size ?? 0))}
						</span>
					</div>
				{/if}

				{#if showCreated}
					<div class="flex items-start justify-between gap-2">
						<span class="text-muted-foreground min-w-0 flex-shrink-0 text-sm font-medium">
							{m.common_created()}:
						</span>
						<span class="min-w-0 flex-1 text-right text-sm">
							{format(new Date(Number(item.created || 0) * 1000), 'PP p')}
						</span>
					</div>
				{/if}

				{#if showUpdateInfo && item.updateInfo}
					<div class="flex items-start justify-between gap-2">
						<span class="text-muted-foreground min-w-0 flex-shrink-0 text-sm font-medium">
							{m.images_updates()}:
						</span>
						<div class="min-w-0 flex-1 text-right text-sm">
							{#if item.repoTags}
								{@const { repo, tag } = extractRepoAndTag(item.repoTags)}
								<ImageUpdateItem updateInfo={item.updateInfo} imageId={item.id} {repo} {tag} />
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</Card.Content>
</Card.Root>

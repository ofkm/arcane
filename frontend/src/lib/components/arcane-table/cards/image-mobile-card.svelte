<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import ImageUpdateItem from '$lib/components/image-update-item.svelte';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import { format } from 'date-fns';
	import bytes from 'bytes';
	import type { ImageSummaryDto } from '$lib/types/image.type';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import ImageIcon from '@lucide/svelte/icons/image';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import { truncateString } from '$lib/utils/string.utils';

	let {
		item,
		rowActions,
		compact = false,
		class: className = '',
		showId = false,
		showRepoTags = true,
		showSize = true,
		showCreated = true,
		showInUse = true,
		showUpdates = true,
		onclick
	}: {
		item: ImageSummaryDto;
		rowActions?: Snippet<[{ item: ImageSummaryDto }]>;
		compact?: boolean;
		class?: string;
		showId?: boolean;
		showRepoTags?: boolean;
		showSize?: boolean;
		showCreated?: boolean;
		showInUse?: boolean;
		showUpdates?: boolean;
		onclick?: (item: ImageSummaryDto) => void;
	} = $props();

	function extractRepoAndTag(repoTags: string[]) {
		if (!repoTags || repoTags.length === 0) return { repo: '<none>', tag: '<none>' };
		const [repo, tag] = repoTags[0].split(':');
		return { repo: repo || '<none>', tag: tag || '<none>' };
	}

	function getIconVariant(inUse: boolean): 'emerald' | 'amber' {
		return inUse ? 'emerald' : 'amber';
	}

	const iconVariant = $derived(getIconVariant(item.inUse));
	const imageDisplay = $derived(
		item.repoTags && item.repoTags.length > 0 && item.repoTags[0] !== '<none>:<none>' ? item.repoTags[0] : m.images_untagged()
	);
	const isUntagged = $derived(!item.repoTags || item.repoTags.length === 0 || item.repoTags[0] === '<none>:<none>');
</script>

<Card.Root variant="subtle" class={className} onclick={onclick ? () => onclick(item) : undefined}>
	<Card.Content class={cn('flex flex-col', compact ? 'gap-1.5 p-2' : 'gap-3 p-4')}>
		<div class="flex items-start gap-3">
			<div
				class={cn(
					'flex shrink-0 items-center justify-center rounded-lg',
					compact ? 'size-7' : 'size-9',
					iconVariant === 'emerald' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
				)}
			>
				<ImageIcon
					class={cn(iconVariant === 'emerald' ? 'text-emerald-500' : 'text-amber-500', compact ? 'size-3.5' : 'size-4')}
				/>
			</div>
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-3">
					<h3
						class={cn(
							'truncate leading-tight font-semibold',
							compact ? 'text-[13px]' : 'text-base',
							isUntagged ? 'text-muted-foreground italic' : ''
						)}
					>
						{imageDisplay}
					</h3>
					{#if showUpdates && item.updateInfo && item.repoTags}
						{@const { repo, tag } = extractRepoAndTag(item.repoTags)}
						<div class="flex-shrink-0">
							<ImageUpdateItem updateInfo={item.updateInfo} imageId={item.id} {repo} {tag} />
						</div>
					{/if}
				</div>
				{#if showId}
					<div class="text-muted-foreground mt-0.5 flex items-center gap-2">
						<span class={cn('truncate font-mono', compact ? 'text-[10px]' : 'text-xs')}>
							{compact ? truncateString(String(item.id), 18) : item.id}
						</span>
					</div>
				{/if}
			</div>
			<div class="flex flex-shrink-0 items-center gap-2">
				{#if showInUse}
					{#if item.inUse}
						<StatusBadge text={m.common_in_use()} variant="green" size="sm" />
					{:else}
						<StatusBadge text={m.common_unused()} variant="amber" size="sm" />
					{/if}
				{/if}
				{#if rowActions}
					{@render rowActions({ item })}
				{/if}
			</div>
		</div>

		{#if !compact}
			<div class="flex flex-wrap gap-x-4 gap-y-3">
				{#if showSize}
					<div class="flex min-w-0 flex-1 basis-[160px] items-start gap-2.5">
						<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
							<HardDriveIcon class="size-3.5 text-blue-500" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
								{m.images_size()}
							</div>
							<div class="mt-0.5 text-xs font-medium">
								{bytes.format(Number(item.size ?? 0))}
							</div>
						</div>
					</div>
				{/if}

				{#if showRepoTags && !isUntagged}
					<div class="flex min-w-0 flex-1 basis-[200px] items-start gap-2.5">
						<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
							<ImageIcon class="size-3.5 text-purple-500" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
								{m.images_repository()}
							</div>
							<div class="mt-0.5 truncate text-xs font-medium">
								{item.repoTags?.[0] || m.images_untagged()}
							</div>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			{#if showRepoTags && !isUntagged}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.images_repository()}:</span>
					<span class="text-muted-foreground min-w-0 flex-1 truncate text-[11px] leading-tight">
						{item.repoTags?.[0] || m.images_untagged()}
					</span>
				</div>
			{/if}
			{#if showSize}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.images_size()}:</span>
					<span class="text-muted-foreground truncate text-[11px] leading-tight">
						{bytes.format(Number(item.size ?? 0))}
					</span>
				</div>
			{/if}
			{#if showCreated}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_created()}:</span>
					<span class="text-muted-foreground truncate font-mono text-[11px] leading-tight">
						{format(new Date(Number(item.created || 0) * 1000), 'PP')}
					</span>
				</div>
			{/if}
		{/if}
	</Card.Content>
	{#if !compact && showCreated}
		<Card.Footer class="flex items-center gap-2 border-t-1 py-3">
			<ClockIcon class="text-muted-foreground size-3.5" />
			<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
				{m.common_created()}
			</span>
			<span class="text-muted-foreground ml-auto font-mono text-[11px]">
				{format(new Date(Number(item.created || 0) * 1000), 'PP p')}
			</span>
		</Card.Footer>
	{/if}
</Card.Root>

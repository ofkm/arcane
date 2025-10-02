<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import ImageUpdateItem from '$lib/components/image-update-item.svelte';
	import { format } from 'date-fns';
	import bytes from 'bytes';
	import type { ImageSummaryDto } from '$lib/types/image.type';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import { ArcaneCard, ArcaneCardHeader } from '$lib/components/arcane-card';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import DatabaseIcon from '@lucide/svelte/icons/database';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

	let {
		item,
		rowActions,
		compact = false,
		class: className = '',
		showCreated = true,
		showSize = true,
		showUpdateInfo = true,
		onclick
	}: {
		item: ImageSummaryDto;
		rowActions?: Snippet<[{ item: ImageSummaryDto }]>;
		compact?: boolean;
		class?: string;
		showCreated?: boolean;
		showSize?: boolean;
		showUpdateInfo?: boolean;
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

<ArcaneCard class={className} onclick={onclick ? () => onclick(item) : undefined}>
	{#snippet children()}
		<ArcaneCardHeader icon={HardDriveIcon} {iconVariant} {compact} enableHover={!!onclick}>
			{#snippet children()}
				<div class="min-w-0 flex-1">
					<h3
						class={cn(
							'truncate leading-tight font-semibold',
							compact ? 'text-[13px]' : 'text-base',
							isUntagged ? 'text-muted-foreground italic' : ''
						)}
					>
						{imageDisplay}
					</h3>
					<div class="text-muted-foreground mt-0.5 flex items-center gap-2">
						<span class={cn('truncate font-mono', compact ? 'text-[10px]' : 'text-xs')}>
							{String(item.id).substring(0, 12)}
						</span>
					</div>
				</div>

				<div class="flex flex-shrink-0 items-center gap-2">
					{#if item.inUse}
						<StatusBadge text={m.common_in_use()} variant="green" size="sm" />
					{:else}
						<StatusBadge text={m.common_unused()} variant="amber" size="sm" />
					{/if}
					{#if rowActions}
						{@render rowActions({ item })}
					{/if}
				</div>
			{/snippet}
		</ArcaneCardHeader>

		{#if !compact}
			<Card.Content class="flex flex-1 flex-col p-3.5">
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					{#if showSize}
						<div class="flex items-start gap-2.5">
							<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
								<DatabaseIcon class="size-3.5 text-blue-500" />
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

					{#if showUpdateInfo && item.updateInfo}
						<div class="flex items-start gap-2.5">
							<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
								<RefreshCwIcon class="size-3.5 text-amber-500" />
							</div>
							<div class="min-w-0 flex-1">
								<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
									{m.images_updates()}
								</div>
								<div class="mt-1">
									{#if item.repoTags}
										{@const { repo, tag } = extractRepoAndTag(item.repoTags)}
										<ImageUpdateItem updateInfo={item.updateInfo} imageId={item.id} {repo} {tag} />
									{/if}
								</div>
							</div>
						</div>
					{/if}
				</div>

				{#if showCreated}
					<div class="border-muted/40 mt-3 flex items-center gap-2 border-t pt-3">
						<ClockIcon class="text-muted-foreground size-3.5" />
						<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
							{m.common_created()}
						</span>
						<span class="text-muted-foreground ml-auto font-mono text-[11px]">
							{format(new Date(Number(item.created || 0) * 1000), 'PP p')}
						</span>
					</div>
				{/if}
			</Card.Content>
		{:else}
			<Card.Content class="flex flex-1 flex-col space-y-1.5 p-2">
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
				{#if showUpdateInfo && item.updateInfo}
					<div class="flex items-baseline gap-1.5">
						<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.images_updates()}:</span>
						<div class="min-w-0 flex-1">
							{#if item.repoTags}
								{@const { repo, tag } = extractRepoAndTag(item.repoTags)}
								<ImageUpdateItem updateInfo={item.updateInfo} imageId={item.id} {repo} {tag} />
							{/if}
						</div>
					</div>
				{/if}
			</Card.Content>
		{/if}
	{/snippet}
</ArcaneCard>

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { truncateString } from '$lib/utils/string.utils';
	import type { ContainerRegistry } from '$lib/types/container-registry.type';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import PackageIcon from '@lucide/svelte/icons/package';
	import LinkIcon from '@lucide/svelte/icons/link';
	import UserIcon from '@lucide/svelte/icons/user';

	let {
		item,
		rowActions,
		compact = false,
		class: className = '',
		showUrl = true,
		showUsername = true,
		onclick
	}: {
		item: ContainerRegistry;
		rowActions?: Snippet<[{ item: ContainerRegistry }]>;
		compact?: boolean;
		class?: string;
		showUrl?: boolean;
		showUsername?: boolean;
		onclick?: (item: ContainerRegistry) => void;
	} = $props();
</script>

<Card.Root variant="subtle" class={className} onclick={onclick ? () => onclick(item) : undefined}>
	<Card.Content class={cn('flex flex-col', compact ? 'gap-1.5 p-2' : 'gap-3 p-4')}>
		<div class="flex items-start gap-3">
			<div class={cn('flex shrink-0 items-center justify-center rounded-lg bg-purple-500/10', compact ? 'size-7' : 'size-9')}>
				<PackageIcon class={cn('text-purple-500', compact ? 'size-3.5' : 'size-4')} />
			</div>
			<div class="min-w-0 flex-1">
				<h3 class={cn('truncate leading-tight font-semibold', compact ? 'text-sm' : 'text-base')} title={item.url}>
					{compact ? truncateString(item.url, 30) : item.url}
				</h3>
				<p class={cn('text-muted-foreground mt-0.5 truncate', compact ? 'text-[10px]' : 'text-xs')}>
					{item.username || 'No username'}
				</p>
			</div>
			<div class="flex flex-shrink-0 items-center gap-2">
				<StatusBadge variant="purple" text={m.common_registry()} size="sm" />
				{#if rowActions}
					{@render rowActions({ item })}
				{/if}
			</div>
		</div>

		{#if !compact}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#if showUrl}
					<div class="flex items-start gap-2.5">
						<div class="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg">
							<LinkIcon class="text-muted-foreground size-3.5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.registries_url()}</div>
							<div class="mt-0.5 truncate text-xs font-medium">
								{item.url}
							</div>
						</div>
					</div>
				{/if}
				{#if showUsername && item.username}
					<div class="flex items-start gap-2.5">
						<div class="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg">
							<UserIcon class="text-muted-foreground size-3.5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_username()}</div>
							<div class="mt-0.5 truncate text-xs font-medium">
								{item.username}
							</div>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			{#if showUrl}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.registries_url()}:</span>
					<span class="text-muted-foreground min-w-0 flex-1 truncate text-[11px] leading-tight">
						{item.url}
					</span>
				</div>
			{/if}
			{#if showUsername && item.username}
				<div class="flex items-baseline gap-1.5">
					<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_username()}:</span>
					<span class="text-muted-foreground truncate text-[11px] leading-tight">
						{item.username}
					</span>
				</div>
			{/if}
		{/if}
	</Card.Content>
</Card.Root>

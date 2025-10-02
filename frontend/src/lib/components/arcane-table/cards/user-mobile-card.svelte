<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { truncateString } from '$lib/utils/string.utils';
	import type { User } from '$lib/types/user.type';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import UserIcon from '@lucide/svelte/icons/user';
	import MailIcon from '@lucide/svelte/icons/mail';

	let {
		item,
		rowActions,
		compact = false,
		class: className = '',
		showDisplayName = true,
		showEmail = true,
		showRole = true,
		getRoleBadgeVariant,
		getRoleText,
		onclick
	}: {
		item: User;
		rowActions?: Snippet<[{ item: User }]>;
		compact?: boolean;
		class?: string;
		showDisplayName?: boolean;
		showEmail?: boolean;
		showRole?: boolean;
		getRoleBadgeVariant?: (roles: string[]) => 'red' | 'green';
		getRoleText?: (roles: string[]) => string;
		onclick?: (item: User) => void;
	} = $props();
</script>

<Card.Root variant="subtle" class={className} onclick={onclick ? () => onclick(item) : undefined}>
	<Card.Content class={cn('flex flex-col', compact ? 'gap-1.5 p-2' : 'gap-3 p-4')}>
		<div class="flex items-start gap-3">
			<div class={cn('flex shrink-0 items-center justify-center rounded-lg bg-blue-500/10', compact ? 'size-7' : 'size-9')}>
				<UserIcon class={cn('text-blue-500', compact ? 'size-3.5' : 'size-4')} />
			</div>
			<div class="min-w-0 flex-1">
				<h3 class={cn('truncate leading-tight font-semibold', compact ? 'text-sm' : 'text-base')} title={item.username}>
					{item.username}
				</h3>
				<p class={cn('text-muted-foreground mt-0.5 truncate', compact ? 'text-[10px]' : 'text-xs')}>
					{compact ? truncateString(item.email, 12) : item.email || 'No email'}
				</p>
			</div>
			<div class="flex flex-shrink-0 items-center gap-2">
				{#if showRole && getRoleBadgeVariant && getRoleText}
					<StatusBadge variant={getRoleBadgeVariant(item.roles)} text={getRoleText(item.roles)} size="sm" />
				{/if}
				{#if rowActions}
					{@render rowActions({ item })}
				{/if}
			</div>
		</div>

		{#if !compact}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#if showDisplayName && item.displayName}
					<div class="flex items-start gap-2.5">
						<div class="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg">
							<UserIcon class="text-muted-foreground size-3.5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_display_name()}</div>
							<div class="mt-0.5 truncate text-xs font-medium">
								{item.displayName}
							</div>
						</div>
					</div>
				{/if}
			</div>
		{:else if showDisplayName && item.displayName}
			<div class="flex items-baseline gap-1.5">
				<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_display_name()}:</span>
				<span class="text-muted-foreground min-w-0 flex-1 truncate text-[11px] leading-tight">
					{item.displayName}
				</span>
			</div>
		{/if}
	</Card.Content>
</Card.Root>

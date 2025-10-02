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
	import ShieldIcon from '@lucide/svelte/icons/shield';

	let {
		item,
		rowActions,
		compact = false,
		class: className = '',
		showEmail = true,
		showRole = true,
		onclick
	}: {
		item: User;
		rowActions?: Snippet<[{ item: User }]>;
		compact?: boolean;
		class?: string;
		showEmail?: boolean;
		showRole?: boolean;
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
					{compact ? truncateString(item.username, 25) : item.username}
				</h3>
				<p class={cn('text-muted-foreground mt-0.5 truncate', compact ? 'text-[10px]' : 'text-xs')}>
					{item.email || 'No email'}
				</p>
			</div>
			<div class="flex flex-shrink-0 items-center gap-2">
				{#if showRole}
					<StatusBadge variant="blue" text={m.common_user()} size="sm" />
				{/if}
				{#if rowActions}
					{@render rowActions({ item })}
				{/if}
			</div>
		</div>

		{#if !compact}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#if showEmail && item.email}
					<div class="flex items-start gap-2.5">
						<div class="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg">
							<MailIcon class="text-muted-foreground size-3.5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_email()}</div>
							<div class="mt-0.5 truncate text-xs font-medium">
								{item.email}
							</div>
						</div>
					</div>
				{/if}
				{#if showRole}
					<div class="flex items-start gap-2.5">
						<div class="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg">
							<ShieldIcon class="text-muted-foreground size-3.5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_role()}</div>
							<div class="mt-0.5 text-xs font-medium">
								<StatusBadge variant="blue" text={m.common_user()} />
							</div>
						</div>
					</div>
				{/if}
			</div>
		{:else if showEmail && item.email}
			<div class="flex items-baseline gap-1.5">
				<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{m.common_email()}:</span>
				<span class="text-muted-foreground min-w-0 flex-1 truncate text-[11px] leading-tight">
					{item.email}
				</span>
			</div>
		{/if}
	</Card.Content>
</Card.Root>

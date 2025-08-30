<script lang="ts" generics="TFilters extends Record<string, any>">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import FunnelIcon from '@lucide/svelte/icons/funnel';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let {
		filters = $bindable(),
		children,
		label = 'Filter',
		icon = FunnelIcon,
		variant = 'outline',
		align = 'end',
		class: className = ''
	}: {
		filters: TFilters;
		children: Snippet<[{ filters: TFilters }]>;
		label?: string;
		icon?: any;
		variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
		align?: 'start' | 'center' | 'end';
		class?: string;
	} = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			{@const Icon = icon}
			<Button {...props} {variant} class={cn('', className)}>
				<Icon class="size-4" />
				{label}
				<ChevronDownIcon class="size-4" />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="border-primary" {align}>
		{@render children({ filters })}
	</DropdownMenu.Content>
</DropdownMenu.Root>

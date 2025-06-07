<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { cn } from '$lib/utils.js';
	import type { Icon as IconType } from '@lucide/svelte';

	interface Props {
		title: string;
		value: string | number;
		icon: typeof IconType;
		iconColor?: string;
		bgColor?: string;
		subtitle?: string;
		class?: string;
	}

	let { title, value, icon: Icon, iconColor = 'text-primary', bgColor = 'bg-primary/10', subtitle, class: className }: Props = $props();
</script>

<Card.Root class={cn('', className)}>
	<Card.Content class="p-4 flex items-center justify-between">
		<div>
			<p class="text-sm font-medium text-muted-foreground">{title}</p>
			<p class="text-2xl font-bold">{value}</p>
			{#if subtitle}
				<p class="text-xs text-muted-foreground mt-1">{subtitle}</p>
			{/if}
		</div>
		<div class="p-2 rounded-full {bgColor}">
			<Icon class="{iconColor} size-5" />
		</div>
	</Card.Content>
</Card.Root>

<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		children
	}: {
		class?: string;
		children?: any;
	} = $props();
</script>

<Card.Title class={cn('text-lg', className)}>
	{@render children?.()}
</Card.Title>


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

<Card.Content class={cn('bg-card/90', className)}>
	{@render children?.()}
</Card.Content>


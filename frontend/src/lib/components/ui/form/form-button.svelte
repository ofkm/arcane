<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	interface Props {
		ref?: HTMLButtonElement | null;
		variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
		size?: 'default' | 'sm' | 'lg' | 'icon';
		disabled?: boolean;
		class?: string;
		onclick?: () => void;
		children?: import('svelte').Snippet;
	}

	let {
		ref = $bindable(null),
		variant,
		size,
		disabled,
		class: className,
		onclick,
		children
	}: Props = $props();
</script>

<Button bind:ref type="submit" {variant} {size} {disabled} class={className} {onclick}>
	{@render children?.()}
</Button>

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';

	let {
		message,
		status,
		title = 'Uh‑oh, something went wrong',
		showButton = true,
		actionHref = '/dashboard',
		actionLabel = 'Go to Dashboard'
	}: {
		message: string;
		status?: number;
		title?: string;
		showButton?: boolean;
		actionHref?: string;
		actionLabel?: string;
	} = $props();
</script>

<div class="grid h-full min-h-screen place-items-center px-6">
	<div class="w-full max-w-md text-center">
		<div class="bg-destructive/10 mx-auto mb-4 flex size-14 items-center justify-center rounded-full">
			<CircleXIcon class="text-destructive size-7" aria-hidden="true" />
		</div>

		<h1 class="text-2xl font-semibold">{title}</h1>
		{#if status !== undefined && status !== null}
			<p class="text-muted-foreground mt-2 max-w-md text-sm">
				<span class="font-semibold">{status}</span>
				<span class="mx-1">-</span>
				<span>{message}</span>
			</p>
		{:else}
			<p class="text-muted-foreground mt-2 max-w-md">{message}</p>
		{/if}

		{#if showButton}
			<div class="mt-5 flex items-center justify-center gap-2">
				<Button href={actionHref}>{actionLabel}</Button>
			</div>
		{/if}
	</div>
</div>

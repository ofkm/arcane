<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { CheckCircle } from '@lucide/svelte';
</script>

<div class="mx-auto max-w-2xl text-center">
	<div class="mb-6 flex justify-center">
		<div class="rounded-full bg-green-100 p-4 dark:bg-green-900/20">
			<CheckCircle class="size-12 text-green-600 dark:text-green-400" />
		</div>
	</div>

	<h1 class="mb-6 text-3xl font-bold">Setup Complete!</h1>

	<div class="prose dark:prose-invert mx-auto mb-8 max-w-xl">
		<p>Congratulations! You've successfully completed the initial setup for Arcane.</p>
		<p>You can now start using the application to manage your Docker containers and compose stacks.</p>
	</div>

	<Button onclick={() => goto('/', { invalidateAll: true })} size="lg">Go to Dashboard</Button>
</div>

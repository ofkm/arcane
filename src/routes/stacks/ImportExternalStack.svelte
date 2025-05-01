<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import { Import, Loader2 } from '@lucide/svelte';
	import { invalidateAll } from '$app/navigation';

	const { id, name, isExternal } = $props<{ id: string; name: string; isExternal: boolean }>();
	let stack = $derived({ id, name, isExternal });

	let importing = $state(false);
</script>

{#if stack.isExternal}
	<form
		method="POST"
		action="/stacks/import"
		use:enhance={() => {
			importing = true;
			return async () => {
				await invalidateAll();
				importing = false;
			};
		}}
	>
		<input type="hidden" name="stackId" value={stack.id} />
		<Button size="sm" variant="outline" title="Import to Arcane" disabled={importing} type="submit">
			{#if importing}
				<Loader2 class="h-4 w-4 mr-2 animate-spin" />
			{:else}
				<Import class="h-4 w-4 mr-2" />
			{/if}
			Import
		</Button>
	</form>
{/if}

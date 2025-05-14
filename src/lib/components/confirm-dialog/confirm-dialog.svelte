<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { AlertTriangle } from '@lucide/svelte';
	import { confirmDialogStore } from '.';
	import Button from '../ui/button/button.svelte';
</script>

<Dialog.Root bind:open={$confirmDialogStore.open}>
	<Dialog.Content class="max-w-md w-full">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2 text-lg font-semibold">
				<AlertTriangle class="text-destructive shrink-0 size-5" />
				{$confirmDialogStore.title}
			</Dialog.Title>
		</Dialog.Header>

		<div class="mt-2 text-sm text-muted-foreground break-words min-w-0">
			{$confirmDialogStore.message}
		</div>

		<!-- {#if showForceRemoveCheckbox}
			<div class="flex items-center space-x-2 pt-4 pb-2 mt-4 border-t border-border">
				<Checkbox id="force-remove" bind:checked={forceRemoveChecked} />
				<Label for="force-remove" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Force remove running container</Label>
			</div>
		{/if} -->

		<Dialog.Footer class="mt-6">
			<div class="flex justify-end gap-2">
				<Button variant="outline" onclick={() => ($confirmDialogStore.open = false)}>Cancel</Button>
				<Button
					variant={$confirmDialogStore.confirm.destructive ? 'destructive' : 'default'}
					onclick={() => {
						$confirmDialogStore.confirm.action();
						$confirmDialogStore.open = false;
					}}
				>
					{$confirmDialogStore.confirm.label}
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

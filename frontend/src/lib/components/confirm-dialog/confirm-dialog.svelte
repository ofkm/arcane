<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { AlertTriangle } from '@lucide/svelte';
	import { confirmDialogStore } from '.';
	import Button from '../ui/button/button.svelte';
	import { Label } from '$lib/components/ui/label';
	import Checkbox from '../ui/checkbox/checkbox.svelte';

	let checkboxStates = $state<Record<string, boolean>>({});

	$effect(() => {
		if ($confirmDialogStore.open && $confirmDialogStore.checkboxes) {
			const newStates: Record<string, boolean> = {};

			for (const checkbox of $confirmDialogStore.checkboxes) {
				newStates[checkbox.id] = Boolean(checkbox.initialState);
			}

			checkboxStates = newStates;
		}
	});

	function handleConfirm() {
		console.log('Final checkbox states before confirm:', checkboxStates);
		$confirmDialogStore.confirm.action(checkboxStates);
		$confirmDialogStore.open = false;
	}
</script>

<Dialog.Root bind:open={$confirmDialogStore.open}>
	<Dialog.Content class="w-full max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2 text-lg font-semibold">
				<AlertTriangle class="text-destructive size-5 shrink-0" />
				{$confirmDialogStore.title}
			</Dialog.Title>
		</Dialog.Header>

		<div class="text-muted-foreground mt-2 min-w-0 text-sm break-words">
			{$confirmDialogStore.message}
		</div>

		<!-- Checkboxes -->
		{#if $confirmDialogStore.checkboxes && $confirmDialogStore.checkboxes.length > 0}
			<div class="border-border mt-4 flex flex-col gap-3 border-t pt-4 pb-2">
				{#each $confirmDialogStore.checkboxes as checkbox (checkbox.id)}
					<div class="flex items-center space-x-2">
						{#if checkboxStates[checkbox.id] !== undefined}
							<Checkbox id={checkbox.id} bind:checked={checkboxStates[checkbox.id]} aria-labelledby={`${checkbox.id}-label`} />
						{:else}
							<Checkbox id={checkbox.id} checked={false} onchange={(e) => (checkboxStates[checkbox.id] = true)} aria-labelledby={`${checkbox.id}-label`} />
						{/if}
						<Label id={`${checkbox.id}-label`} for={checkbox.id} class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
							{checkbox.label}
						</Label>
					</div>
				{/each}
			</div>
		{/if}

		<Dialog.Footer class="mt-6">
			<div class="flex justify-end gap-2">
				<Button class="arcane-button-cancel" variant="outline" onclick={() => ($confirmDialogStore.open = false)}>Cancel</Button>
				<Button class="arcane-button-create" variant={$confirmDialogStore.confirm.destructive ? 'destructive' : 'default'} onclick={handleConfirm}>
					{$confirmDialogStore.confirm.label}
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

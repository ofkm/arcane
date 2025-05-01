<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { AlertTriangle } from '@lucide/svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	type ButtonVariant = 'destructive' | 'link' | 'default' | 'outline' | 'secondary' | 'ghost';

	let {
		title = $bindable('Confirm Action'),
		description = $bindable('Are you sure you want to proceed?'),
		confirmLabel = $bindable('Confirm'),
		cancelLabel = $bindable('Cancel'),
		variant = $bindable<ButtonVariant>('destructive' as ButtonVariant),
		open = $bindable(false),
		onConfirm = $bindable((_force?: boolean) => {}),
		itemType = $bindable<'container' | 'stack' | string | undefined>(undefined),
		isRunning = $bindable<boolean | undefined>(undefined)
	} = $props();

	let forceRemoveChecked = $state(false);

	const showForceRemoveCheckbox = $derived(itemType === 'container' && isRunning === true);
	const isConfirmDisabled = $derived(showForceRemoveCheckbox && !forceRemoveChecked);
	const finalDescription = $derived(showForceRemoveCheckbox ? `${description} The container is currently running and will be forcefully stopped and removed.` : description);

	$effect(() => {
		if (!open || !showForceRemoveCheckbox) {
			forceRemoveChecked = false;
		}
	});

	function handleConfirm() {
		onConfirm(showForceRemoveCheckbox && forceRemoveChecked);
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-md w-full">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2 text-lg font-semibold">
				<AlertTriangle class="h-5 w-5 text-destructive flex-shrink-0" />
				{title}
			</Dialog.Title>
		</Dialog.Header>

		<div class="mt-2 text-sm text-muted-foreground break-words min-w-0">
			{finalDescription}
		</div>

		{#if showForceRemoveCheckbox}
			<div class="flex items-center space-x-2 pt-4 pb-2 mt-4 border-t border-border">
				<Checkbox id="force-remove" bind:checked={forceRemoveChecked} />
				<Label for="force-remove" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Force remove running container</Label>
			</div>
		{/if}

		<Dialog.Footer class="mt-6">
			<div class="flex justify-end gap-2">
				<Button variant="outline" onclick={() => (open = false)}>
					{cancelLabel}
				</Button>
				<Button {variant} onclick={handleConfirm} disabled={isConfirmDisabled}>
					{confirmLabel}
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
